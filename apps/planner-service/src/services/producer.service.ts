
// Mock implementation of Kafka Producer to avoid connection errors during development
// This replaces the real KafkaJS implementation

export class KafkaProducer {
    private isConnected: boolean = false;

    constructor() {
        console.log("⚠️ Using MOCK Kafka Producer. Messages will not be sent to a real broker.");
    }

    async connect() {
        this.isConnected = true;
        console.log("[MockProducer] Connected (Virtual).");
    }

    async send(topic: string, messages: any[]) {
        if (!this.isConnected) {
            await this.connect();
        }
        console.log(`[MockProducer] 📨 Sending to '${topic}':`);
        messages.forEach(msg => console.log(`  - ${JSON.stringify(msg)}`));
    }

    async disconnect() {
        this.isConnected = false;
        console.log("[MockProducer] Disconnected.");
    }
}

export const producer = new KafkaProducer();
