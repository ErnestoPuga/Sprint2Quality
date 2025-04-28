import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Ticket from '../components/Ticket';

vi.mock('../components/PopUpTicket', () => ({
  default: ({ isOpen, onClose, title, status, onStatusChange }) => 
    isOpen ? (
      <div data-testid="popup-modal">
        <h2>{title}</h2>
        <div>Status: {status}</div>
        <button onClick={() => onStatusChange('Finished')}>Mark as Finished</button>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
}));

describe('Ticket Component', () => {
  const defaultProps = {
    title: 'Implementar login',
    publishedDate: '2024-03-15',
    status: 'To-do',
    priority: 'High',
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
    // Verifica que el texto completo aparezca
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Implementar sistema de autenticación con JWT')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('aplica las clases CSS correctas según el estado', () => {
    const { container } = render(<Ticket {...defaultProps} status="To-do" />);
    
    // Busca el elemento que contiene el texto "To-do"
    const statusElement = screen.getByText('To-do');
    expect(statusElement.className).toContain('bg-gray-200');
    
    // Otra opción es buscar por selector CSS
    const statusSpans = container.querySelectorAll('span');
    const statusSpan = Array.from(statusSpans).find(span => span.textContent === 'To-do');
    
    if (statusSpan) {
      expect(statusSpan.className).toContain('bg-gray-200');
      expect(statusSpan.className).toContain('text-gray-800');
    }
  });

  it('abre el modal al hacer click en el botón Details', async () => {
    const user = userEvent.setup();
    render(<Ticket {...defaultProps} />);
    
    // Buscar el botón por texto
    const detailsButton = screen.getByText('Details');
    await user.click(detailsButton);
    
    // Verifica si el PopUpTicket recibe isOpen=true
    // Como el componente está mockeado, podemos verificar
    // si se renderizó el contenido del mock
    expect(screen.getByTestId('popup-modal')).toBeInTheDocument();
  });
});