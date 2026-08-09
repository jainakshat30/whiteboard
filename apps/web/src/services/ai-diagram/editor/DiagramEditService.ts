import { Element } from '@/types/elements';
import { IAIProvider } from '../providers/IAIProvider';
import { DiagramStateExtractor } from '../extractor/DiagramStateExtractor';
import { DiagramPatchGenerator } from '../ai/DiagramPatchGenerator';
import { DiagramPatchEngine } from '../patch/DiagramPatchEngine';
import { LayoutFactory } from '../layout/LayoutFactory';
import { DiagramCanvasIntegration } from '../integration/DiagramCanvasIntegration';

export class ClarificationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClarificationRequiredError';
  }
}

export class DiagramEditService {
  /**
   * Orchestrates the complete end-to-end AI editing flow.
   * - Extracts current graph
   * - Queries AI for patch
   * - Validates patch
   * - Applies patch in memory
   * - Layouts updated graph
   * - Maps to native elements
   * - Replaces diagram atomically in whiteboard
   *
   * @param diagramId The target diagram to edit
   * @param instruction Natural language instruction from user
   * @param allElements All current elements on the whiteboard
   * @param aiProvider The provider abstraction (e.g. GeminiProvider)
   * @returns The newly updated elements (if successful)
   * @throws Error if any stage fails (graph unchanged)
   */
  public static async editDiagram(
    diagramId: string,
    instruction: string,
    allElements: Element[],
    aiProvider: IAIProvider
  ): Promise<Element[]> {
    if (!diagramId) {
      throw new Error('DiagramEditService: No diagram selected for editing.');
    }

    if (!instruction || instruction.trim().length === 0) {
      throw new Error('DiagramEditService: Instruction cannot be empty.');
    }

    // 1. Extract Current Graph (Semantic Layer)
    const existingDiagramElements = allElements.filter(el => el.metadata?.diagramId === diagramId);
    if (existingDiagramElements.length === 0) {
      throw new Error('DiagramEditService: Diagram not found on the board.');
    }

    const currentGraph = DiagramStateExtractor.extractDiagram(existingDiagramElements, diagramId);

    // 2. Generate Semantic Patch
    const generator = new DiagramPatchGenerator(aiProvider);
    const editResponse = await generator.generatePatch(currentGraph, instruction);

    if (editResponse.status === 'NEEDS_CLARIFICATION') {
      throw new ClarificationRequiredError(editResponse.message);
    }

    const patch = editResponse.patch;

    // 3. Apply Patch Deterministically
    // If this fails, it throws and execution halts, keeping the whiteboard safe.
    const updatedGraph = DiagramPatchEngine.apply(currentGraph, patch);

    // 4. Layout Updated Graph
    const layoutEngine = LayoutFactory.getLayout(updatedGraph.type);
    const positionedGraph = await layoutEngine.layout(updatedGraph);

    // 5. Map & Atomic Whiteboard Update
    const newElements = DiagramCanvasIntegration.updateDiagram(positionedGraph, diagramId, existingDiagramElements);

    return newElements;
  }
}
