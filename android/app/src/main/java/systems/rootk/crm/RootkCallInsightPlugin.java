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
import android.provider.Settings;
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

    @Override
    public void load() {
        IncomingLeadOverlay.setListener(new IncomingLeadOverlay.Listener() {
            @Override
            public void onOpen(String leadId) {
                JSObject data = new JSObject();
                data.put("leadId", leadId == null ? "" : leadId);
                notifyListeners("openIncomingLead", data);
                bringAppToFront();
            }

            @Override
            public void onDismiss() {
                notifyListeners("incomingCardDismissed", new JSObject());
            }
        });
    }

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
            registerPhoneReceiver();
            watchStarted = true;
        }
        call.resolve();
    }

    @PluginMethod
    public void stopIncomingWatch(PluginCall call) {
        IncomingCallBus.setEmitter(null);
        unregisterPhoneReceiver();
        watchStarted = false;
        Context ctx = getContext();
        if (ctx != null) IncomingLeadOverlay.hide(ctx);
        call.resolve();
    }

    @PluginMethod
    public void consumePendingIncoming(PluginCall call) {
        IncomingCallBus.Snapshot pending = IncomingCallBus.consumePending();
        JSObject data = new JSObject();
        data.put("number", pending.number);
        data.put("state", pending.state);
        call.resolve(data);
    }

    @PluginMethod
    public void incomingCapabilities(PluginCall call) {
        Context ctx = getContext();
        JSObject data = new JSObject();
        data.put("overlay", ctx != null && IncomingLeadOverlay.canDraw(ctx));
        data.put("screening", holdsScreeningRole());
        call.resolve(data);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context ctx = getContext();
        if (ctx != null && IncomingLeadOverlay.canDraw(ctx)) {
            JSObject data = new JSObject();
            data.put("granted", true);
            call.resolve(data);
            return;
        }
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + (ctx == null ? "" : ctx.getPackageName()))
        );
        startActivityForResult(call, intent, "overlayPermissionResult");
    }

    @ActivityCallback
    private void overlayPermissionResult(PluginCall call, ActivityResult result) {
        Context ctx = getContext();
        JSObject data = new JSObject();
        data.put("granted", ctx != null && Settings.canDrawOverlays(ctx));
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
        if (ctx == null || !IncomingLeadOverlay.canDraw(ctx)) {
            JSObject data = new JSObject();
            data.put("shown", false);
            call.resolve(data);
            return;
        }
        IncomingLeadOverlay.CardModel model = new IncomingLeadOverlay.CardModel();
        model.leadId = text(call, "leadId");
        model.title = text(call, "title");
        model.name = text(call, "name");
        model.phone = text(call, "phone");
        model.company = text(call, "company");
        model.requestLabel = text(call, "requestLabel");
        model.request = text(call, "request");
        model.budgetLabel = text(call, "budgetLabel");
        model.budget = text(call, "budget");
        model.openLabel = text(call, "openLabel");
        model.dismissLabel = text(call, "dismissLabel");
        model.rtl = call.getBoolean("rtl", true);
        boolean shown = IncomingLeadOverlay.show(ctx, model);
        JSObject data = new JSObject();
        data.put("shown", shown);
        call.resolve(data);
    }

    @PluginMethod
    public void hideIncomingLeadCard(PluginCall call) {
        Context ctx = getContext();
        if (ctx != null) IncomingLeadOverlay.hide(ctx);
        call.resolve();
    }

    private void emitIncoming(String number, String state) {
        JSObject data = new JSObject();
        data.put("number", number == null ? "" : number);
        data.put("state", state == null ? "idle" : state);
        notifyListeners("incomingCall", data);
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
                        intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
                    );
                } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
                    IncomingCallBus.publishOffhook();
                } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
                    IncomingCallBus.publishIdle();
                }
            }
        };
        IntentFilter filter = new IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED);
        Context app = ctx.getApplicationContext();
        if (Build.VERSION.SDK_INT >= 33) {
            app.registerReceiver(phoneReceiver, filter, Context.RECEIVER_EXPORTED);
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

    private void bringAppToFront() {
        Context ctx = getContext();
        if (ctx == null) return;
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch == null) return;
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        ctx.startActivity(launch);
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
