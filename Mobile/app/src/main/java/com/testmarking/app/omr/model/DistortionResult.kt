package com.testmarking.app.omr.model

/** Only here because native_bridge.cpp builds one in analyzeDistortion (not used by the app). */
data class DistortionResult(
    val rmsError: Double,
    val maxDeviation: Double,
    val severity: Int,
    val recommendation: String,
)
