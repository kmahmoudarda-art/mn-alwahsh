package com.mnalwahsh.tvlauncher

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import java.io.File

class PhotoWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine = PhotoEngine()

    private inner class PhotoEngine : Engine() {
        private val handler = Handler(Looper.getMainLooper())
        private var visible = true
        private var photoIndex = 0
        private var photos: List<File> = emptyList()
        private val intervalMs = 20_000L

        private val drawRunner = object : Runnable {
            override fun run() {
                draw()
                if (visible) {
                    handler.postDelayed(this, intervalMs)
                }
            }
        }

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            refreshPhotos()
        }

        override fun onVisibilityChanged(visible: Boolean) {
            this.visible = visible
            if (visible) {
                refreshPhotos()
                handler.post(drawRunner)
            } else {
                handler.removeCallbacks(drawRunner)
            }
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            super.onSurfaceDestroyed(holder)
            visible = false
            handler.removeCallbacks(drawRunner)
        }

        private fun refreshPhotos() {
            photos = PhotoStore.listPhotos(applicationContext)
        }

        private fun draw() {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas()
                if (canvas != null) {
                    drawFrame(canvas)
                }
            } finally {
                if (canvas != null) holder.unlockCanvasAndPost(canvas)
            }
            if (photos.isNotEmpty()) {
                photoIndex = (photoIndex + 1) % photos.size
            }
        }

        private fun drawFrame(canvas: Canvas) {
            canvas.drawColor(Color.BLACK)
            if (photos.isEmpty()) return
            val file = photos[photoIndex % photos.size]
            val bitmap = PhotoStore.decodeSampledBitmap(file, canvas.width, canvas.height) ?: return
            val scale = maxOf(
                canvas.width.toFloat() / bitmap.width,
                canvas.height.toFloat() / bitmap.height
            )
            val scaledWidth = bitmap.width * scale
            val scaledHeight = bitmap.height * scale
            val left = (canvas.width - scaledWidth) / 2f
            val top = (canvas.height - scaledHeight) / 2f
            val dest = RectF(left, top, left + scaledWidth, top + scaledHeight)
            canvas.drawBitmap(bitmap, null, dest, Paint(Paint.FILTER_BITMAP_FLAG))
            bitmap.recycle()
        }
    }
}
