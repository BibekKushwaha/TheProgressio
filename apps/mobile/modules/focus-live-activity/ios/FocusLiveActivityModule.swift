import ActivityKit
import ExpoModulesCore

/// Expo native module that bridges Live Activities to JavaScript
@available(iOS 16.2, *)
public class FocusLiveActivityModule: Module {
    private var currentActivityId: String?

    public func definition() -> ModuleDefinition {
        Name("FocusLiveActivity")

        /// Check if Live Activities are supported on this device
        Function("isSupported") { () -> Bool in
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }

        /// Start a Live Activity for a focus session
        AsyncFunction("startActivity") { (params: [String: Any]) in
            guard let sessionId = params["sessionId"] as? String,
                  let taskTitle = params["taskTitle"] as? String,
                  let plannedMinutes = params["plannedDurationMinutes"] as? Int,
                  let sessionType = params["sessionType"] as? String else {
                throw NSError(domain: "FocusLiveActivity", code: 1,
                             userInfo: [NSLocalizedDescriptionKey: "Missing required parameters"])
            }

            let attributes = FocusSessionAttributes(
                taskTitle: taskTitle,
                plannedDurationMinutes: plannedMinutes,
                sessionId: sessionId
            )

            let state = FocusSessionAttributes.ContentState(
                elapsedSeconds: 0,
                isPaused: false,
                breakNumber: 0,
                sessionType: sessionType
            )

            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil),
                pushType: nil
            )

            self.currentActivityId = activity.id
        }

        /// Update the Live Activity state
        AsyncFunction("updateActivity") { (params: [String: Any]) in
            guard let activityId = self.currentActivityId else { return }

            let elapsedSeconds = params["elapsedSeconds"] as? Int ?? 0
            let isPaused = params["isPaused"] as? Bool ?? false
            let breakNumber = params["breakNumber"] as? Int ?? 0
            let sessionType = params["sessionType"] as? String ?? "POMODORO"

            let state = FocusSessionAttributes.ContentState(
                elapsedSeconds: elapsedSeconds,
                isPaused: isPaused,
                breakNumber: breakNumber,
                sessionType: sessionType
            )

            for activity in Activity<FocusSessionAttributes>.activities where activity.id == activityId {
                await activity.update(.init(state: state, staleDate: nil))
            }
        }

        /// End the Live Activity
        AsyncFunction("endActivity") { (params: [String: Any]?) in
            guard let activityId = self.currentActivityId else { return }

            let elapsedSeconds = (params?["elapsedSeconds"] as? Int) ?? 0

            let finalState = FocusSessionAttributes.ContentState(
                elapsedSeconds: elapsedSeconds,
                isPaused: false,
                breakNumber: 0,
                sessionType: "COMPLETED"
            )

            for activity in Activity<FocusSessionAttributes>.activities where activity.id == activityId {
                await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .default)
            }

            self.currentActivityId = nil
        }
    }
}
