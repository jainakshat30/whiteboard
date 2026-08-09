import { ILayoutStrategy } from './ILayoutStrategy';

export class HorizontalFlowStrategy implements ILayoutStrategy {
  getAlgorithm(): string {
    return 'layered';
  }

  applyAlgorithmSpecificOptions(engineOptions: Record<string, any>): void {
    engineOptions['elk.algorithm'] = 'layered';
    engineOptions['elk.edgeRouting'] = 'ORTHOGONAL';
    engineOptions['elk.layered.crossingMinimization.forceNodeModelOrder'] = 'true';
    if (!engineOptions['elk.direction']) {
      engineOptions['elk.direction'] = 'RIGHT';
    }
  }
}
