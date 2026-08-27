# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Capacitor's own officially-recommended rule (capacitorjs.com/docs/android/troubleshooting) —
# prevents R8 from stripping/renaming plugin classes in a way that breaks
# the bridge's reflection-based calls (@capacitor/share, @capacitor/splash-screen).
-keep public class * extends com.getcapacitor.Plugin

# Moves all obfuscated classes into a single package, saving DEX space by
# removing redundant package name strings (12g).
-repackageclasses

# Keeps line-number info in obfuscated stack traces for native-level crashes
# — otherwise a real Android crash shows no usable location at all. Paired
# deliberately with -renamesourcefileattribute below: alone, this would also
# expose real file names (MainActivity.java etc.) in a crash log or decompile;
# together, real names stay hidden while line numbers survive. Low benefit in
# practice (this app's native layer is thin — most logic is JS, already
# covered by ErrorBoundary's own crash-report path), added anyway since the
# combined pair has no real downside once decided on (2026-08-25).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
