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

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
