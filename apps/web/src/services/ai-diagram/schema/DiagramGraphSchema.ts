import { z } from 'zod';
import { DiagramType } from '@/types/ai-diagram';

// Valid DiagramTypes based on our canonical definition
const DiagramTypeEnum = z.enum([
  'FLOWCHART',
  'MINDMAP',
  'ER_DIAGRAM',
  'SEQUENCE_DIAGRAM',
  'UML',
  'NETWORK_GRAPH'
]);

export const NodeSchema = z.object({
  id: z.string().min(1, 'Node ID cannot be empty'),
  label: z.string().default(''),
  type: z.string().min(1, 'Node type cannot be empty'),
  metadata: z.record(z.string(), z.any()).optional(),
  children: z.array(z.string()).optional()
}).strict();

export const EdgeSchema = z.object({
  id: z.string().min(1, 'Edge ID cannot be empty'),
  source: z.string().min(1, 'Edge source cannot be empty'),
  target: z.string().min(1, 'Edge target cannot be empty'),
  label: z.string().optional(),
  type: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  routing: z.enum(['straight', 'orthogonal', 'curved', 'manhattan', 'spline']).optional()
}).strict();

/**
 * The expected structure returned by the LLM
 */
export const LlmDiagramResponseSchema = z.object({
  type: DiagramTypeEnum,
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  metadata: z.record(z.string(), z.any()).optional().default({})
}).strict();

export type LlmDiagramResponse = z.infer<typeof LlmDiagramResponseSchema>;

/**
 * Request schema for the diagram generation API
 */
export const GenerateDiagramRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(2000, 'Prompt too long'),
  diagramType: DiagramTypeEnum
});

export type GenerateDiagramRequest = z.infer<typeof GenerateDiagramRequestSchema>;
