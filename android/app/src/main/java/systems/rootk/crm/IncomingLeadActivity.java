package systems.rootk.crm;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.lang.ref.WeakReference;

/**
 * Compact card above the ringing screen. Touches outside the card pass through
 * so the system answer and decline buttons stay usable.
 */
public class IncomingLeadActivity extends AppCompatActivity {

    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_NAME = "name";
    private static final String EXTRA_PHONE = "phone";
    private static final String EXTRA_COMPANY = "company";
    private static final String EXTRA_REQUEST_LABEL = "requestLabel";
    private static final String EXTRA_REQUEST = "request";
    private static final String EXTRA_BUDGET_LABEL = "budgetLabel";
    private static final String EXTRA_BUDGET = "budget";
    private static final String EXTRA_OPEN = "open";
    private static final String EXTRA_HIDE = "hide";
    private static final String EXTRA_RTL = "rtl";

    private static WeakReference<IncomingLeadActivity> open;

    static Intent intent(Context context, IncomingLeadIndex.Card card) {
        Intent launch = new Intent(context, IncomingLeadActivity.class);
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_NO_ANIMATION
        );
        fill(launch, card);
        return launch;
    }

    static boolean present(Context context, IncomingLeadIndex.Card card) {
        if (context == null || card == null || card.leadId == null || card.leadId.isEmpty()) {
            return false;
        }
        try {
            context.startActivity(intent(context, card));
            return true;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    static void close() {
        IncomingLeadActivity current = open == null ? null : open.get();
        if (current != null) current.finish();
    }

    private static void fill(Intent launch, IncomingLeadIndex.Card card) {
        launch.putExtra(IncomingCallNotifier.EXTRA_LEAD, card.leadId);
        launch.putExtra(IncomingCallNotifier.EXTRA_NUMBER, card.phone);
        launch.putExtra(EXTRA_TITLE, card.title);
        launch.putExtra(EXTRA_NAME, card.name);
        launch.putExtra(EXTRA_PHONE, card.phone);
        launch.putExtra(EXTRA_COMPANY, card.company);
        launch.putExtra(EXTRA_REQUEST_LABEL, card.requestLabel);
        launch.putExtra(EXTRA_REQUEST, card.request);
        launch.putExtra(EXTRA_BUDGET_LABEL, card.budgetLabel);
        launch.putExtra(EXTRA_BUDGET, card.budget);
        launch.putExtra(EXTRA_OPEN, card.openLabel);
        launch.putExtra(EXTRA_HIDE, card.dismissLabel);
        launch.putExtra(EXTRA_RTL, card.rtl);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        open = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        Window window = getWindow();
        window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        );
        bind(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        bind(intent);
    }

    @Override
    protected void onDestroy() {
        if (open != null && open.get() == this) open = null;
        super.onDestroy();
    }

    private void bind(Intent intent) {
        if (intent == null) {
            finish();
            return;
        }
        IncomingLeadIndex.Card card = new IncomingLeadIndex.Card();
        card.leadId = text(intent, IncomingCallNotifier.EXTRA_LEAD);
        card.phone = text(intent, EXTRA_PHONE);
        card.title = text(intent, EXTRA_TITLE);
        card.name = text(intent, EXTRA_NAME);
        card.company = text(intent, EXTRA_COMPANY);
        card.requestLabel = text(intent, EXTRA_REQUEST_LABEL);
        card.request = text(intent, EXTRA_REQUEST);
        card.budgetLabel = text(intent, EXTRA_BUDGET_LABEL);
        card.budget = text(intent, EXTRA_BUDGET);
        card.openLabel = text(intent, EXTRA_OPEN);
        card.dismissLabel = text(intent, EXTRA_HIDE);
        card.rtl = intent.getBooleanExtra(EXTRA_RTL, true);
        if (card.name.isEmpty() && card.leadId.isEmpty()) {
            finish();
            return;
        }
        setContentView(buildCard(card));
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.width = WindowManager.LayoutParams.MATCH_PARENT;
        lp.height = WindowManager.LayoutParams.WRAP_CONTENT;
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(28);
        lp.dimAmount = 0f;
        getWindow().setAttributes(lp);
    }

    private LinearLayout buildCard(IncomingLeadIndex.Card model) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setLayoutDirection(model.rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, dp(12));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#0E1A33"));
        bg.setCornerRadius(dp(18));
        card.setBackground(bg);

        addText(card, model.title, 12, "#9BB6E0", false);
        addText(card, model.name, 22, "#FFFFFF", true);
        if (!model.phone.isEmpty()) addText(card, model.phone, 13, "#C5D0E6", false);
        if (!model.company.isEmpty()) addText(card, model.company, 13, "#C5D0E6", false);
        addText(card, model.requestLabel, 12, "#9BB6E0", false);
        addText(card, model.request, 15, "#FFFFFF", true);
        addText(card, model.budgetLabel, 12, "#E7C27A", false);
        addText(card, model.budget, 20, "#FFE3A3", true);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.END);
        LinearLayout.LayoutParams actionLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        actionLp.topMargin = dp(12);
        actions.setLayoutParams(actionLp);
        if (!model.leadId.isEmpty()) {
            actions.addView(button(model.openLabel, true, () -> openLead(model)));
        }
        actions.addView(button(model.dismissLabel, false, this::finish));
        card.addView(actions);
        return card;
    }

    private void openLead(IncomingLeadIndex.Card model) {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent(this, MainActivity.class);
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        launch.putExtra(IncomingCallNotifier.EXTRA_LEAD, model.leadId);
        launch.putExtra(IncomingCallNotifier.EXTRA_NUMBER, model.phone);
        startActivity(launch);
        finish();
    }

    private void addText(LinearLayout parent, String value, int sp, String color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value == null ? "" : value);
        view.setTextColor(Color.parseColor(color));
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTypeface(bold ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        view.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        view.setMaxLines(sp >= 16 ? 3 : 2);
        view.setEllipsize(TextUtils.TruncateAt.END);
        parent.addView(view);
    }

    private TextView button(String label, boolean primary, Runnable onClick) {
        TextView button = new TextView(this);
        button.setText(label == null || label.isEmpty() ? (primary ? "Open" : "Hide") : label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setGravity(Gravity.CENTER);
        int h = dp(14);
        int v = dp(8);
        button.setPadding(h, v, h, v);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(12));
        bg.setColor(primary ? Color.parseColor("#1A5BB8") : Color.parseColor("#243656"));
        button.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.setMarginStart(dp(8));
        button.setLayoutParams(lp);
        button.setOnClickListener((view) -> onClick.run());
        return button;
    }

    private static String text(Intent intent, String key) {
        String value = intent.getStringExtra(key);
        return value == null ? "" : value;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
