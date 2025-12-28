package com.thepepplanner.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TPP-MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate()
        Log.d(TAG, "Registering GooglePlayBillingPlugin...");
        registerPlugin(GooglePlayBillingPlugin.class);
        Log.d(TAG, "GooglePlayBillingPlugin registered successfully");
        
        super.onCreate(savedInstanceState);
    }
}
