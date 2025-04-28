import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateTeamModal from '../components/CreateTeamModal';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock Server para simular la creación de equipo
const server = setupServer(
  rest.post('/teams/create', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        message: 'Team created successfully'
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CreateTeamModal - Form Testing', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onTeamCreated: vi.fn(),
    token: 'mock-jwt-token'
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test del formulario con user events
  it('maneja correctamente el envío del formulario con datos válidos', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    // Llenar el formulario
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, 'Frontend Team');
    
    // Enviar formulario
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    // Verificar que se llamaron las funciones correspondientes
    await waitFor(() => {
      expect(mockProps.onTeamCreated).toHaveBeenCalled();
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  // Test de validación de formulario
  it('muestra errores de validación cuando el campo está vacío', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    // Intentar enviar formulario sin llenar campos
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    // Verificar mensaje de error
    await waitFor(() => {
      expect(screen.getByText('Team name is required')).toBeInTheDocument();
    });
    
    // Verificar que no se llamaron las funciones
    expect(mockProps.onTeamCreated).not.toHaveBeenCalled();
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  // Test de datos dinámicos
  it('genera datos de prueba dinámicos para el formulario', async () => {
    const user = userEvent.setup();
    
    // Generar datos de prueba dinámicos
    const dynamicTeamName = `Team-${Math.random().toString(36).substring(7)}`;
    
    render(<CreateTeamModal {...mockProps} />);
    
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, dynamicTeamName);
    
    // Verificar que el valor se actualiza correctamente
    expect(teamNameInput).toHaveValue(dynamicTeamName);
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onTeamCreated).toHaveBeenCalled();
    });
  });

  // Test de manejo de errores del servidor
  it('maneja errores del servidor correctamente', async () => {
    // Configurar el servidor para responder con error
    server.use(
      rest.post('/teams/create', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, 'New Team');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    // Verificar mensaje de error
    await waitFor(() => {
      expect(screen.getByText('Error creating team')).toBeInTheDocument();
    });
    
    // Verificar que no se llamó onTeamCreated ni onClose
    expect(mockProps.onTeamCreated).not.toHaveBeenCalled();
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  // Test de estado de carga
  it('muestra estado de carga durante la creación', async () => {
    // Configurar delay en la respuesta del servidor
    server.use(
      rest.post('/teams/create', async (req, res, ctx) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return res(ctx.status(201));
      })
    );
    
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, 'New Team');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    // Verificar que el botón muestra "Creating..."
    expect(submitButton).toHaveTextContent('Creating...');
    expect(submitButton).toBeDisabled();
    
    // Esperar a que termine la operación
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Create');
      expect(submitButton).not.toBeDisabled();
    });
  });

  // Test de cierre del modal
  it('cierra el modal cuando se hace click en cancelar', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  // Test que el modal no se renderiza cuando isOpen es false
  it('no renderiza el modal cuando isOpen es false', () => {
    render(<CreateTeamModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Create New Team')).not.toBeInTheDocument();
  });

  // Snapshot test
  it('coincide con el snapshot', () => {
    const { container } = render(<CreateTeamModal {...mockProps} />);
    expect(container).toMatchSnapshot();
  });

  // Test de limpieza de campo después de crear
  it('limpia el campo de entrada después de una creación exitosa', async () => {
    const user = userEvent.setup();
    render(<CreateTeamModal {...mockProps} />);
    
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, 'Test Team');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    // Esperar a que se complete la operación
    await waitFor(() => {
      expect(mockProps.onTeamCreated).toHaveBeenCalled();
    });
    
    // El input debe estar vacío (aunque el modal se cierra, probamos que el estado se limpió)
    expect(teamNameInput).toHaveValue('');
  });

  // Test de formato de solicitud HTTP
  it('envía la solicitud HTTP con los headers y body correctos', async () => {
    const user = userEvent.setup();
    let capturedRequest: any = null;
    
    server.use(
      rest.post('/teams/create', async (req, res, ctx) => {
        capturedRequest = {
          headers: req.headers,
          body: await req.json()
        };
        return res(ctx.status(201));
      })
    );
    
    render(<CreateTeamModal {...mockProps} />);
    
    const teamNameInput = screen.getByPlaceholderText('Team name');
    await user.type(teamNameInput, 'Test Team');
    
    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest.headers.get('content-type')).toBe('application/json');
      expect(capturedRequest.headers.get('authorization')).toBe('Bearer mock-jwt-token');
      expect(capturedRequest.body).toEqual({ teamName: 'Test Team' });
    });
  });
});