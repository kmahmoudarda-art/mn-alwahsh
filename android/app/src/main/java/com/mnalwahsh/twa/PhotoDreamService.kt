package com.mnalwahsh.twa

import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.service.dreams.DreamService
import android.widget.FrameLayout
import android.widget.ImageView
import java.io.File

/**
 * Screensaver (Daydream) that cycles through the same photo folder as
 * PhotoWallpaperService: Android/data/com.mnalwahsh.twa/files/wallpapers/
 */
class PhotoDreamService : DreamService() {

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var imageView: ImageView
    private var photos: List<File> = emptyList()
    private var index = 0
    private val intervalMs = 12_000L

    private val tickRunner = object : Runnable {
        override fun run() {
            showNext()
            handler.postDelayed(this, intervalMs)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isInteractive = false
        isFullscreen = true

        val frame = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
        }
        imageView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        frame.addView(imageView)
        setContentView(frame)

        refreshPhotos()
        showNext()
        handler.postDelayed(tickRunner, intervalMs)
    }

    override fun onDetachedFromWindow() {
        handler.removeCallbacks(tickRunner)
        super.onDetachedFromWindow()
    }

    private fun refreshPhotos() {
        val dir = getExternalFilesDir("wallpapers")
        photos = dir?.listFiles { f ->
            f.isFile && f.extension.lowercase() in listOf("jpg", "jpeg", "png", "webp")
        }?.toList()?.sortedBy { it.name } ?: emptyList()
    }

    private fun showNext() {
        if (photos.isEmpty()) return
        val file = photos[index % photos.size]
        val targetW = imageView.width.takeIf { it > 0 } ?: 1920
        val targetH = imageView.height.takeIf { it > 0 } ?: 1080
        val bitmap = PhotoWallpaperService.decodeSampledBitmap(file, targetW, targetH)
        if (bitmap != null) {
            imageView.alpha = 0f
            imageView.setImageBitmap(bitmap)
            imageView.animate().alpha(1f).setDuration(800).start()
        }
        index = (index + 1) % photos.size
    }
}
