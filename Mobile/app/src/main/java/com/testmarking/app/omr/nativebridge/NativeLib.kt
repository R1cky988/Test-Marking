package com.testmarking.app.omr.nativebridge

import android.graphics.Bitmap

/** The C++ reader of the answer sheet (libomr_native, built with OpenCV). The names must match native_bridge.cpp. */
class NativeLib {
    companion object {
        init {
            System.loadLibrary("omr_native")
        }

        /** Returns the result as a JSON text; see OmrEngine.parseResult. */
        @JvmStatic
        external fun processOmr(
            bitmap: Bitmap,
            templateJson: String,
            answerKeyJson: String?,
            densityThresh: Float,
            diffThresh: Float,
            enableScoring: Boolean,
            enableDebug: Boolean,
            useAdaptive: Boolean,
            adaptiveBlockSize: Int,
            adaptiveC: Float,
            preMarker: Boolean,
            postWarp: Boolean,
            morphCleanup: Boolean,
            autoAdaptive: Boolean,
            requiredMarkers: Int,
        ): String

        /** Call after the template changed: the C++ side caches the layout it computed. */
        @JvmStatic
        external fun clearOmrCache()
    }
}
