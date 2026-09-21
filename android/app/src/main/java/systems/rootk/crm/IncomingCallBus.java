package systems.rootk.crm;

/**
 * Latest incoming-call snapshot. Native listeners (phone state + call screening)
 * publish here; the Capacitor plugin delivers one event to JS.
 */
final class IncomingCallBus {

    interface Emitter {
        void onIncoming(String number, String state);
    }

    static final class Snapshot {
        final String number;
        final String state;

        Snapshot(String number, String state) {
            this.number = number == null ? "" : number;
            this.state = state == null ? "idle" : state;
        }

        static Snapshot empty() {
            return new Snapshot("", "idle");
        }

        boolean isEmpty() {
            return number.isEmpty() && "idle".equals(state);
        }
    }

    private static final long DEDUPE_MS = 4_000L;
    private static final long FRESH_MS = 60_000L;

    private static Emitter emitter;
    private static boolean active;
    private static String pendingNumber = "";
    private static String pendingState = "idle";
    private static long pendingAt;
    private static boolean pendingDelivered = true;
    private static String lastTail = "";
    private static long lastRingAt;

    private IncomingCallBus() {}

    static synchronized void setEmitter(Emitter next) {
        emitter = next;
    }

    static synchronized void publishRinging(String number) {
        String raw = number == null ? "" : number.trim();
        String tail = tailDigits(raw);
        if (tail.length() < 7) return;
        long now = System.currentTimeMillis();
        if (tail.equals(lastTail) && now - lastRingAt < DEDUPE_MS && active) return;
        lastTail = tail;
        lastRingAt = now;
        active = true;
        IncomingLeadOverlay.noteCallState("ringing");
        deliver(raw, "ringing");
    }

    static synchronized void publishOffhook() {
        if (!active) return;
        IncomingLeadOverlay.noteCallState("offhook");
        deliver(pendingNumber, "offhook");
    }

    static synchronized void publishIdle() {
        if (!active) return;
        active = false;
        IncomingLeadOverlay.noteCallState("idle");
        deliver(pendingNumber, "idle");
    }

    static synchronized Snapshot consumePending() {
        if (pendingDelivered || pendingAt == 0) return Snapshot.empty();
        if (System.currentTimeMillis() - pendingAt > FRESH_MS) return Snapshot.empty();
        pendingDelivered = true;
        return new Snapshot(pendingNumber, pendingState);
    }

    private static void deliver(String number, String state) {
        pendingNumber = number == null ? "" : number;
        pendingState = state;
        pendingAt = System.currentTimeMillis();
        pendingDelivered = false;
        Emitter current = emitter;
        if (current == null) return;
        pendingDelivered = true;
        current.onIncoming(pendingNumber, pendingState);
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
