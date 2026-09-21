package systems.rootk.crm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Heads-up notice while a call is ringing.
 * This is the supported surface on current Android: a system overlay cannot
 * cover the incoming-call screen, and Play rejects that permission for a CRM.
 */
final class IncomingCallNotifier {

    static final String CHANNEL_ID = "crm_incoming_calls";
    static final int NOTIFICATION_ID = 420_001;
    static final String EXTRA_NUMBER = "rootk_incoming_number";
    static final String EXTRA_LEAD = "rootk_incoming_lead";

    private static final long TIMEOUT_MS = 45_000L;

    private IncomingCallNotifier() {}

    static boolean canNotify(Context context) {
        if (context == null) return false;
        return NotificationManagerCompat.from(context.getApplicationContext()).areNotificationsEnabled();
    }

    static void showNumber(Context context, String number) {
        if (context == null || number == null || number.trim().isEmpty()) return;
        show(context, "ROOTK", number.trim(), "", number.trim());
    }

    static void show(
        Context context,
        String title,
        String body,
        String leadId,
        String number
    ) {
        if (context == null) return;
        Context app = context.getApplicationContext();
        if (!NotificationManagerCompat.from(app).areNotificationsEnabled()) return;
        ensureChannel(app);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(app, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(title == null || title.isEmpty() ? "ROOTK" : title)
            .setContentText(body == null ? "" : body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body == null ? "" : body))
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setTimeoutAfter(TIMEOUT_MS)
            .setContentIntent(openApp(app, number, leadId));
        try {
            NotificationManagerCompat.from(app).notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            /* POST_NOTIFICATIONS not granted */
        }
    }

    static void cancel(Context context) {
        if (context == null) return;
        NotificationManagerCompat.from(context.getApplicationContext()).cancel(NOTIFICATION_ID);
    }

    private static PendingIntent openApp(Context context, String number, String leadId) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) {
            launch = new Intent(context, MainActivity.class);
        }
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        launch.putExtra(EXTRA_NUMBER, number == null ? "" : number);
        launch.putExtra(EXTRA_LEAD, leadId == null ? "" : leadId);
        return PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "ROOTK calls",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Who is calling, and their request and budget");
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(channel);
    }
}
