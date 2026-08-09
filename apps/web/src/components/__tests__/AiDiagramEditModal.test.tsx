// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiDiagramEditModal } from '../AiDiagramEditModal';
import { useAiDiagramEditor } from '../../hooks/useAiDiagramEditor';

// Mock the hook
vi.mock('../../hooks/useAiDiagramEditor', () => ({
  useAiDiagramEditor: vi.fn()
}));

describe('AiDiagramEditModal', () => {
  const mockEditDiagram = vi.fn();
  const mockClearError = vi.fn();
  const mockClearClarification = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAiDiagramEditor as any).mockReturnValue({
      isEditing: false,
      error: null,
      clarification: null,
      editDiagram: mockEditDiagram,
      clearError: mockClearError,
      clearClarification: mockClearClarification,
    });
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AiDiagramEditModal isOpen={false} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correctly when isOpen is true', () => {
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Edit Diagram with AI')).toBeTruthy();
    expect(screen.getByPlaceholderText(/Add Redis/i)).toBeTruthy();
  });

  it('calls onClose when clicking the close button', () => {
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables apply button when instruction is empty', () => {
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const applyButton = screen.getByText('Apply Changes');
    expect((applyButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables apply button when instruction has text', () => {
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const textarea = screen.getByPlaceholderText(/Add Redis/i);
    fireEvent.change(textarea, { target: { value: 'Add a cache' } });
    
    const applyButton = screen.getByText('Apply Changes');
    expect((applyButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls editDiagram and onClose on apply success', async () => {
    mockEditDiagram.mockResolvedValue(true);
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const textarea = screen.getByPlaceholderText(/Add Redis/i);
    fireEvent.change(textarea, { target: { value: 'Add a cache' } });
    
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);
    
    expect(mockEditDiagram).toHaveBeenCalledWith('Add a cache');
    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it('does not call onClose if editDiagram returns false', async () => {
    mockEditDiagram.mockResolvedValue(false);
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    const textarea = screen.getByPlaceholderText(/Add Redis/i);
    fireEvent.change(textarea, { target: { value: 'Add a cache' } });
    
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);
    
    expect(mockEditDiagram).toHaveBeenCalledWith('Add a cache');
    await waitFor(() => expect(mockOnClose).not.toHaveBeenCalled());
  });

  it('shows loading state when isEditing is true', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      isEditing: true,
      error: null,
      clarification: null,
      editDiagram: mockEditDiagram,
      clearError: mockClearError,
      clearClarification: mockClearClarification,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Applying changes...')).toBeTruthy();
    
    const textarea = screen.getByPlaceholderText(/Add Redis/i);
    expect((textarea as HTMLTextAreaElement).disabled).toBe(true);
  });

  it('displays error message if error is present', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      isEditing: false,
      error: 'Failed to update diagram.',
      clarification: null,
      editDiagram: mockEditDiagram,
      clearError: mockClearError,
      clearClarification: mockClearClarification,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Failed to update diagram.')).toBeTruthy();
  });

  it('displays clarification message if clarification is present', () => {
    (useAiDiagramEditor as any).mockReturnValue({
      isEditing: false,
      error: null,
      clarification: 'Which node do you mean?',
      editDiagram: mockEditDiagram,
      clearError: mockClearError,
      clearClarification: mockClearClarification,
    });
    
    render(<AiDiagramEditModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Which node do you mean?')).toBeTruthy();
  });
});
