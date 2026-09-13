package com.mnalwahsh.twa

import android.annotation.SuppressLint
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.view.View
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

private const val SITE_URL = "https://mnalwahsh.com"
private const val SITE_HOST = "mnalwahsh.com"

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var splashLayout: LinearLayout
    private lateinit var offlineLayout: LinearLayout
    private var hasLoadedOnce = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        splashLayout = findViewById(R.id.splashLayout)
        offlineLayout = findViewById(R.id.offlineLayout)

        setupWebView()
        setupSwipeToRefresh()
        setupBackNavigation()
        findViewById<Button>(R.id.retryButton).setOnClickListener { reload() }

        webView.loadUrl(SITE_URL)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
        settings.mediaPlaybackRequiresUserGesture = false

        android.webkit.CookieManager.getInstance().setAcceptCookie(true)
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(AndroidBillingBridge(this, webView), "AndroidBillingNative")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                return if (isOwnSite(uri.host)) {
                    false // keep our own pages inside the app
                } else {
                    openInExternalBrowser(uri)
                    true
                }
            }

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                if (isOwnSite(url?.let { Uri.parse(it).host })) {
                    offlineLayout.visibility = View.GONE
                }
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                injectBillingBridgeScript(view)
                hasLoadedOnce = true
                hideSplash()
                swipeRefresh.isRefreshing = false
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame) {
                    showOffline()
                    swipeRefresh.isRefreshing = false
                }
            }

            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
                showOffline()
            }
        }
    }

    private fun injectBillingBridgeScript(view: WebView) {
        val script = """
            (function() {
                if (window.AndroidBilling) return;
                var pending = {};
                window.__androidBillingResolve = function(id, resultJson) {
                    var json = JSON.parse(resultJson);
                    var p = pending[id];
                    if (!p) return;
                    delete pending[id];
                    if (json.error) { p.reject(new Error(json.error)); } else { p.resolve(json.value); }
                };
                function call(method, args) {
                    return new Promise(function(resolve, reject) {
                        var id = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                        pending[id] = { resolve: resolve, reject: reject };
                        window.AndroidBillingNative[method].apply(window.AndroidBillingNative, args.concat([id]));
                    });
                }
                window.AndroidBilling = {
                    purchase: function(sku) { return call('requestPurchase', [sku]); },
                    getDetails: function(skus) { return call('requestProductDetails', [JSON.stringify(skus)]); },
                    listPurchases: function() { return call('requestListPurchases', []); }
                };
            })();
        """.trimIndent()
        view.evaluateJavascript(script, null)
    }

    private fun isOwnSite(host: String?): Boolean {
        return host == SITE_HOST || host?.endsWith(".$SITE_HOST") == true
    }

    private fun openInExternalBrowser(uri: Uri) {
        try {
            CustomTabsIntent.Builder().build().launchUrl(this, uri)
        } catch (_: Exception) {
            try {
                startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, uri))
            } catch (_: Exception) {
                // no browser available — nothing we can do
            }
        }
    }

    private fun setupSwipeToRefresh() {
        swipeRefresh.setColorSchemeResources(android.R.color.holo_red_dark)
        swipeRefresh.setOnRefreshListener { reload() }
    }

    private fun reload() {
        offlineLayout.visibility = View.GONE
        if (hasLoadedOnce) {
            webView.reload()
        } else {
            webView.loadUrl(SITE_URL)
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun showOffline() {
        hideSplash()
        offlineLayout.visibility = View.VISIBLE
    }

    private fun hideSplash() {
        splashLayout.visibility = View.GONE
    }
}
