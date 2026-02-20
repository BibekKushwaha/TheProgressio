import 'dotenv/config';
import { emitPushEvent } from './src/services/queue.service.js';
import { initPushWorker } from './src/workers/push.worker.js';
import { shutdownProducer } from './src/services/queue.service.js';

async function run() {
    console.log("Starting test...");
    const worker = initPushWorker();
    
    // Simulate concurrent rapid pushes (deduplication should catch them)
    // The dedupeKey is identical
    const dedupeKey = "test-dedupe-123";
    console.log("Emitting 3 identical pushes...");
    await Promise.all([
        emitPushEvent({ userId: "test-user", title: "Test 1", body: "Hello", dedupeKey }),
        emitPushEvent({ userId: "test-user", title: "Test 1", body: "Hello", dedupeKey }),
        emitPushEvent({ userId: "test-user", title: "Test 1", body: "Hello", dedupeKey })
    ]);

    // Wait a bit to observe worker
    await new Promise(res => setTimeout(res, 3000));
    
    if (worker) await worker.close();
    await shutdownProducer();
    console.log("Done.");
}

run();
