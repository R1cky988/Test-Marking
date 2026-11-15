package com.testmarking.app.omr.model

/** What the sheet says about who wrote it. A digit that could not be read is "?". */
data class IdResult(
    val studentId: String = "",
    val classCode: String = "",
    val examCode: String = "",
    val ok: Boolean = false,
    val error: String = "",
)

/** answer = the marked options ("A", "A,C") or "" for a blank question; flag 1 = more than one mark in a single-answer question. */
data class AnswerResult(val questionNumber: Int, val answer: String, val flag: Int = 0)

data class OmrOutput(
    val success: Boolean,
    val errorCode: String = "",
    val errorMessage: String = "",
    val warnings: List<String> = emptyList(),
    val idResult: IdResult = IdResult(),
    val answers: List<AnswerResult> = emptyList(),
    val laplacianVariance: Float = 0f,
    val meanBrightness: Float = 0f,
    /** the straightened sheet, JPEG as Base64 (empty if the reader sent none) */
    val dewarpedImageBase64: String = "",
)

data class OmrOptions(
    val densityThreshold: Float = 0.40f,
    val diffThreshold: Float = 0.20f,
    val useAdaptiveThreshold: Boolean = false,
    val adaptiveBlockSize: Int = 31,
    val adaptiveC: Float = 8.0f,
    val preprocessMarkers: Boolean = false,
    val preprocessPostWarp: Boolean = false,
    val morphCleanup: Boolean = false,
    /** the reader chooses the preprocessing from the quality of the photo */
    val autoAdaptive: Boolean = true,
    /** of the 12 markers of the sheet, how many must be found */
    val requiredMarkers: Int = 12,
)
