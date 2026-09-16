package systems.rootk.crm;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CallLog;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/**
 * Single-row lookup for the just-dialed outbound number (talk duration + outcome).
 * Does not sync or upload the full call log.
 */
@CapacitorPlugin(
    name = "RootkCallInsight",
    permissions = {
        @Permission(
            alias = "callLog",
            strings = { Manifest.permission.READ_CALL_LOG }
        )
    }
)
public class RootkCallInsightPlugin extends Plugin {

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
