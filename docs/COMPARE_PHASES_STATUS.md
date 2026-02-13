# Compare Phases Status (Production-Strict)

## Purpose
This document is the locked comparison baseline for the 5-phase academic platform roadmap.

Status rubric:
- `implemented`: backend + interface + data model + operational behavior + automated validation.
- `partial`: visible/backend path exists but at least one production requirement is missing.
- `missing`: no meaningful implementation.

## Phase Matrix

### Phase 1: Task Management Service
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| Frictionless NLP Quick Capture | implemented | `apps/docs/components/planner/NLPCommandBar.tsx`, `apps/planner-service/src/routes/task.route.ts`, `apps/planner-service/src/services/ai.service.ts` | none critical |
| Context-Aware Academic Scheduler (A/B, Week 1/2) | implemented | `apps/planner-service/src/services/timetable.service.ts`, timetable + rotation controllers/routes | none critical |
| AI Subtask Scaffolding | implemented | `apps/planner-service/src/routes/task.route.ts`, `apps/planner-service/src/services/ai.service.ts` | none critical |
| Visual Hierarchy (subjects/categories/icons/colors) | implemented | `apps/docs/app/(dashboard)/planner/page.tsx`, `apps/docs/app/(dashboard)/subjects/page.tsx`, category APIs | none critical |
| Local-First Persistence with CRDT sync | partial | CRDT op metadata + push/pull engine in `packages/store/src/local-db.ts`, `packages/store/src/sync-engine.ts`, sync APIs in `apps/planner-service/src/services/sync.service.ts` | mobile SQLite adapter parity is still pending |

### Phase 2: Habit Lifecycle & Streak Engine
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| Async Habit Automation via broker | implemented | planner event producer + habit consumer (`apps/planner-service/src/services/producer.service.ts`, `apps/habit-service/src/services/consumer.service.ts`) | none critical |
| Gentle Streak Logic (skip/recovery) | implemented | `apps/habit-service/src/services/streak.service.ts` | none critical |
| 365-day Heatmaps | implemented | heatmap service + tests (`apps/habit-service/src/services/streak.service.ts`, `apps/habit-service/tests/streak.service.test.ts`) | none critical |
| Adaptive Smart Nudges + conflict briefing | implemented | `apps/habit-service/src/services/nudge.service.ts` + tests | none critical |

### Phase 3: Productivity Analytics Service
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| ML Duration Prediction with PERT | implemented | `apps/analytics-service/src/services/prediction.service.ts` | none critical |
| Competitive Exam SWOT | implemented | `apps/analytics-service/src/services/swot.service.ts` | none critical |
| GPA What-If + weighted tracking | implemented | `apps/analytics-service/src/services/gpa.service.ts` + stats endpoints | none critical |
| Predictive Score Indicators (Monte Carlo/rank bands) | implemented | Monte Carlo engine + metadata in `apps/analytics-service/src/services/focus.service.ts`, `apps/analytics-service/src/controllers/stats.controller.ts` | none critical |

### Phase 4: Market-Specific Integration (India + WhatsApp)
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| WhatsApp Task Capture (text + voice) | implemented | voice + text capture/transcription in `apps/planner-service/src/controllers/whatsapp.controller.ts`, `apps/planner-service/src/services/whatsapp.service.ts` | none critical |
| WhatsApp Proactive Reminders | implemented | outbound nudge infrastructure in habit service | conversion instrumentation not yet enforced |
| UPI/Paytm/NetBanking payments | partial | backend intents/webhook + UI integration in `apps/planner-service/src/routes/payment.route.ts`, `apps/planner-service/src/services/payment.service.ts`, `apps/docs/components/settings/PricingSection.tsx` | no external PSP settlement callback validation beyond shared-secret webhook |

### Phase 5: UI/UX + Performance
| Requirement | Status | Evidence | Gap |
|---|---|---|---|
| 2-tap Navigation guarantee | partial | sidebar telemetry schema/event emission in `apps/docs/lib/navigationTelemetry.ts`, `apps/docs/components/landing/sidebar.tsx` | no aggregate compliance dashboard/SLO enforcement yet |
| Lock-screen persistence (native mobile) | partial | native bridge/modules exist in `apps/mobile/dist/native/*` | source app flow and E2E persistence verification missing |
| Unified high-efficiency sitemap pages | implemented | dashboard routes under `apps/docs/app/(dashboard)/*` | none critical |

## Locked Closure PR Sequence
1. PR1: comparison artifact + traceability baseline (this document).
2. PR2: local-first CRDT protocol upgrade.
3. PR3: Monte Carlo predictive performance engine.
4. PR4: WhatsApp voice capture + observability.
5. PR5: UPI-native payment backend + entitlements.
6. PR6: UX contracts + lock-screen productionization.

## Definition of Done Checklist
- API contract updated with request/response types.
- Service behavior implemented in backend.
- UI/store integration path connected where applicable.
- Regression and scenario tests added/updated.
- Backward compatibility preserved for existing callers.
