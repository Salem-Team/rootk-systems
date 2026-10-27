package systems.rootk.crm;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens a customer chat inside a specific WhatsApp install (personal vs Business).
 * Uses Intent.setPackage so Android does not default to the company Business app.
 */
@CapacitorPlugin(name = "RootkWhatsapp")
public class RootkWhatsappPlugin extends Plugin {
    private static final String PKG_PERSONAL = "com.whatsapp";
    private static final String PKG_BUSINESS = "com.whatsapp.w4b";

    @PluginMethod
    public void openChat(PluginCall call) {
        String phone = digitsOnly(call.getString("phone", ""));
        if (phone.isEmpty()) {
            call.reject("invalid_phone");
            return;
        }

        String app = call.getString("app", "whatsapp");
        boolean preferBusiness = "business".equalsIgnoreCase(app);
        String text = call.getString("text", "");
        if (text == null) text = "";

        String preferred = preferBusiness ? PKG_BUSINESS : PKG_PERSONAL;
        // Never fall back to the other package or a system chooser — that is how
        // sales chats accidentally open on the company WhatsApp Business line.
        String used = tryOpen(phone, text, preferred);
        if (used == null) {
            call.reject("not_installed");
            return;
        }

        JSObject result = new JSObject();
        result.put("opened", true);
        result.put("packageName", used);
        result.put("phone", phone);
        call.resolve(result);
    }

    @PluginMethod
    public void resolveInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put("personal", isInstalled(PKG_PERSONAL));
        result.put("business", isInstalled(PKG_BUSINESS));
        call.resolve(result);
    }

    private String tryOpen(String phone, String text, String packageName) {
        if (packageName != null && !isInstalled(packageName)) {
            return null;
        }
        Uri uri = buildSendUri(phone, text);
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (packageName != null) {
            intent.setPackage(packageName);
        }
        try {
            getContext().startActivity(intent);
            return packageName == null ? "chooser" : packageName;
        } catch (ActivityNotFoundException missing) {
            return null;
        } catch (Exception error) {
            return null;
        }
    }

    private static Uri buildSendUri(String phone, String text) {
        Uri.Builder builder =
            Uri.parse("https://api.whatsapp.com/send")
                .buildUpon()
                .appendQueryParameter("phone", phone);
        if (text != null && !text.trim().isEmpty()) {
            builder.appendQueryParameter("text", text.trim());
        }
        return builder.build();
    }

    private boolean isInstalled(String packageName) {
        try {
            PackageManager pm = getContext().getPackageManager();
            pm.getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException missing) {
            return false;
        } catch (Exception error) {
            return false;
        }
    }

    private static String digitsOnly(String raw) {
        if (raw == null) return "";
        StringBuilder out = new StringBuilder(raw.length());
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (c >= '0' && c <= '9') out.append(c);
        }
        return out.toString();
    }
}
