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
        respondToCall(details, allowCall());
        if (details == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            && details.getCallDirection() != Call.Details.DIRECTION_INCOMING) {
            return;
        }
        IncomingCallBus.publishRinging(this, numberFrom(details));
    }

    private static String numberFrom(Call.Details details) {
        Uri handle = details.getHandle();
        if (handle == null) return "";
        String raw = handle.getSchemeSpecificPart();
        if (raw == null || raw.isEmpty()) raw = handle.toString();
        int at = raw.indexOf('@');
        if (at > 0) raw = raw.substring(0, at);
        return raw == null ? "" : raw.trim();
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
