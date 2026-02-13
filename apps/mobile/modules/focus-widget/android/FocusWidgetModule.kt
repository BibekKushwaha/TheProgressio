package com.transition.app.widget

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo native module that bridges the Android Focus Widget to JavaScript.
 * Writes session data to SharedPreferences and triggers widget updates.
 */
class FocusWidgetModule : Module() {

    private val prefs: SharedPreferences
        get() = appContext.reactContext!!.getSharedPreferences(
            FocusWidgetProvider.PREFS_NAME,
            Context.MODE_PRIVATE
        )

    override fun definition() = ModuleDefinition {

        Name("FocusWidget")

        Function("isSupported") {
            true // Android widgets are always available
        }

        Function("updateWidget") { params: Map<String, Any?> ->
            val editor = prefs.edit()
            editor.putBoolean(FocusWidgetProvider.KEY_IS_ACTIVE, true)
            editor.putString(
                FocusWidgetProvider.KEY_TASK_TITLE,
                params["taskTitle"] as? String ?: "Focus Session"
            )
            editor.putInt(
                FocusWidgetProvider.KEY_ELAPSED_SECONDS,
                (params["elapsedSeconds"] as? Number)?.toInt() ?: 0
            )
            editor.putInt(
                FocusWidgetProvider.KEY_PLANNED_MINUTES,
                (params["plannedDurationMinutes"] as? Number)?.toInt() ?: 25
            )
            editor.putBoolean(
                FocusWidgetProvider.KEY_IS_PAUSED,
                params["isPaused"] as? Boolean ?: false
            )
            editor.putString(
                FocusWidgetProvider.KEY_SESSION_TYPE,
                params["sessionType"] as? String ?: "POMODORO"
            )
            editor.apply()

            // Trigger widget refresh
            FocusWidgetProvider.triggerUpdate(appContext.reactContext!!)
        }

        Function("clearWidget") {
            val editor = prefs.edit()
            editor.putBoolean(FocusWidgetProvider.KEY_IS_ACTIVE, false)
            editor.apply()

            FocusWidgetProvider.triggerUpdate(appContext.reactContext!!)
        }
    }
}
