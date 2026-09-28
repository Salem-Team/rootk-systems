package systems.rootk.crm;

import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallScreeningService;

/**
 * Observes the incoming number while the phone is ringing.
 * Never blocks, silences, or rejects the call.
 */
public class RootkCallScreeningService extends CallScreeningService {

    @Override
    public void onScreenCall(Call.Details details) {
        if (details == null) return;
        // Read the number first. Some devices clear the handle after respondToCall.
        String number = numberFrom(details);
        boolean outgoing = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && details.getCallDirection() == Call.Details.DIRECTION_OUTGOING;
        respondToCall(details, allowCall());
        // DIRECTION_UNKNOWN is common while the call is still ringing. Only skip real outbound.
        if (outgoing) return;
        IncomingCallBus.publishRinging(this, number);
    }

    private static String numberFrom(Call.Details details) {
        String direct = fromUri(details.getHandle());
        if (digitCount(direct) >= 7) return direct;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && details.getGatewayInfo() != null) {
            String gateway = fromUri(details.getGatewayInfo().getOriginalAddress());
            if (digitCount(gateway) >= 7) return gateway;
        }
        return direct;
    }

    private static String fromUri(Uri handle) {
        if (handle == null) return "";
        String raw = handle.getSchemeSpecificPart();
        if (raw == null || raw.isEmpty()) raw = handle.toString();
        int at = raw.indexOf('@');
        if (at > 0) raw = raw.substring(0, at);
        return raw == null ? "" : raw.trim();
    }

    private static int digitCount(String raw) {
        if (raw == null || raw.isEmpty()) return 0;
        int count = 0;
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c >= '0' && c <= '9') count++;
        }
        return count;
    }

    private static CallResponse allowCall() {
        CallResponse.Builder builder = new CallResponse.Builder();
        builder.setDisallowCall(false);
        builder.setRejectCall(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            builder.setSilenceCall(false);
            builder.setSkipCallLog(false);
            builder.setSkipNotification(false);
        }
        return builder.build();
    }
}
