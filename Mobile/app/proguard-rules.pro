# Gson reads these classes by field name.
-keep class com.testmarking.app.data.** { *; }
-keepattributes Signature
# the C++ code finds these by name
-keep class com.testmarking.app.omr.** { *; }
-keep class org.opencv.** { *; }
-keepattributes *Annotation*

# called by the question page (assets/latex/question.html)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
