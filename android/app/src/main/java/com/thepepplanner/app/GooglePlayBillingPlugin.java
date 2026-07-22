package com.thepepplanner.app;

import android.app.Activity;
import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.android.billingclient.api.*;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.Arrays;
import java.util.List;
import java.util.ArrayList;
import com.getcapacitor.JSArray;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    
    private static final String TAG = "GooglePlayBilling";
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    
    public GooglePlayBillingPlugin() {
        super();
        android.util.Log.d(TAG, "GooglePlayBillingPlugin CONSTRUCTOR called");
    }
    
    @Override
    public void load() {
        super.load();
        android.util.Log.d(TAG, "GooglePlayBillingPlugin.load() called");
        initializeBillingClient();
    }
    
    private void initializeBillingClient() {
        android.util.Log.d(TAG, "initializeBillingClient() called");
        Activity activity = getActivity();
        if (activity == null) {
            android.util.Log.e(TAG, "Activity is null, cannot initialize billing client");
            return;
        }
        
        android.util.Log.d(TAG, "Creating billing client...");
        billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
        
        android.util.Log.d(TAG, "Starting billing client connection...");
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    android.util.Log.d(TAG, "✅ Billing client ready!");
                } else {
                    android.util.Log.e(TAG, "❌ Billing setup failed: " + billingResult.getDebugMessage());
                }
            }
            
            @Override
            public void onBillingServiceDisconnected() {
                android.util.Log.w(TAG, "⚠️ Billing service disconnected");
            }
        });
    }
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        android.util.Log.d(TAG, "isAvailable() called");
        android.util.Log.d(TAG, "  billingClient: " + (billingClient != null ? "not null" : "null"));
        android.util.Log.d(TAG, "  billingClient.isReady(): " + (billingClient != null && billingClient.isReady()));
        
        JSObject ret = new JSObject();
        ret.put("available", billingClient != null && billingClient.isReady());
        call.resolve(ret);
    }
    
    @PluginMethod
    public void queryProducts(PluginCall call) {
        if (!billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }
        
        try {
            com.getcapacitor.JSArray productIdsArray = call.getArray("productIds");
            if (productIdsArray == null) {
                call.reject("productIds array is required");
                return;
            }
            
            List<String> productIds = new ArrayList<>();
            for (int i = 0; i < productIdsArray.length(); i++) {
                productIds.add(productIdsArray.getString(i));
            }
            
            String productType = call.getString("productType", "subs");
            
            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            for (String productId : productIds) {
                productList.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(productType)
                    .build());
            }
            
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();
            
            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("Failed to query products: " + billingResult.getDebugMessage());
                    return;
                }
                
                JSObject ret = new JSObject();
                com.getcapacitor.JSArray productsArray = new com.getcapacitor.JSArray();
                
                for (ProductDetails productDetails : productDetailsList) {
                    JSObject product = new JSObject();
                    product.put("productId", productDetails.getProductId());
                    product.put("title", productDetails.getTitle());
                    product.put("description", productDetails.getDescription());
                    
                    // Get pricing information
                    if (productType.equals("subs")) {
                        List<ProductDetails.SubscriptionOfferDetails> offerDetailsList = productDetails.getSubscriptionOfferDetails();
                        if (offerDetailsList != null && offerDetailsList.size() > 0) {
                            ProductDetails.SubscriptionOfferDetails offerDetails = offerDetailsList.get(0);
                            if (offerDetails.getPricingPhases() != null && offerDetails.getPricingPhases().getPricingPhaseList().size() > 0) {
                                ProductDetails.PricingPhase pricingPhase = offerDetails.getPricingPhases().getPricingPhaseList().get(0);
                                product.put("price", pricingPhase.getPriceAmountMicros() / 1000000.0);
                                product.put("priceCurrencyCode", pricingPhase.getPriceCurrencyCode());
                                product.put("billingPeriod", pricingPhase.getBillingPeriod());
                            }
                        }
                    } else {
                        ProductDetails.OneTimePurchaseOfferDetails offerDetails = productDetails.getOneTimePurchaseOfferDetails();
                        if (offerDetails != null) {
                            product.put("price", offerDetails.getPriceAmountMicros() / 1000000.0);
                            product.put("priceCurrencyCode", offerDetails.getPriceCurrencyCode());
                        }
                    }
                    
                    productsArray.put(product);
                }
                
                ret.put("products", productsArray);
                call.resolve(ret);
            });
        } catch (Exception e) {
            call.reject("Error querying products: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void launchPurchaseFlow(PluginCall call) {
        android.util.Log.d("GooglePlayBilling", "launchPurchaseFlow called");
        
        if (billingClient == null) {
            android.util.Log.e("GooglePlayBilling", "Billing client is null");
            call.reject("Billing client is null. Please wait a moment and try again.");
            return;
        }
        
        if (!billingClient.isReady()) {
            android.util.Log.e("GooglePlayBilling", "Billing client not ready");
            call.reject("Billing client not ready. Please wait a moment and try again.");
            return;
        }
        
        String productId = call.getString("productId");
        String productType = call.getString("productType", "subs");
        
        if (productId == null) {
            android.util.Log.e("GooglePlayBilling", "Product ID is null");
            call.reject("Product ID is required");
            return;
        }
        
        android.util.Log.d("GooglePlayBilling", "Launching purchase flow for: " + productId + " (type: " + productType + ")");
        
        pendingPurchaseCall = call;
        
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(productType)
            .build();
        
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Arrays.asList(product))
            .build();
        
        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
            android.util.Log.d("GooglePlayBilling", "Product query result: " + billingResult.getResponseCode());
            
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                android.util.Log.e("GooglePlayBilling", "Failed to query product: " + billingResult.getDebugMessage());
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Failed to query product: " + billingResult.getDebugMessage());
                    pendingPurchaseCall = null;
                }
                return;
            }
            
            if (productDetailsList == null || productDetailsList.isEmpty()) {
                android.util.Log.e("GooglePlayBilling", "Product not found in list");
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Product not found: " + productId);
                    pendingPurchaseCall = null;
                }
                return;
            }
            
            ProductDetails productDetails = productDetailsList.get(0);
            Activity activity = getActivity();
            if (activity == null) {
                android.util.Log.e("GooglePlayBilling", "Activity is null");
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Activity not available");
                    pendingPurchaseCall = null;
                }
                return;
            }
            
            android.util.Log.d("GooglePlayBilling", "Building billing flow params");
            
            // For subscriptions, we need to get the offer token
            BillingFlowParams.Builder flowParamsBuilder = BillingFlowParams.newBuilder();
            
            if (productType.equals("subs")) {
                List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
                if (offers != null && !offers.isEmpty()) {
                    String offerToken = offers.get(0).getOfferToken();
                    flowParamsBuilder.setProductDetailsParamsList(Arrays.asList(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(productDetails)
                            .setOfferToken(offerToken)
                            .build()
                    ));
                } else {
                    android.util.Log.e("GooglePlayBilling", "No subscription offers found");
                    if (pendingPurchaseCall != null) {
                        pendingPurchaseCall.reject("No subscription offers available");
                        pendingPurchaseCall = null;
                    }
                    return;
                }
            } else {
                flowParamsBuilder.setProductDetailsParamsList(Arrays.asList(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                ));
            }
            
            BillingFlowParams flowParams = flowParamsBuilder.build();
            android.util.Log.d("GooglePlayBilling", "Launching billing flow");
            BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
            
            android.util.Log.d("GooglePlayBilling", "Billing flow launch result: " + result.getResponseCode());
            
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                android.util.Log.e("GooglePlayBilling", "Failed to launch billing flow: " + result.getDebugMessage());
                if (pendingPurchaseCall != null) {
                    pendingPurchaseCall.reject("Failed to launch billing flow: " + result.getDebugMessage() + " (Code: " + result.getResponseCode() + ")");
                    pendingPurchaseCall = null;
                }
            } else {
                android.util.Log.d("GooglePlayBilling", "Billing flow launched successfully, waiting for purchase result");
            }
        });
    }
    
    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        if (!billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }
        
        String purchaseToken = call.getString("purchaseToken");
        if (purchaseToken == null) {
            call.reject("Purchase token is required");
            return;
        }
        
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build();
        
        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                call.resolve();
            } else {
                call.reject("Failed to acknowledge purchase: " + billingResult.getDebugMessage());
            }
        });
    }
    
    @PluginMethod
    public void queryPurchases(PluginCall call) {
        if (!billingClient.isReady()) {
            call.reject("Billing client not ready");
            return;
        }
        
        String productType = call.getString("productType", "subs");
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(productType)
            .build();
        
        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("Failed to query purchases: " + billingResult.getDebugMessage());
                return;
            }
            
            JSObject ret = new JSObject();
            com.getcapacitor.JSArray purchaseArray = new com.getcapacitor.JSArray();
            
            for (Purchase purchase : purchases) {
                JSObject purchaseObj = new JSObject();
                purchaseObj.put("orderId", purchase.getOrderId());
                purchaseObj.put("packageName", purchase.getPackageName());
                purchaseObj.put("purchaseToken", purchase.getPurchaseToken());
                purchaseObj.put("signature", purchase.getSignature());
                purchaseObj.put("originalJson", purchase.getOriginalJson());
                purchaseObj.put("purchaseTime", purchase.getPurchaseTime());
                
                // Convert products list to JSArray
                com.getcapacitor.JSArray productsArray = new com.getcapacitor.JSArray();
                for (String productId : purchase.getProducts()) {
                    productsArray.put(productId);
                }
                purchaseObj.put("products", productsArray);
                
                purchaseObj.put("isAcknowledged", purchase.isAcknowledged());
                purchaseObj.put("isAutoRenewing", purchase.isAutoRenewing());
                purchaseArray.put(purchaseObj);
            }
            
            ret.put("purchases", purchaseArray);
            call.resolve(ret);
        });
    }
    
    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) {
            return;
        }
        
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null; // Clear immediately to prevent double handling
        
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Purchase purchase = purchases.get(0);
            JSObject ret = new JSObject();
            ret.put("orderId", purchase.getOrderId());
            ret.put("packageName", purchase.getPackageName());
            ret.put("purchaseToken", purchase.getPurchaseToken());
            ret.put("signature", purchase.getSignature());
            ret.put("originalJson", purchase.getOriginalJson());
            ret.put("purchaseTime", purchase.getPurchaseTime());
            
            // Convert products list to JSArray
            com.getcapacitor.JSArray productsArray = new com.getcapacitor.JSArray();
            for (String productId : purchase.getProducts()) {
                productsArray.put(productId);
            }
            ret.put("products", productsArray);
            
            ret.put("isAcknowledged", purchase.isAcknowledged());
            ret.put("isAutoRenewing", purchase.isAutoRenewing());
            
            call.resolve(ret);
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.reject("User canceled the purchase");
        } else {
            String errorMessage = "Purchase failed: " + billingResult.getDebugMessage() + " (Code: " + billingResult.getResponseCode() + ")";
            call.reject(errorMessage);
        }
    }
}


