package com.mnalwahsh.twa

import android.app.Activity
import android.view.WindowManager
import android.webkit.JavascriptInterface

/**
 * Lets a page ask the app to block screenshots, screen recording and the
 * recent-apps thumbnail (Android's FLAG_SECURE). The solo game turns it on
 * while it is open and off again when the player leaves it; see
 * src/utils/screenSecure.js in the web project.
 */
class ScreenSecureBridge(private val activity: Activity) {

    @JavascriptInterface
    fun setSecure(secure: Boolean) {
        activity.runOnUiThread {
            if (secure) {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }
}
