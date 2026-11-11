package com.testmarking.app.util

/** The letter shown in an avatar circle: first letter of the last word of the name (Vietnamese given name). */
fun initialOf(name: String?): String {
    val word = name?.trim()?.split(Regex("\\s+"))?.lastOrNull().orEmpty()
    return word.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
}
