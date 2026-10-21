package com.mnalwahsh.tvlauncher

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import kotlin.random.Random

/**
 * A minimal Android TV home-screen launcher: shows a row of installed apps'
 * icons, and crossfades a full-screen background to a random photo (pulled
 * from Android/data/com.mnalwahsh.tvlauncher/files/characters/ on the device)
 * every time D-pad focus moves to a different icon. Push new photos there
 * any time with `adb push` -- no rebuild needed.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var bgA: ImageView
    private lateinit var bgB: ImageView
    private lateinit var iconRow: LinearLayout
    private var topIsA = true
    private var lastPhotoIndex = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bgA = findViewById(R.id.bgA)
        bgB = findViewById(R.id.bgB)
        iconRow = findViewById(R.id.iconRow)

        buildIconRow()
        advanceBackground() // show something right away
    }

    private fun buildIconRow() {
        val apps = getLaunchableApps()
        val iconSizePx = (96 * resources.displayMetrics.density).toInt()
        val marginPx = (16 * resources.displayMetrics.density).toInt()

        for (info in apps) {
            val pm = packageManager
            val label = info.loadLabel(pm)
            val icon: Drawable = info.loadIcon(pm)
            val launchIntent = pm.getLaunchIntentForPackage(info.activityInfo.packageName)

            val iv = ImageView(this).apply {
                layoutParams = LinearLayout.LayoutParams(iconSizePx, iconSizePx).apply {
                    marginStart = marginPx
                    marginEnd = marginPx
                }
                scaleType = ImageView.ScaleType.FIT_CENTER
                setImageDrawable(icon)
                isFocusable = true
                isFocusableInTouchMode = true
                contentDescription = label
                background = null
            }

            iv.setOnFocusChangeListener { view, hasFocus ->
                if (hasFocus) {
                    view.animate().scaleX(1.25f).scaleY(1.25f).setDuration(150).start()
                    advanceBackground()
                } else {
                    view.animate().scaleX(1f).scaleY(1f).setDuration(150).start()
                }
            }

            iv.setOnClickListener {
                if (launchIntent != null) {
                    startActivity(launchIntent)
                }
            }

            iconRow.addView(iv)
        }

        iconRow.post {
            iconRow.getChildAt(0)?.requestFocus()
        }
    }

    private fun advanceBackground() {
        val photos = PhotoStore.listPhotos(this)
        if (photos.isEmpty()) return

        val nextIndex = if (photos.size == 1) {
            0
        } else {
            var candidate: Int
            do {
                candidate = Random.nextInt(photos.size)
            } while (candidate == lastPhotoIndex)
            candidate
        }
        lastPhotoIndex = nextIndex

        val showing = if (topIsA) bgA else bgB
        val hidden = if (topIsA) bgB else bgA

        val targetW = hidden.width.takeIf { it > 0 } ?: resources.displayMetrics.widthPixels
        val targetH = hidden.height.takeIf { it > 0 } ?: resources.displayMetrics.heightPixels
        val bitmap = PhotoStore.decodeSampledBitmap(photos[nextIndex], targetW, targetH) ?: return

        hidden.setImageBitmap(bitmap)
        hidden.alpha = 0f
        hidden.animate().alpha(1f).setDuration(400).start()
        showing.animate().alpha(0f).setDuration(400).start()

        topIsA = !topIsA
    }

    private fun getLaunchableApps(): List<ResolveInfo> {
        val pm = packageManager

        val leanbackIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
        }
        val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        val combined = pm.queryIntentActivities(leanbackIntent, 0) +
            pm.queryIntentActivities(launcherIntent, 0)

        return combined
            .filter { it.activityInfo.packageName != packageName }
            .distinctBy { it.activityInfo.packageName }
            .sortedBy { it.loadLabel(pm).toString() }
    }
}
