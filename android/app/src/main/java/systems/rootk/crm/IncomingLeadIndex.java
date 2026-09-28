package systems.rootk.crm;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.List;
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
        if (!request.isEmpty()) {
            if (body.length() > 0) body.append('\n');
            if (!requestLabel.isEmpty()) body.append(requestLabel).append(": ");
            body.append(request);
        }
        if (!budget.isEmpty()) {
            if (body.length() > 0) body.append('\n');
            if (!budgetLabel.isEmpty()) body.append(budgetLabel).append(": ");
            body.append(budget);
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
        String json = context.getApplicationContext()
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY, "");
        return matchStored(json, rawNumber);
    }

    /** Longest key first. Last-9 lines up 010… with +20 / 0020. */
    static List<String> phoneKeys(String raw) {
        String digits = digitsOnly(raw);
        ArrayList<String> keys = new ArrayList<>();
        if (digits.length() < 7) return keys;
        if (digits.length() >= 10) addKey(keys, digits.substring(digits.length() - 10));
        if (digits.length() >= 9) addKey(keys, digits.substring(digits.length() - 9));
        if (digits.length() < 9) addKey(keys, digits);
        return keys;
    }

    static Card matchStored(String json, String rawNumber) {
        if (json == null || json.isEmpty() || phoneKeys(rawNumber).isEmpty()) return null;
        try {
            JSONObject root = new JSONObject(json);
            JSONObject byTail = root.optJSONObject("byTail");
            if (byTail == null) return null;
            JSONObject row = null;
            for (String key : phoneKeys(rawNumber)) {
                row = byTail.optJSONObject(key);
                if (row != null) break;
            }
            if (row == null) return null;
            return cardFrom(root, row, rawNumber);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static Card cardFrom(JSONObject root, JSONObject row, String rawNumber) {
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
    }

    private static void addKey(List<String> keys, String key) {
        if (key.length() >= 7 && !keys.contains(key)) keys.add(key);
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
