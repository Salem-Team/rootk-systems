package systems.rootk.crm;

import android.content.Context;
import android.content.Intent;

/**
 * Latest incoming-call snapshot. Native listeners (phone state + call screening)
 * publish here; the Capacitor plugin delivers one event to JS.
 */
final class IncomingCallBus {

    interface Emitter {
        void onIncoming(String number, String state, String leadId);
    }

    static final class Snapshot {
        final String number;
        final String state;
        final String leadId;

        Snapshot(String number, String state, String leadId) {
            this.number = number == null ? "" : number;
            this.state = state == null ? "idle" : state;
            this.leadId = leadId == null ? "" : leadId;
        }

        static Snapshot empty() {
            return new Snapshot("", "idle", "");
        }

        boolean isEmpty() {
            return number.isEmpty() && leadId.isEmpty() && "idle".equals(state);
        }
    }

    private static final long DEDUPE_MS = 4_000L;
    private static final long FRESH_MS = 60_000L;

    private static Emitter emitter;
    private static boolean active;
    private static String pendingNumber = "";
    private static String pendingState = "idle";
    private static String pendingLeadId = "";
    private static long pendingAt;
    private static boolean pendingDelivered = true;
    private static String lastTail = "";
    private static long lastRingAt;

    private IncomingCallBus() {}

    static synchronized void setEmitter(Emitter next) {
        emitter = next;
    }

    static synchronized void publishRinging(Context context, String number) {
        String raw = number == null ? "" : number.trim();
        String tail = tailDigits(raw);
        if (tail.length() < 7) return;
        long now = System.currentTimeMillis();
        if (tail.equals(lastTail) && now - lastRingAt < DEDUPE_MS && active) return;
        lastTail = tail;
        lastRingAt = now;
        active = true;
        deliver(raw, "ringing", "");
        IncomingCallNotifier.showNumber(context, raw);
    }

    static synchronized void publishOffhook() {
        if (!active) return;
        deliver(pendingNumber, "offhook", pendingLeadId);
    }

    static synchronized void publishIdle(Context context) {
        if (!active && pendingLeadId.isEmpty()) {
            IncomingCallNotifier.cancel(context);
            return;
        }
        active = false;
        deliver(pendingNumber, "idle", pendingLeadId);
        IncomingCallNotifier.cancel(context);
    }

    /** Notification tap, including a cold start before JS is listening. */
    static synchronized void noteLaunch(Intent intent) {
        if (intent == null) return;
        String leadId = intent.getStringExtra(IncomingCallNotifier.EXTRA_LEAD);
        String number = intent.getStringExtra(IncomingCallNotifier.EXTRA_NUMBER);
        if (leadId != null && !leadId.trim().isEmpty()) {
            deliver(number == null ? "" : number, "open", leadId.trim());
            return;
        }
        if (number != null && !number.trim().isEmpty()) {
            deliver(number.trim(), "ringing", "");
        }
    }

    static synchronized Snapshot consumePending() {
        if (pendingDelivered || pendingAt == 0) return Snapshot.empty();
        if (System.currentTimeMillis() - pendingAt > FRESH_MS) return Snapshot.empty();
        pendingDelivered = true;
        return new Snapshot(pendingNumber, pendingState, pendingLeadId);
    }

    private static void deliver(String number, String state, String leadId) {
        pendingNumber = number == null ? "" : number;
        pendingState = state;
        pendingLeadId = leadId == null ? "" : leadId;
        pendingAt = System.currentTimeMillis();
        pendingDelivered = false;
        Emitter current = emitter;
        if (current == null) return;
        pendingDelivered = true;
        current.onIncoming(pendingNumber, pendingState, pendingLeadId);
    }

    private static String tailDigits(String raw) {
        String digits = digitsOnly(raw);
        if (digits.length() <= 9) return digits;
        return digits.substring(digits.length() - 9);
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
}
