package com.petitsrobots.petits_robots

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

// Plein écran verrouillé : l'appli épingle l'écran (Android « épinglage d'écran ») ; seul le code parent, dans l'appli, le retire.
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "petitsrobots/kiosk").setMethodCallHandler { call, result ->
            when (call.method) {
                "start" -> { try { startLockTask() } catch (e: Exception) { } ; result.success(null) }
                "stop" -> { try { stopLockTask() } catch (e: Exception) { } ; result.success(null) }
                else -> result.notImplemented()
            }
        }
    }
}
