import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Ticket from '../components/Ticket'; 
// Mock del componente PopUpTicket
vi.mock('./PopUpTicket', () => ({
  default: ({ isOpen, onClose, title, status, onStatusChange }) => 
    isOpen ? (
      <div data-testid="popup-modal">
        <h2>{title}</h2>
        <div>Current Status: {status}</div>
        <button onClick={() => onStatusChange('Finished')}>Mark as Finished</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

describe('Ticket Component', () => {
  const defaultProps = {
    title: 'Implementar login',
    publishedDate: '2024-03-15',
    status: 'To-do' as 'To-do' | 'In Progress' | 'Finished',
    priority: 'High' as 'Low' | 'Mid' | 'High',
    description: 'Implementar sistema de autenticación con JWT',
    user: 'John Doe',
    estimatedTime: '8h',
    realHours: '10h'
  };

  it('renderiza correctamente con todas las props', () => {
    render(<Ticket {...defaultProps} />);
    
    expect(screen.getByText('Implementar login')).toBeInTheDocument();
    expect(screen.getByText('2024-03-15')).toBeInTheDocument();
    expect(screen.getByText('To-do')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Implementar sistema de autenticación con JWT')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('aplica las clases CSS correctas según el estado', () => {
    const { rerender } = render(<Ticket {...defaultProps} status="To-do" />);
    let statusElement = screen.getByText('To-do');
    expect(statusElement.className).toContain('bg-gray-200');
    expect(statusElement.className).toContain('text-gray-800');
    
    rerender(<Ticket {...defaultProps} status="In Progress" />);
    statusElement = screen.getByText('In Progress');
    expect(statusElement.className).toContain('bg-yellow-200');
    expect(statusElement.className).toContain('text-yellow-800');
    
    rerender(<Ticket {...defaultProps} status="Finished" />);
    statusElement = screen.getByText('Finished');
    expect(statusElement.className).toContain('bg-green-200');
    expect(statusElement.className).toContain('text-green-800');
  });

  it('aplica las clases CSS correctas según la prioridad', () => {
    const { rerender } = render(<Ticket {...defaultProps} priority="Low" />);
    let priorityElement = screen.getByText('Low Priority');
    expect(priorityElement.className).toContain('text-green-600');
    
    rerender(<Ticket {...defaultProps} priority="Mid" />);
    priorityElement = screen.getByText('Mid Priority');
    expect(priorityElement.className).toContain('text-orange-600');
    
    rerender(<Ticket {...defaultProps} priority="High" />);
    priorityElement = screen.getByText('High Priority');
    expect(priorityElement.className).toContain('text-red-600');
    expect(priorityElement.className).toContain('font-bold');
  });

  it('se aplican estilos especiales cuando isMain es true', () => {
    const { container } = render(<Ticket {...defaultProps} isMain={true} />);
    
    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('min-h-70');
    expect(mainDiv.className).toContain('min-w-70');
    
    const image = screen.getByAltText('ChitChat Logo');
    expect(image.className).toContain('min-h-50');
    expect(image.className).toContain('min-w-50');
  });

  it('abre el modal al hacer click en el botón Details', async () => {
    const user = userEvent.setup();
    render(<Ticket {...defaultProps} />);
    
    const detailsButton = screen.getByText('Details');
    await user.click(detailsButton);
    
    // Verificar que el modal está abierto
    expect(screen.getByTestId('popup-modal')).toBeInTheDocument();
    expect(screen.getByText('Current Status: To-do')).toBeInTheDocument();
  });

  it('actualiza el estado del ticket cuando cambia en el modal', async () => {
    const user = userEvent.setup();
    render(<Ticket {...defaultProps} />);
    
    // Abrir el modal
    const detailsButton = screen.getByText('Details');
    await user.click(detailsButton);
    
    // Cambiar el estado a "Finished"
    const finishButton = screen.getByText('Mark as Finished');
    await user.click(finishButton);
    
    // Verificar que el estado se actualizó en el ticket
    const statusElement = screen.getByText('Finished');
    expect(statusElement.className).toContain('bg-green-200');
    expect(statusElement.className).toContain('text-green-800');
  });

  it('cierra el modal al hacer click en el botón Close', async () => {
    const user = userEvent.setup();
    render(<Ticket {...defaultProps} />);
    
    // Abrir el modal
    const detailsButton = screen.getByText('Details');
    await user.click(detailsButton);
    
    // Verificar que el modal está abierto
    expect(screen.getByTestId('popup-modal')).toBeInTheDocument();
    
    // Cerrar el modal
    const closeButton = screen.getByText('Close Modal');
    await user.click(closeButton);
    
    // Verificar que el modal se cerró
    expect(screen.queryByTestId('popup-modal')).not.toBeInTheDocument();
  });

  it('coincide con el snapshot', () => {
    const { container } = render(<Ticket {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });
});