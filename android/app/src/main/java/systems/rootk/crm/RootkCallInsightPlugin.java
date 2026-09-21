package systems.rootk.crm;

import android.Manifest;
import android.app.role.RoleManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.CallLog;
import android.telephony.TelephonyManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Outbound talk-time lookup, plus one incoming number while it is ringing.
 * Does not sync or upload the full call log.
 */
@CapacitorPlugin(
    name = "RootkCallInsight",
    permissions = {
        @Permission(
            alias = "callLog",
            strings = { Manifest.permission.READ_CALL_LOG }
        ),
        @Permission(
            alias = "phoneState",
            strings = { Manifest.permission.READ_PHONE_STATE }
        )
    }
)
public class RootkCallInsightPlugin extends Plugin {

    private BroadcastReceiver phoneReceiver;
    private boolean watchStarted;

    @PluginMethod
    public void getLatestOutbound(PluginCall call) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            call.reject("CALL_LOG_DENIED", "READ_CALL_LOG not granted");
            return;
        }

        String phone = call.getString("phone", "");
        Long sinceEpochMs = call.getLong("sinceEpochMs");
        if (phone == null || phone.trim().isEmpty() || sinceEpochMs == null) {
            call.reject("INVALID_ARGS", "phone and sinceEpochMs are required");
            return;
        }

        String needle = digitsOnly(phone);
        if (needle.length() < 7) {
            JSObject empty = new JSObject();
            empty.put("found", false);
            call.resolve(empty);
            return;
        }

        long since = Math.max(0L, sinceEpochMs - 2_000L);
        Uri uri = CallLog.Calls.CONTENT_URI;
        String[] projection = new String[] {
            CallLog.Calls.NUMBER,
            CallLog.Calls.TYPE,
            CallLog.Calls.DURATION,
            CallLog.Calls.DATE
        };
        String selection =
            CallLog.Calls.DATE + " >= ? AND " + CallLog.Calls.TYPE + " = ?";
        String[] args = new String[] {
            String.valueOf(since),
            String.valueOf(CallLog.Calls.OUTGOING_TYPE)
        };
        String sort = CallLog.Calls.DATE + " DESC";

        try (Cursor cursor = getContext()
            .getContentResolver()
            .query(uri, projection, selection, args, sort)) {
            if (cursor == null) {
                JSObject empty = new JSObject();
                empty.put("found", false);
                call.resolve(empty);
                return;
            }
            int numberIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER);
            int typeIdx = cursor.getColumnIndex(CallLog.Calls.TYPE);
            int durationIdx = cursor.getColumnIndex(CallLog.Calls.DURATION);
            int dateIdx = cursor.getColumnIndex(CallLog.Calls.DATE);
            while (cursor.moveToNext()) {
                String number = numberIdx >= 0 ? cursor.getString(numberIdx) : "";
                if (!phonesMatch(needle, digitsOnly(number == null ? "" : number))) {
                    continue;
                }
                int type = typeIdx >= 0 ? cursor.getInt(typeIdx) : CallLog.Calls.OUTGOING_TYPE;
                long duration = durationIdx >= 0 ? cursor.getLong(durationIdx) : 0L;
                long date = dateIdx >= 0 ? cursor.getLong(dateIdx) : 0L;
                JSObject row = new JSObject();
                row.put("found", true);
                row.put("number", number == null ? "" : number);
                row.put("type", type);
                row.put("durationSeconds", Math.max(0L, duration));
                row.put("dateEpochMs", date);
                // Android CallLog DURATION is connected/talk time (0 when never answered).
                row.put("answered", duration > 0);
                call.resolve(row);
                return;
            }
        } catch (SecurityException e) {
            call.reject("CALL_LOG_DENIED", e.getMessage());
            return;
        } catch (Exception e) {
            call.reject("CALL_LOG_ERROR", e.getMessage());
            return;
        }

        JSObject empty = new JSObject();
        empty.put("found", false);
        call.resolve(empty);
    }

    @PluginMethod
    public void startIncomingWatch(PluginCall call) {
        IncomingCallBus.setEmitter(this::emitIncoming);
        if (!watchStarted) {
            try {
                registerPhoneReceiver();
                watchStarted = true;
            } catch (RuntimeException ignored) {
                watchStarted = false;
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void stopIncomingWatch(PluginCall call) {
        IncomingCallBus.setEmitter(null);
        unregisterPhoneReceiver();
        watchStarted = false;
        IncomingCallNotifier.cancel(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingIncoming(PluginCall call) {
        IncomingCallBus.Snapshot pending = IncomingCallBus.consumePending();
        JSObject data = new JSObject();
        data.put("number", pending.number);
        data.put("state", pending.state);
        data.put("leadId", pending.leadId);
        call.resolve(data);
    }

    @PluginMethod
    public void incomingCapabilities(PluginCall call) {
        JSObject data = new JSObject();
        data.put("overlay", false);
        data.put("screening", holdsScreeningRole());
        call.resolve(data);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        JSObject data = new JSObject();
        data.put("granted", false);
        call.resolve(data);
    }

    @PluginMethod
    public void requestScreeningRole(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            JSObject data = new JSObject();
            data.put("granted", false);
            call.resolve(data);
            return;
        }
        if (holdsScreeningRole()) {
            JSObject data = new JSObject();
            data.put("granted", true);
            call.resolve(data);
            return;
        }
        RoleManager roles = getContext().getSystemService(RoleManager.class);
        if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            JSObject data = new JSObject();
            data.put("granted", false);
            call.resolve(data);
            return;
        }
        startActivityForResult(
            call,
            roles.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
            "screeningRoleResult"
        );
    }

    @ActivityCallback
    private void screeningRoleResult(PluginCall call, ActivityResult result) {
        JSObject data = new JSObject();
        data.put("granted", holdsScreeningRole());
        call.resolve(data);
    }

    @PluginMethod
    public void showIncomingLeadCard(PluginCall call) {
        Context ctx = getContext();
        String leadId = text(call, "leadId");
        String title = text(call, "title");
        String name = text(call, "name");
        String request = text(call, "request");
        String budget = text(call, "budget");
        String requestLabel = text(call, "requestLabel");
        String budgetLabel = text(call, "budgetLabel");
        String body = requestLabel + ": " + request + " · " + budgetLabel + ": " + budget;
        IncomingCallNotifier.show(
            ctx,
            title.isEmpty() ? name : title + ": " + name,
            body,
            leadId,
            text(call, "phone")
        );
        JSObject data = new JSObject();
        data.put("shown", IncomingCallNotifier.canNotify(ctx));
        call.resolve(data);
    }

    @PluginMethod
    public void hideIncomingLeadCard(PluginCall call) {
        IncomingCallNotifier.cancel(getContext());
        call.resolve();
    }

    private void emitIncoming(String number, String state, String leadId) {
        JSObject data = new JSObject();
        data.put("number", number == null ? "" : number);
        data.put("state", state == null ? "idle" : state);
        data.put("leadId", leadId == null ? "" : leadId);
        notifyListeners("incomingCall", data);
        if ("open".equals(state) && leadId != null && !leadId.isEmpty()) {
            JSObject open = new JSObject();
            open.put("leadId", leadId);
            notifyListeners("openIncomingLead", open);
        }
    }

    private void registerPhoneReceiver() {
        if (phoneReceiver != null) return;
        Context ctx = getContext();
        if (ctx == null) return;
        phoneReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) return;
                String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
                if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
                    IncomingCallBus.publishRinging(
                        context,
                        intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    );
                } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
                    IncomingCallBus.publishOffhook();
                } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                    IncomingCallBus.publishIdle(context);
                }
            }
        };
        IntentFilter filter = new IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED);
        Context app = ctx.getApplicationContext();
        if (Build.VERSION.SDK_INT >= 33) {
            app.registerReceiver(phoneReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            app.registerReceiver(phoneReceiver, filter);
        }
    }

    private void unregisterPhoneReceiver() {
        if (phoneReceiver == null) return;
        Context ctx = getContext();
        if (ctx != null) {
            try {
                ctx.getApplicationContext().unregisterReceiver(phoneReceiver);
            } catch (IllegalArgumentException ignored) {
                /* already unregistered */
            }
        }
        phoneReceiver = null;
    }

    private boolean holdsScreeningRole() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
        Context ctx = getContext();
        if (ctx == null) return false;
        RoleManager roles = ctx.getSystemService(RoleManager.class);
        return roles != null && roles.isRoleHeld(RoleManager.ROLE_CALL_SCREENING);
    }

    private static String text(PluginCall call, String key) {
        String value = call.getString(key, "");
        return value == null ? "" : value;
    }

    private static String digitsOnly(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        StringBuilder sb = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c >= '0' && c <= '9') sb.append(c);
        }
        return sb.toString();
    }

    /** Match on last 9 digits (Egyptian mobiles with/without country code). */
    private static boolean phonesMatch(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) return false;
        if (a.equals(b)) return true;
        int len = Math.min(9, Math.min(a.length(), b.length()));
        if (len < 7) return false;
        return a.substring(a.length() - len).equals(b.substring(b.length() - len));
    }
}
