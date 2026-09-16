package systems.rootk.crm;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RootkCallInsightPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
