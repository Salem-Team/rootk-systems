package systems.rootk.crm;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Top card over the incoming-call screen on devices that still allow it.
 * Answer / decline stay reachable because the card does not cover the bottom.
 */
final class IncomingLeadOverlay {

    interface Listener {
        void onOpen(String leadId);
        void onDismiss();
    }

    private static final Handler HANDLER = new Handler(Looper.getMainLooper());

    private static Listener listener;
    private static View cardView;
    private static WindowManager windowManager;
    private static Context appContext;

    private IncomingLeadOverlay() {}

    static void setListener(Listener next) {
        listener = next;
    }

    static boolean canDraw(Context context) {
        return context != null && Settings.canDrawOverlays(context);
    }

    static boolean show(Context context, IncomingLeadIndex.Card model) {
        if (context == null || model == null || !canDraw(context)) return false;
        Context app = context.getApplicationContext();
        if (Looper.myLooper() == Looper.getMainLooper()) {
            showOnMain(app, model);
            return cardView != null;
        }
        HANDLER.post(() -> showOnMain(app, model));
        return true;
    }

    static void hide(Context context) {
        if (context != null && appContext == null) {
            appContext = context.getApplicationContext();
        }
        HANDLER.post(IncomingLeadOverlay::detachView);
    }

    private static void showOnMain(Context context, IncomingLeadIndex.Card model) {
        detachView();
        appContext = context.getApplicationContext();
        windowManager = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) return;

        LinearLayout card = buildCard(appContext, model);
        int screen = appContext.getResources().getDisplayMetrics().widthPixels;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            Math.max(screen - dp(appContext, 24), dp(appContext, 280)),
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | legacyShowWhenLocked(),
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = dp(appContext, 36);
        try {
            windowManager.addView(card, params);
            cardView = card;
        } catch (Exception ignored) {
            cardView = null;
        }
    }

    private static void detachView() {
        if (cardView == null) return;
        try {
            WindowManager wm = windowManager;
            if (wm == null && appContext != null) {
                wm = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
            }
            if (wm != null) wm.removeView(cardView);
        } catch (Exception ignored) {
            /* already detached */
        }
        cardView = null;
    }

    private static LinearLayout buildCard(Context context, IncomingLeadIndex.Card model) {
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setLayoutDirection(model.rtl ? View.LAYOUT_DIRECTION_RTL : View.LAYOUT_DIRECTION_LTR);
        int pad = dp(context, 16);
        card.setPadding(pad, pad, pad, dp(context, 12));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.parseColor("#0E1A33"));
        bg.setCornerRadius(dp(context, 18));
        card.setBackground(bg);
        card.setElevation(dp(context, 10));
        card.setClickable(true);

        addText(card, model.title, 12, "#9BB6E0", false);
        addText(card, model.name, 20, "#FFFFFF", true);
        if (!model.phone.isEmpty()) addText(card, model.phone, 13, "#C5D0E6", false);
        if (!model.company.isEmpty()) addText(card, model.company, 13, "#C5D0E6", false);
        addGap(card, 8);
        addText(card, model.requestLabel, 12, "#9BB6E0", false);
        addText(card, model.request, 16, "#FFFFFF", true);
        addGap(card, 6);
        addText(card, model.budgetLabel, 12, "#E7C27A", false);
        addText(card, model.budget, 18, "#FFE3A3", true);

        LinearLayout actions = new LinearLayout(context);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.END);
        LinearLayout.LayoutParams actionLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        actionLp.topMargin = dp(context, 12);
        actions.setLayoutParams(actionLp);
        if (!model.leadId.isEmpty()) {
            actions.addView(actionButton(context, model.openLabel, true, () -> {
                detachView();
                Listener current = listener;
                if (current != null) current.onOpen(model.leadId);
            }));
        }
        actions.addView(actionButton(context, model.dismissLabel, false, () -> {
            detachView();
            Listener current = listener;
            if (current != null) current.onDismiss();
        }));
        card.addView(actions);
        return card;
    }

    private static void addText(LinearLayout parent, String value, int sp, String color, boolean bold) {
        TextView view = new TextView(parent.getContext());
        view.setText(value == null ? "" : value);
        view.setTextColor(Color.parseColor(color));
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTypeface(bold ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
        view.setTextAlignment(View.TEXT_ALIGNMENT_VIEW_START);
        view.setMaxLines(sp >= 16 ? 4 : 2);
        view.setEllipsize(TextUtils.TruncateAt.END);
        parent.addView(view);
    }

    private static void addGap(LinearLayout parent, int gapDp) {
        View gap = new View(parent.getContext());
        gap.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(parent.getContext(), gapDp)
        ));
        parent.addView(gap);
    }

    private static TextView actionButton(Context context, String label, boolean primary, Runnable onClick) {
        TextView button = new TextView(context);
        button.setText(label == null ? "" : label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setGravity(Gravity.CENTER);
        int h = dp(context, 14);
        int v = dp(context, 8);
        button.setPadding(h, v, h, v);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(context, 12));
        bg.setColor(primary ? Color.parseColor("#1A5BB8") : Color.parseColor("#243656"));
        button.setBackground(bg);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        lp.setMarginStart(dp(context, 8));
        button.setLayoutParams(lp);
        button.setOnClickListener((view) -> onClick.run());
        return button;
    }

    @SuppressWarnings("deprecation")
    private static int legacyShowWhenLocked() {
        return WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED;
    }

    @SuppressWarnings("deprecation")
    private static int overlayType() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        }
        return WindowManager.LayoutParams.TYPE_PHONE;
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }
}
