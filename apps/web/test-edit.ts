import { DiagramPatchGenerator } from './src/services/ai-diagram/ai/DiagramPatchGenerator';
import { GeminiProvider } from './src/services/ai-diagram/providers/GeminiProvider';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
  const provider = new GeminiProvider(process.env.GEMINI_API_KEY!);
  const generator = new DiagramPatchGenerator(provider);

  const graph = {
    type: "FLOWCHART",
    nodes: [
      { id: "api-gateway", label: "API Gateway", type: "process" },
      { id: "auth", label: "Auth", type: "process" },
      { id: "order", label: "Order", type: "process" },
      { id: "payment", label: "Payment", type: "process" },
      { id: "notification", label: "Notification", type: "process" },
      { id: "postgresql", label: "PostgreSQL", type: "database" },
      { id: "redis", label: "Redis", type: "database" },
      { id: "kafka", label: "Kafka", type: "database" }
    ],
    edges: []
  };

  try {
    const res = await generator.generatePatch(graph as any, "Rename Auth to Authentication Service");
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

main();
