/**
 * Interface representing a layout configuration strategy.
 * Separates the "how to position" from the "math of positioning".
 * Strategies only describe algorithmic behavior, while configuration
 * (spacing, alignment) is passed to the engine.
 */
export interface ILayoutStrategy {
  /**
   * Returns a unique identifier or algorithm name for this strategy.
   * e.g., 'layered', 'force', 'mrtree'
   */
  getAlgorithm(): string;

  /**
   * Applies any algorithm-specific options to the provided options object.
   * @param engineOptions The configuration object to mutate or extend.
   */
  applyAlgorithmSpecificOptions(engineOptions: Record<string, any>): void;
}
