package systems.rootk.crm;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RootkCallInsightPlugin.class);
        super.onCreate(savedInstanceState);
        IncomingCallBus.noteLaunch(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        IncomingCallBus.noteLaunch(intent);
    }
}
