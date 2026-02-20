/**
 * Monte Carlo Simulation Queue & Worker
 *
 * Moves the CPU-intensive simulation loop off the Express main thread.
 * Follows the same Real/Mock pattern as worker.service.ts:
 *   - QUEUE_ENABLED=true  → uses BullMQ + Redis
 *   - QUEUE_ENABLED=false → runs inline synchronously (dev default)
 *
 * Concurrency is capped at 2 so at most 2 simulations run concurrently,
 * preventing a burst of cold-cache requests from saturating the CPU.
 */
import { Queue, Worker, QueueEvents, type ConnectionOptions, type Job } from "bullmq";
import { getAnalyticsCache, setAnalyticsCache } from "@repo/cache";
import {
    simulateSubject,
    simulateAllSubjects,
    type SubjectSimulationInput,
    type SimulationParams,
} from "./simulation.utils.js";
import type { LearningPace } from "./focus.service.js";

// ── Redis connection (same config as worker.service.ts) ────────────────

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const QUEUE_ENABLED = process.env.QUEUE_ENABLED === "true";

const connection: ConnectionOptions = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    ...(REDIS_PASSWORD ? { password: REDIS_PASSWORD } : {}),
} as ConnectionOptions;

const SIMULATION_QUEUE = "analytics.monte-carlo";

// ── Job payload ────────────────────────────────────────────────────────

export interface SimulationJobData {
    userId: string;
    examType: string;
    simulationRuns: number;
    seed: number;
    assumptions: string[];
    subjects: SubjectSimulationInput[];
}

// ── Real BullMQ implementation ─────────────────────────────────────────

class RealSimulationService {
    private queue: Queue<SimulationJobData, LearningPace[]>;
    private worker: Worker<SimulationJobData, LearningPace[]>;
    private events: QueueEvents;

    constructor() {
        this.queue = new Queue(SIMULATION_QUEUE, { connection });
        this.events = new QueueEvents(SIMULATION_QUEUE, { connection });

        this.worker = new Worker<SimulationJobData, LearningPace[]>(
            SIMULATION_QUEUE,
            async (job: Job<SimulationJobData>) => {
                const { userId, examType, simulationRuns, seed, assumptions, subjects } = job.data;
                const params: SimulationParams = { examType, simulationRuns, seed, assumptions };

                const results = simulateAllSubjects(subjects, params);

                // Cache from inside the worker so the enqueuing side gets
                // the result immediately if it polls the cache after waiting.
                await setAnalyticsCache(userId, "predictive", results, examType, 600);
                return results;
            },
            {
                connection,
                // Max 2 concurrent simulations — prevents CPU saturation during
                // a burst of cold-cache requests.
                concurrency: 2,
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            }
        );

        this.worker.on("completed", (job) => {
            console.log(`[SimulationWorker] ✅ Job ${job.id} completed (examType=${job.data.examType})`);
        });

        this.worker.on("failed", (job, err) => {
            console.error(`[SimulationWorker] ❌ Job ${job?.id} failed: ${err.message}`);
        });

        console.log(`✅ Simulation BullMQ Worker initialized (Queue: ${SIMULATION_QUEUE}, concurrency: 2)`);
    }

    async run(userId: string, subjects: SubjectSimulationInput[], params: SimulationParams): Promise<LearningPace[]> {
        // Check cache first — worker writes here on completion, so a warm hit
        // means we skip the queue entirely and return instantly.
        const cached = await getAnalyticsCache<LearningPace[]>(userId, "predictive", params.examType);
        if (cached) return cached;

        const jobData: SimulationJobData = {
            userId,
            examType: params.examType,
            simulationRuns: params.simulationRuns,
            seed: params.seed,
            assumptions: params.assumptions,
            subjects,
        };

        const job = await this.queue.add("simulate", jobData, {
            removeOnComplete: 100,
            removeOnFail: 50,
        });

        // Wait up to 30s for the worker to finish; fall back to inline if timeout
        try {
            const result = await job.waitUntilFinished(this.events, 30000);
            return result as LearningPace[];
        } catch (_err) {
            console.warn(`[SimulationService] waitUntilFinished timed out — running chunked inline fallback`);
            // Yield to the event loop between subjects so the Express thread
            // is not monopolised when Redis/BullMQ is unavailable.
            const results: LearningPace[] = [];
            for (const subject of subjects) {
                results.push(simulateSubject(subject, params));
                await new Promise<void>(resolve => setImmediate(resolve));
            }
            await setAnalyticsCache(userId, "predictive", results, params.examType, 900);
            return results;
        }
    }

    async close(): Promise<void> {
        await this.worker.close();
        await this.queue.close();
        await this.events.close();
        console.log("🔌 Simulation BullMQ Worker closed");
    }
}

// ── Mock implementation (dev without Redis) ────────────────────────────

class MockSimulationService {
    constructor() {
        console.log("⚠️  Using MOCK Simulation Service — runs inline (set QUEUE_ENABLED=true for BullMQ)");
    }

    async run(_userId: string, subjects: SubjectSimulationInput[], params: SimulationParams): Promise<LearningPace[]> {
        return simulateAllSubjects(subjects, params);
    }

    async close(): Promise<void> {
        // no-op
    }
}

// ── Singleton ──────────────────────────────────────────────────────────

type SimulationServiceInterface = RealSimulationService | MockSimulationService;

export const simulationService: SimulationServiceInterface = QUEUE_ENABLED
    ? new RealSimulationService()
    : new MockSimulationService();

export async function shutdownSimulationService(): Promise<void> {
    console.log("🔄 Shutting down Simulation BullMQ service...");
    await simulationService.close();
}
