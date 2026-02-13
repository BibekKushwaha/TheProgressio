import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes

struct FocusSessionAttributes: ActivityAttributes {
    /// Static data that never changes during the activity
    struct ContentState: Codable, Hashable {
        var elapsedSeconds: Int
        var isPaused: Bool
        var breakNumber: Int
        var sessionType: String  // "DEEP_WORK" | "POMODORO" | "BREAK"
    }

    var taskTitle: String
    var plannedDurationMinutes: Int
    var sessionId: String
}

// MARK: - Live Activity Widget

@available(iOS 16.2, *)
struct FocusLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FocusSessionAttributes.self) { context in
            // Lock screen / banner presentation
            FocusLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.taskTitle, systemImage: "book.fill")
                        .font(.caption)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatTime(context.state.elapsedSeconds))
                        .font(.title2.monospacedDigit())
                        .foregroundColor(context.state.isPaused ? .orange : .green)
                }
                DynamicIslandExpandedRegion(.center) {
                    HStack {
                        Image(systemName: sessionIcon(context.state.sessionType))
                        Text(context.state.sessionType.replacingOccurrences(of: "_", with: " "))
                            .font(.caption2)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(
                        value: Double(context.state.elapsedSeconds),
                        total: Double(context.attributes.plannedDurationMinutes * 60)
                    )
                    .tint(context.state.isPaused ? .orange : .blue)
                }
            } compactLeading: {
                Image(systemName: "timer")
                    .foregroundColor(context.state.isPaused ? .orange : .green)
            } compactTrailing: {
                Text(formatTime(context.state.elapsedSeconds))
                    .font(.caption.monospacedDigit())
            } minimal: {
                Image(systemName: "timer")
                    .foregroundColor(context.state.isPaused ? .orange : .green)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct FocusLockScreenView: View {
    let context: ActivityViewContext<FocusSessionAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: sessionIcon(context.state.sessionType))
                    .foregroundColor(.blue)
                Text(context.attributes.taskTitle)
                    .font(.headline)
                    .lineLimit(1)
                Spacer()
                if context.state.isPaused {
                    Text("PAUSED")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.orange.opacity(0.2))
                        .foregroundColor(.orange)
                        .cornerRadius(4)
                }
            }

            HStack {
                Text(formatTime(context.state.elapsedSeconds))
                    .font(.system(.title, design: .monospaced))
                    .foregroundColor(context.state.isPaused ? .orange : .primary)

                Spacer()

                Text("/ \(context.attributes.plannedDurationMinutes) min")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            ProgressView(
                value: Double(context.state.elapsedSeconds),
                total: Double(context.attributes.plannedDurationMinutes * 60)
            )
            .tint(context.state.isPaused ? .orange : .blue)
        }
        .padding()
        .activityBackgroundTint(.black.opacity(0.7))
    }
}

// MARK: - Helpers

func formatTime(_ totalSeconds: Int) -> String {
    let minutes = totalSeconds / 60
    let seconds = totalSeconds % 60
    return String(format: "%02d:%02d", minutes, seconds)
}

func sessionIcon(_ type: String) -> String {
    switch type {
    case "POMODORO": return "timer"
    case "BREAK": return "cup.and.saucer.fill"
    case "DEEP_WORK": return "brain.head.profile"
    default: return "timer"
    }
}
