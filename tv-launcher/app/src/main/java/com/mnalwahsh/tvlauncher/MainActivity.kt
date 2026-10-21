package com.mnalwahsh.tvlauncher

import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

/**
 * A minimal Android TV home-screen launcher: shows a row of installed apps'
 * icons, and crossfades a full-screen background between a set of character
 * photos as D-pad focus moves from one icon to the next.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var bgA: ImageView
    private lateinit var bgB: ImageView
    private lateinit var iconRow: LinearLayout
    private var topIsA = true
    private var characterIndex = 0

    // Cycle through these on every focus change, in order, looping.
    private val characterDrawables = listOf(
        R.drawable.character_baby,
        R.drawable.character_girl
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        bgA = findViewById(R.id.bgA)
        bgB = findViewById(R.id.bgB)
        iconRow = findViewById(R.id.iconRow)

        bgA.setImageResource(characterDrawables[0])

        buildIconRow()
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
        characterIndex = (characterIndex + 1) % characterDrawables.size
        val nextRes = characterDrawables[characterIndex]

        val showing = if (topIsA) bgA else bgB
        val hidden = if (topIsA) bgB else bgA

        hidden.setImageResource(nextRes)
        hidden.alpha = 0f
        hidden.animate().alpha(1f).setDuration(400).start()
        showing.animate().alpha(0f).setDuration(400).start()

        topIsA = !topIsA
    }

    private fun getLaunchableApps(): List<ResolveInfo> {
        val pm = packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER)
        }
        var apps = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
        if (apps.isEmpty()) {
            // Fallback for devices/emulators without leanback-category apps
            val fallbackIntent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            apps = pm.queryIntentActivities(fallbackIntent, PackageManager.MATCH_ALL)
        }
        return apps
            .filter { it.activityInfo.packageName != packageName }
            .distinctBy { it.activityInfo.packageName }
            .sortedBy { it.loadLabel(pm).toString() }
    }
}
