# HyperLocal ProGuard rules

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep AppCompat activities
-keep public class * extends androidx.appcompat.app.AppCompatActivity

# Suppress warnings for known safe removals
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
