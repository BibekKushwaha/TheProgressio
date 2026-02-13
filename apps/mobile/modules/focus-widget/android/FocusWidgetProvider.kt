package com.transition.app.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

/**
 * Focus Session Widget for Android home screen / lock screen.
 *
 * Displays the current focus session timer, task title, and session type.
 * Updated periodically via SharedPreferences (written by the Expo native module).
 */
class FocusWidgetProvider : AppWidgetProvider() {

    companion object {
        const val PREFS_NAME = "FocusWidgetPrefs"
        const val KEY_TASK_TITLE = "taskTitle"
        const val KEY_ELAPSED_SECONDS = "elapsedSeconds"
        const val KEY_PLANNED_MINUTES = "plannedDurationMinutes"
        const val KEY_IS_PAUSED = "isPaused"
        const val KEY_SESSION_TYPE = "sessionType"
        const val KEY_IS_ACTIVE = "isActive"
        const val ACTION_UPDATE = "com.transition.app.widget.UPDATE"

        fun triggerUpdate(context: Context) {
            val intent = Intent(context, FocusWidgetProvider::class.java).apply {
                action = ACTION_UPDATE
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, FocusWidgetProvider::class.java)
            )
            onUpdate(context, appWidgetManager, widgetIds)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val isActive = prefs.getBoolean(KEY_IS_ACTIVE, false)

        // Use a simple layout — R.layout.focus_widget is defined in res/layout
        val views = RemoteViews(context.packageName, getLayoutId(context))

        if (isActive) {
            val taskTitle = prefs.getString(KEY_TASK_TITLE, "Focus Session") ?: "Focus Session"
            val elapsed = prefs.getInt(KEY_ELAPSED_SECONDS, 0)
            val planned = prefs.getInt(KEY_PLANNED_MINUTES, 25)
            val isPaused = prefs.getBoolean(KEY_IS_PAUSED, false)
            val sessionType = prefs.getString(KEY_SESSION_TYPE, "POMODORO") ?: "POMODORO"

            val minutes = elapsed / 60
            val seconds = elapsed % 60
            val timeStr = String.format("%02d:%02d", minutes, seconds)
            val statusStr = if (isPaused) "PAUSED" else sessionType.replace("_", " ")

            views.setTextViewText(getTextViewId(context, "widget_title"), taskTitle)
            views.setTextViewText(getTextViewId(context, "widget_timer"), timeStr)
            views.setTextViewText(getTextViewId(context, "widget_status"), statusStr)
            views.setTextViewText(getTextViewId(context, "widget_duration"), "/ ${planned} min")
        } else {
            views.setTextViewText(getTextViewId(context, "widget_title"), "No Active Session")
            views.setTextViewText(getTextViewId(context, "widget_timer"), "--:--")
            views.setTextViewText(getTextViewId(context, "widget_status"), "")
            views.setTextViewText(getTextViewId(context, "widget_duration"), "")
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun getLayoutId(context: Context): Int {
        return context.resources.getIdentifier("focus_widget", "layout", context.packageName)
    }

    private fun getTextViewId(context: Context, name: String): Int {
        return context.resources.getIdentifier(name, "id", context.packageName)
    }
}
