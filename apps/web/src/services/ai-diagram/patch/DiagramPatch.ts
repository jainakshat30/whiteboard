import { z } from 'zod';
import { NodeSchema, EdgeSchema } from '../schema/DiagramGraphSchema';

export const AddNodeOperationSchema = z.object({
  op: z.literal('ADD_NODE'),
  node: NodeSchema.omit({ children: true })
});

export const RemoveNodeOperationSchema = z.object({
  op: z.literal('REMOVE_NODE'),
  nodeId: z.string().min(1, "Node ID cannot be empty")
});

export const UpdateNodeOperationSchema = z.object({
  op: z.literal('UPDATE_NODE'),
  nodeId: z.string().min(1, "Node ID cannot be empty"),
  changes: z.object({
    label: z.string().optional(),
    type: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).refine(data => Object.keys(data).length > 0, "Update changes cannot be empty")
});

export const AddEdgeOperationSchema = z.object({
  op: z.literal('ADD_EDGE'),
  edge: EdgeSchema.omit({ routing: true })
});

export const RemoveEdgeOperationSchema = z.object({
  op: z.literal('REMOVE_EDGE'),
  edgeId: z.string().min(1, "Edge ID cannot be empty")
});

export const UpdateEdgeOperationSchema = z.object({
  op: z.literal('UPDATE_EDGE'),
  edgeId: z.string().min(1, "Edge ID cannot be empty"),
  changes: z.object({
    label: z.string().optional(),
    type: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).refine(data => Object.keys(data).length > 0, "Update changes cannot be empty")
});

export const DiagramPatchOperationSchema = z.discriminatedUnion('op', [
  AddNodeOperationSchema,
  RemoveNodeOperationSchema,
  UpdateNodeOperationSchema,
  AddEdgeOperationSchema,
  RemoveEdgeOperationSchema,
  UpdateEdgeOperationSchema
]);

const MAX_PATCH_OPERATIONS = 100;

export const DiagramPatchSchema = z.object({
  operations: z.array(DiagramPatchOperationSchema)
    .max(MAX_PATCH_OPERATIONS, `A patch cannot exceed ${MAX_PATCH_OPERATIONS} operations`),
  metadata: z.record(z.string(), z.any()).optional()
});

export type AddNodeOperation = z.infer<typeof AddNodeOperationSchema>;
export type RemoveNodeOperation = z.infer<typeof RemoveNodeOperationSchema>;
export type UpdateNodeOperation = z.infer<typeof UpdateNodeOperationSchema>;
export type AddEdgeOperation = z.infer<typeof AddEdgeOperationSchema>;
export type RemoveEdgeOperation = z.infer<typeof RemoveEdgeOperationSchema>;
export type UpdateEdgeOperation = z.infer<typeof UpdateEdgeOperationSchema>;

export type DiagramPatchOperation = z.infer<typeof DiagramPatchOperationSchema>;
export type DiagramPatch = z.infer<typeof DiagramPatchSchema>;
