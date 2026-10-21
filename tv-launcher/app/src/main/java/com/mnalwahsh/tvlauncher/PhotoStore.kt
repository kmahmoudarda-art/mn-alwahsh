package com.mnalwahsh.tvlauncher

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.File

/**
 * Single shared source of photos for everything in this app: the launcher's
 * focus-reactive background, the live wallpaper, and the screensaver all read
 * from the same folder, so pushing new photos there (via `adb push`) updates
 * all three without any rebuild.
 *
 * On-device path: Android/data/com.mnalwahsh.tvlauncher/files/characters/
 */
object PhotoStore {

    private const val FOLDER_NAME = "characters"
    private val EXTENSIONS = listOf("jpg", "jpeg", "png", "webp")

    fun listPhotos(context: Context): List<File> {
        val dir = context.getExternalFilesDir(FOLDER_NAME)
        return dir?.listFiles { f -> f.isFile && f.extension.lowercase() in EXTENSIONS }
            ?.toList()
            ?.sortedBy { it.name }
            ?: emptyList()
    }

    fun decodeSampledBitmap(file: File, reqWidth: Int, reqHeight: Int): Bitmap? {
        if (reqWidth <= 0 || reqHeight <= 0) return BitmapFactory.decodeFile(file.absolutePath)
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= reqWidth && bounds.outHeight / (sample * 2) >= reqHeight) {
            sample *= 2
        }
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        return BitmapFactory.decodeFile(file.absolutePath, opts)
    }
}
