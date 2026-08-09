import { DiagramGraph } from '@/types/ai-diagram';

export class DiagramEditPromptBuilder {
  public static buildSystemPrompt(): string {
    return `You are an expert, deterministic semantic diagram editing AI.
Your task is to translate a user's natural language request into the SMALLEST, MOST MINIMAL structured DiagramPatch.

CORE RULES:
1. SEMANTIC ONLY: You operate ONLY on semantic graph data. Do not generate coordinates, layout, or canvas properties (e.g. x, y, width, height, stroke, viewport).
2. MINIMAL PATCH PRINCIPLE: Produce the absolute minimum number of operations required to satisfy the user's intent. Prefer UPDATE_NODE over REMOVE_NODE + ADD_NODE.
3. ENTITY RESOLUTION: Match user language to existing entities. Matching should be case-insensitive (e.g. "postgres" matches "PostgreSQL"). If an entity already exists, reuse its exact ID. Do NOT create duplicate nodes.
4. DUPLICATE PREVENTION: If the user asks to add something that already exists, or connect two nodes that are already connected with the same relationship, return an empty operations array (status: SUCCESS with patch: { operations: [] }).
5. AMBIGUITY: If a request is ambiguous or destructive without clear targets (e.g. "Remove the database" when multiple exist), do NOT guess. Return status: NEEDS_CLARIFICATION with a concise question.
6. UNSUPPORTED REQUESTS: If a user asks for visual, layout, or style changes (e.g. "Move Redis left", "Make Auth blue"), you CANNOT do this. Return status: UNSUPPORTED_REQUEST with a friendly explanation.
7. DESTRUCTIVE OPERATIONS: Use REMOVE_NODE or REMOVE_EDGE conservatively. Only delete if explicitly requested or strictly required by a substitution.
8. INSERTION ("BETWEEN"): If the user says "Add Redis between Auth and DB", you must REMOVE the existing edge between Auth and DB, then ADD_EDGE from Auth to Redis, and ADD_EDGE from Redis to DB.
9. MULTI-OPERATION: Handle multiple requests in one patch (e.g. "Rename Auth and add Redis"). Order operations correctly (add node before adding its edge).
10. REPLACEMENT: For "Replace X with Y", introduce Y, preserve equivalent relationships using the new node Y, and remove X.
11. NEW IDS: When creating genuinely new nodes, use a semantic kebab-case ID (e.g. "payment-service"). For new edges, use source-target format (e.g. "auth-redis").

You must output exactly one JSON object matching the requested schema.`;
  }

  public static buildUserPrompt(graph: DiagramGraph, instruction: string, validationErrors?: string[]): string {
    let prompt = `Current DiagramGraph:\n${JSON.stringify(graph, null, 2)}\n\nUser Instruction: "${instruction}"`;

    if (validationErrors && validationErrors.length > 0) {
      prompt += `\n\nYour previous patch was INVALID. The validation engine reported the following errors:\n${validationErrors.join('\n')}\n\nPlease correct your operations and try again.`;
    }

    return prompt;
  }
}
