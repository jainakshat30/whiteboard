import { ILayoutStrategy } from './ILayoutStrategy';

export class TreeLayoutStrategy implements ILayoutStrategy {
  getAlgorithm(): string {
    return 'mrtree';
  }

  applyAlgorithmSpecificOptions(engineOptions: Record<string, any>): void {
    engineOptions['elk.algorithm'] = 'mrtree';
    if (!engineOptions['elk.direction']) {
      engineOptions['elk.direction'] = 'DOWN';
    }
  }
}
