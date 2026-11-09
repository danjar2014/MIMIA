# flutter_inappwebview et ses interfaces JavaScript
-keep class com.pichillilorenzo.flutter_inappwebview_android.** { *; }
-keepattributes JavascriptInterface
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-dontwarn com.google.android.play.core.**
