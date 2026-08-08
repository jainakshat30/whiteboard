import { PositionedGraph } from '../../../types/ai-diagram';

/**
 * Interface representing a cache for layout results.
 * Allows the layout engine to avoid recomputing layouts for unchanged graphs.
 */
export interface ILayoutCache {
  /**
   * Retrieves a cached layout by its graph hash.
   * @param graphHash A unique hash representing the current state of the diagram graph.
   * @returns The cached PositionedGraph, or null if no cache exists.
   */
  get(graphHash: string): PositionedGraph | null;

  /**
   * Stores a layout result in the cache.
   * @param graphHash A unique hash representing the state of the diagram graph.
   * @param result The computed PositionedGraph to cache.
   */
  set(graphHash: string, result: PositionedGraph): void;
}
