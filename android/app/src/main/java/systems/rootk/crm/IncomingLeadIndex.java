package systems.rootk.crm;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;

/** Phone → lead snapshot so a ringing call can show request and budget without the WebView. */
final class IncomingLeadIndex {

    static final class Card {
        String leadId = "";
        String title = "";
        String name = "";
        String phone = "";
        String company = "";
        String requestLabel = "";
        String request = "";
        String budgetLabel = "";
        String budget = "";
        String openLabel = "";
        String dismissLabel = "";
        boolean rtl = true;

        String notificationBody() {
            StringBuilder body = new StringBuilder();
            if (!name.isEmpty()) body.append(name);
            if (!requestLabel.isEmpty() || !request.isEmpty()) {
                if (body.length() > 0) body.append('\n');
                body.append(requestLabel).append(": ").append(request);
            }
            if (!budgetLabel.isEmpty() || !budget.isEmpty()) {
                if (body.length() > 0) body.append('\n');
                body.append(budgetLabel).append(": ").append(budget);
            }
            return body.toString();
        }
    }

    private static final String PREFS = "rootk_incoming_leads";
    private static final String KEY = "index";

    private IncomingLeadIndex() {}

    static void save(Context context, String json) {
        if (context == null) return;
        SharedPreferences prefs = context.getApplicationContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY, json == null ? "" : json).apply();
    }

    static Card match(Context context, String rawNumber) {
        if (context == null) return null;
        String tail = tailDigits(rawNumber);
        if (tail.length() < 7) return null;
        String json = context.getApplicationContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY, "");
        if (json == null || json.isEmpty()) return null;
        try {
            JSONObject root = new JSONObject(json);
            JSONObject byTail = root.optJSONObject("byTail");
            if (byTail == null) return null;
            JSONObject row = byTail.optJSONObject(tail);
            if (row == null) return null;
            JSONObject labels = root.optJSONObject("labels");
            Card card = new Card();
            card.leadId = row.optString("id", "");
            card.name = row.optString("name", "");
            card.phone = row.optString("phone", rawNumber == null ? "" : rawNumber);
            card.company = row.optString("company", "");
            card.request = row.optString("request", "");
            card.budget = row.optString("budget", "");
            card.rtl = root.optBoolean("rtl", true);
            if (labels != null) {
                card.title = labels.optString("title", "");
                card.requestLabel = labels.optString("request", "");
                card.budgetLabel = labels.optString("budget", "");
                card.openLabel = labels.optString("open", "");
                card.dismissLabel = labels.optString("hide", "");
                String empty = labels.optString("empty", "");
                if (card.request.isEmpty()) card.request = empty;
                if (card.budget.isEmpty()) card.budget = empty;
            }
            return card;
        } catch (Exception ignored) {
            return null;
        }
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
