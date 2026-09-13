package com.mnalwahsh.twa

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject

/**
 * Bridges window.AndroidBillingNative (see the JS shim injected by
 * MainActivity) to the real Google Play Billing Library. Every call from
 * JS carries a requestId; the result (or error) is delivered back by
 * evaluating window.__androidBillingResolve(requestId, jsonResult) on the
 * WebView, since @JavascriptInterface methods can't return values
 * asynchronously.
 *
 * This only ever hands purchaseTokens back to the web page — it never
 * acknowledges a purchase itself. Acknowledgement happens server-side in
 * netlify/functions/verify-play-purchase.js after it verifies the token
 * against the Play Developer API, matching how the previous TWA build
 * worked.
 */
class AndroidBillingBridge(
    private val activity: Activity,
    private val webView: WebView
) : PurchasesUpdatedListener {

    private val billingClient = BillingClient.newBuilder(activity)
        .setListener(this)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    private var isConnected = false
    private val pendingRequestIdBySku = mutableMapOf<String, String>()

    private fun ensureConnected(onReady: () -> Unit) {
        if (isConnected && billingClient.isReady) {
            onReady()
            return
        }
        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                isConnected = billingResult.responseCode == BillingClient.BillingResponseCode.OK
                if (isConnected) onReady()
            }

            override fun onBillingServiceDisconnected() {
                isConnected = false
            }
        })
    }

    @JavascriptInterface
    fun requestPurchase(sku: String, requestId: String) {
        ensureConnected {
            queryProductDetails(sku) { productDetails ->
                if (productDetails == null) {
                    resolveError(requestId, "product-not-found")
                    return@queryProductDetails
                }
                pendingRequestIdBySku[sku] = requestId
                val paramsList = listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                )
                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(paramsList)
                    .build()
                activity.runOnUiThread {
                    billingClient.launchBillingFlow(activity, flowParams)
                }
            }
        }
    }

    @JavascriptInterface
    fun requestProductDetails(skusJson: String, requestId: String) {
        ensureConnected {
            val skus = mutableListOf<String>()
            val array = JSONArray(skusJson)
            for (i in 0 until array.length()) skus.add(array.getString(i))

            val products = skus.map {
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(it)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            }
            val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()

            billingClient.queryProductDetailsAsync(params) { billingResult, result ->
                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    resolveError(requestId, "query-failed:${billingResult.responseCode}")
                    return@queryProductDetailsAsync
                }
                val out = JSONArray()
                for (details in result) {
                    val offer = details.oneTimePurchaseOfferDetails
                    out.put(
                        JSONObject().apply {
                            put("itemId", details.productId)
                            put("title", details.title)
                            put("price", offer?.formattedPrice ?: "")
                            put("priceAmountMicros", offer?.priceAmountMicros ?: 0L)
                            put("priceCurrencyCode", offer?.priceCurrencyCode ?: "")
                        }
                    )
                }
                resolveSuccess(requestId, out)
            }
        }
    }

    @JavascriptInterface
    fun requestListPurchases(requestId: String) {
        ensureConnected {
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            billingClient.queryPurchasesAsync(params) { billingResult, purchases ->
                if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                    resolveError(requestId, "query-failed:${billingResult.responseCode}")
                    return@queryPurchasesAsync
                }
                val out = JSONArray()
                for (purchase in purchases) {
                    out.put(
                        JSONObject().apply {
                            put("itemId", purchase.products.firstOrNull() ?: "")
                            put("purchaseToken", purchase.purchaseToken)
                            put("purchaseState", purchase.purchaseState)
                        }
                    )
                }
                resolveSuccess(requestId, out)
            }
        }
    }

    private fun queryProductDetails(sku: String, callback: (ProductDetails?) -> Unit) {
        val products = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(sku)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder().setProductList(products).build()
        billingClient.queryProductDetailsAsync(params) { billingResult, result ->
            if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
                callback(null)
            } else {
                callback(result.firstOrNull())
            }
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { purchase ->
                    val sku = purchase.products.firstOrNull() ?: return@forEach
                    val requestId = pendingRequestIdBySku.remove(sku) ?: return@forEach
                    resolveSuccess(requestId, purchase.purchaseToken)
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                rejectAllPending("canceled")
            }
            else -> {
                rejectAllPending("purchase-failed:${billingResult.responseCode}")
            }
        }
    }

    private fun rejectAllPending(error: String) {
        val ids = pendingRequestIdBySku.values.toList()
        pendingRequestIdBySku.clear()
        ids.forEach { resolveError(it, error) }
    }

    private fun resolveSuccess(requestId: String, value: Any) {
        val json = JSONObject()
        when (value) {
            is String -> json.put("value", value)
            is JSONArray -> json.put("value", value)
            is JSONObject -> json.put("value", value)
            else -> json.put("value", value.toString())
        }
        evaluate(requestId, json)
    }

    private fun resolveError(requestId: String, error: String) {
        val json = JSONObject().put("error", error)
        evaluate(requestId, json)
    }

    private fun evaluate(requestId: String, json: JSONObject) {
        val escaped = JSONObject.quote(json.toString())
        webView.post {
            webView.evaluateJavascript("window.__androidBillingResolve('$requestId', $escaped)", null)
        }
    }
}
