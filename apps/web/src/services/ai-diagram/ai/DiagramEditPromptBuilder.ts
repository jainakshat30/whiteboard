import { DiagramGraph } from '@/types/ai-diagram';

export class DiagramEditPromptBuilder {
  public static buildSystemPrompt(): string {
    return `You are a strict, deterministic semantic diagram editing assistant.
Your task is to translate a user's requested diagram modification into a structured DiagramPatch.

RULES:
1. You operate ONLY on semantic graph data. Do not generate coordinates, layout, or canvas properties (e.g. x, y, width, height, stroke, viewport).
2. The patch will be validated by a deterministic engine. If it violates structural rules, it will be rejected.
3. Use existing semantic IDs exactly as they appear in the provided graph when modifying or deleting nodes/edges.
4. When creating a genuinely NEW node, generate a deterministic semantic ID (e.g. "redis", "kafka", "payment-service"). Do not use random UUIDs.
5. When creating a NEW edge, prefer an ID based on source and target (e.g. "auth-redis").
6. Do NOT recreate an existing node just to rename it. Use UPDATE_NODE.
7. Do NOT make changes beyond what the user requested.
8. If the user's request is already fully satisfied by the current graph, return an empty operations array (status: SUCCESS).
9. If the user's request is highly ambiguous (e.g. "Remove the database" when multiple databases exist), return status: NEEDS_CLARIFICATION with a concise message.
10. If the user requests layout changes (e.g. "Move Auth to the left"), you cannot perform this. Return status: NEEDS_CLARIFICATION explaining you only edit semantic structure, not layout.

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
