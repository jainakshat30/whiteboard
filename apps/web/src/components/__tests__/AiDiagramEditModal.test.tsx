// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiDiagramEditModal } from '../AiDiagramEditModal';
import { useAiDiagramEditor } from '../../hooks/useAiDiagramEditor';
import { PreparedDiagramEdit } from '@/services/ai-diagram/editor/DiagramEditService';

// Mock the hook
vi.mock('../../hooks/useAiDiagramEditor', () => ({
  useAiDiagramEditor: vi.fn()
}));

const mockPreparedEdit: PreparedDiagramEdit = {
  diagramId: 'test-diagram',
  patch: { operations: [] },
  originalGraph: { type: 'FLOWCHART', nodes: [], edges: [], metadata: {} },
  preview: {
    additions: [
      { kind: 'ADD_NODE', nodeId: 'redis', label: 'Redis', nodeType: 'database' }
    ],
    removals: [
      { kind: 'REMOVE_NODE', nodeId: 'auth', label: 'Auth Service' }
    ],
    updates: [],
    connectionChanges: [],
    totalChanges: 2
  }
};

describe('AiDiagramEditModal (Phase 6.7)', () => {
  const mockPrepareEdit = vi.fn();
  const mockApplyEdit = vi.fn();
  const mockClearEdit = vi.fn();
  const mockClearError = vi.fn();
  const mockClearClarification = vi.fn();
  const mockOnClose = vi.fn();

  const defaultMockReturn = {
    isGenerating: false,
    isApplying: false,
    error: null,
    clarification: null,
    preparedEdit: null,
    prepareEdit: mockPrepareEdit,
    applyEdit: mockApplyEdit,
    clearEdit: mockClearEdit,
    clearError: mockClearError,
    clearClarification: mockClearClarification,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAiDiagramEditor as any).mockReturnValue(defaultMockReturn);
  });

  it('renders correctly for instruction input initially', () => {
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Edit Diagram with AI')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Add Redis/i)).toBeTruthy();
  });

  it('calls prepareEdit on generate click', async () => {
    mockPrepareEdit.mockResolvedValue(true);
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const textarea = screen.getByPlaceholderText(/Add Redis/i);
    fireEvent.change(textarea, { target: { value: 'Add a cache' } });
    
    const generateBtn = screen.getByText('Generate Changes');
    fireEvent.click(generateBtn);
    
    expect(mockPrepareEdit).toHaveBeenCalledWith('Add a cache');
  });

  it('shows generating state', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      isGenerating: true,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('✨ Analyzing your diagram...')).toBeTruthy();
  });

  it('displays correct changes in preview state', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: mockPreparedEdit,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Review AI Changes')).toBeTruthy();
    expect(screen.getByText('Review the proposed changes before applying them.')).toBeTruthy();
    
    // Additions
    expect(screen.getByText('Add node "Redis"')).toBeTruthy();
    // Removals
    expect(screen.getByText('Remove node "Auth Service"')).toBeTruthy();
  });

  it('calls clearEdit on cancel when in preview state', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: mockPreparedEdit,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockClearEdit).toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled(); // Just clears edit to go back to prompt
  });

  it('calls applyEdit on apply success', async () => {
    mockApplyEdit.mockResolvedValue(true);
    
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: mockPreparedEdit,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const applyBtn = screen.getByText('Apply Changes');
    fireEvent.click(applyBtn);
    
    expect(mockApplyEdit).toHaveBeenCalled();
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('disables apply if applyEdit returns false (e.g. failure)', async () => {
    mockApplyEdit.mockResolvedValue(false);
    
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: mockPreparedEdit,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const applyBtn = screen.getByText('Apply Changes');
    fireEvent.click(applyBtn);
    
    expect(mockApplyEdit).toHaveBeenCalled();
    await waitFor(() => expect(mockOnClose).not.toHaveBeenCalled());
  });

  it('disables apply button when applying state is active', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: mockPreparedEdit,
      isApplying: true,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Applying changes...')).toBeTruthy();
    const applyBtn = screen.getByText('Applying changes...');
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables apply button when no changes are needed (no-op)', () => {
    const noOpPreview: PreparedDiagramEdit = {
      ...mockPreparedEdit,
      preview: {
        additions: [], removals: [], updates: [], connectionChanges: [], totalChanges: 0
      }
    };
    
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      preparedEdit: noOpPreview,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('No changes are needed.')).toBeTruthy();
    const applyBtn = screen.getByText('Apply Changes');
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('displays error message if error is present', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      error: 'Failed to update diagram.',
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Failed to update diagram.')).toBeTruthy();
  });

  it('displays clarification message if clarification is present', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      ...defaultMockReturn,
      clarification: 'Which node do you mean?',
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Which node do you mean?')).toBeTruthy();
  });
});
