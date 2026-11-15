package com.mnalwahsh.twa

import android.app.Activity
import android.content.Intent
import android.util.Base64
import android.view.WindowManager
import android.webkit.JavascriptInterface
import androidx.core.content.FileProvider
import java.io.File

/**
 * window.AndroidSolo — two things the solo game can't do from a web page:
 *
 *  - shareImage(): opens Android's share sheet (WhatsApp, Facebook…) with the
 *    result picture and one line of text. The page hands over the PNG as base64.
 *  - setSecure(): blocks screenshots, screen recording and the recent-apps
 *    thumbnail (FLAG_SECURE) while the solo game is open.
 *
 * Only our own site is ever loaded in this WebView (other links open in the
 * browser, see MainActivity), so only our own pages can call these.
 */
class SoloNativeBridge(private val activity: Activity) {

    @JavascriptInterface
    fun shareImage(base64Png: String, text: String): Boolean {
        return try {
            val bytes = Base64.decode(base64Png, Base64.DEFAULT)
            if (bytes.isEmpty() || bytes.size > MAX_IMAGE_BYTES) return false

            val dir = File(activity.cacheDir, "shared").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() } // keep the cache tidy: one picture at a time
            val file = File(dir, "mn-alwahsh-solo.png")
            file.writeBytes(bytes)

            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, text)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.runOnUiThread {
                activity.startActivity(Intent.createChooser(send, null))
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun setSecure(secure: Boolean) {
        activity.runOnUiThread {
            if (secure) {
                activity.window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }

    private companion object {
        const val MAX_IMAGE_BYTES = 8 * 1024 * 1024
    }
}
