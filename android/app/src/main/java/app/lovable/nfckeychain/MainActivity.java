package app.lovable.nfckeychain;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmartNfcPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
