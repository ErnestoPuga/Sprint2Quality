import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardManager from '../views/DashboardManager';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock de componentes hijos para simplificar las pruebas
vi.mock('../components/Navbar', () => ({
  default: ({ pageTitle }: { pageTitle: string }) => <div data-testid="navbar">Navbar - {pageTitle}</div>
}));

vi.mock('../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

vi.mock('../components/TeamCard', () => ({
  default: ({ team, teamId, onDelete }: any) => (
    <div data-testid={`team-card-${teamId}`}>
      <span>{team}</span>
      <button onClick={() => onDelete(teamId)}>Delete Team</button>
    </div>
  )
}));

vi.mock('../components/Ticket', () => ({
  default: ({ title, status, priority, description }: any) => (
    <div data-testid="ticket">
      <h3>{title}</h3>
      <span data-testid="ticket-status">{status}</span>
      <span data-testid="ticket-priority">{priority}</span>
      <p>{description}</p>
    </div>
  )
}));

vi.mock('../components/CreateTeamModal', () => ({
  default: ({ isOpen, onClose, onTeamCreated }: any) => 
    isOpen ? (
      <div data-testid="create-team-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => {
          onTeamCreated();
          onClose();
        }}>Create Team</button>
      </div>
    ) : null
}));

// Mock del JWT token
const mockJwtToken = "mock-jwt-token";

// Mock Server Worker para simular peticiones HTTP
const server = setupServer(
  // Mock de obtener equipos
  rest.get('/teams/myteams', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          team_id: 1,
          team_name: 'Frontend Team',
          created_at: '2024-03-15'
        },
        {
          team_id: 2,
          team_name: 'Backend Team',
          created_at: '2024-03-16'
        }
      ])
    );
  }),
  
  // Mock de obtener tickets/tareas
  rest.get('/tasks/all', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          taskId: 1,
          title: 'Implementar login',
          description: 'Crear formulario de inicio de sesión',
          priority: 'High',
          status: 'InProgress',
          estimatedDeadline: '2024-03-20',
          realDeadline: '2024-03-21',
          estimatedHours: '8',
          realHours: null,
          user_points: 5
        },
        {
          taskId: 2,
          title: 'Crear dashboard',
          description: 'Diseñar el dashboard principal',
          priority: 'Mid',
          status: 'ToDo',
          estimatedDeadline: '2024-03-25',
          realDeadline: null,
          estimatedHours: '12',
          realHours: null,
          user_points: 8
        }
      ])
    );
  }),
  
  // Mock de eliminar equipo
  rest.delete('/teams/', (req, res, ctx) => {
    return res(ctx.status(200));
  })
);

// Configuración del servidor
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DashboardManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock de window.confirm
    window.confirm = vi.fn(() => true);
  });

  // Test 1: Renderiza correctamente el componente con sus elementos principales
  it('renderiza correctamente los elementos principales', async () => {
    render(<DashboardManager />);
    
    // Verificar que los componentes principales están presentes
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Section Tickets')).toBeInTheDocument();
  });

  // Test 2: Carga y muestra los equipos correctamente
  it('carga y muestra los equipos desde la API', async () => {
    render(<DashboardManager />);
    
    // Esperar a que se carguen los equipos
    await waitFor(() => {
      expect(screen.getByText('Frontend Team')).toBeInTheDocument();
      expect(screen.getByText('Backend Team')).toBeInTheDocument();
    });
    
    // Verificar que se crearon los TeamCards
    expect(screen.getByTestId('team-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('team-card-2')).toBeInTheDocument();
  });

  // Test 3: Carga y muestra los tickets correctamente
  it('carga y muestra los tickets desde la API', async () => {
    render(<DashboardManager />);
    
    // Esperar a que se carguen los tickets
    await waitFor(() => {
      expect(screen.getByText('Implementar login')).toBeInTheDocument();
      expect(screen.getByText('Crear dashboard')).toBeInTheDocument();
    });
    
    // Verificar los detalles de los tickets
    const tickets = screen.getAllByTestId('ticket');
    expect(tickets).toHaveLength(2);
    
    const statuses = screen.getAllByTestId('ticket-status');
    expect(statuses[0]).toHaveTextContent('InProgress');
    expect(statuses[1]).toHaveTextContent('ToDo');
    
    const priorities = screen.getAllByTestId('ticket-priority');
    expect(priorities[0]).toHaveTextContent('High');
    expect(priorities[1]).toHaveTextContent('Mid');
  });

  // Test 4: Maneja la eliminación de equipos correctamente
  it('elimina un equipo cuando se confirma la acción', async () => {
    const user = userEvent.setup();
    render(<DashboardManager />);
    
    // Esperar a que se carguen los equipos
    await waitFor(() => {
      expect(screen.getByTestId('team-card-1')).toBeInTheDocument();
    });
    
    // Hacer click en el botón de eliminar
    const deleteButton = screen.getAllByText('Delete Team')[0];
    await user.click(deleteButton);
    
    // Verificar que se llamó a window.confirm
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this team?');
    
    // Verificar que el equipo fue eliminado
    await waitFor(() => {
      expect(screen.queryByTestId('team-card-1')).not.toBeInTheDocument();
    });
  });

  // Test 5: Abre y cierra el modal de crear equipo
  it('maneja el modal de crear equipo correctamente', async () => {
    const user = userEvent.setup();
    render(<DashboardManager />);
    
    // Verificar que el modal no está visible inicialmente
    expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
    
    // Hacer click en el botón de agregar equipo
    const addButton = screen.getByText('+');
    await user.click(addButton);
    
    // Verificar que el modal se abre
    expect(screen.getByTestId('create-team-modal')).toBeInTheDocument();
    
    // Cerrar el modal
    const closeButton = screen.getByText('Close Modal');
    await user.click(closeButton);
    
    // Verificar que el modal se cierra
    expect(screen.queryByTestId('create-team-modal')).not.toBeInTheDocument();
  });

  // Test 6: Maneja la creación de equipos y actualiza la lista
  it('crea un equipo y actualiza la lista de equipos', async () => {
    const user = userEvent.setup();
    
    // Configurar el servidor para responder con el equipo nuevo después de la creación
    server.use(
      rest.get('/teams/myteams', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              team_id: 1,
              team_name: 'Frontend Team',
              created_at: '2024-03-15'
            },
            {
              team_id: 2,
              team_name: 'Backend Team',
              created_at: '2024-03-16'
            },
            {
              team_id: 3,
              team_name: 'New Team',
              created_at: '2024-03-17'
            }
          ])
        );
      })
    );
    
    render(<DashboardManager />);
    
    // Abrir el modal
    const addButton = screen.getByText('+');
    await user.click(addButton);
    
    // Simular la creación de un equipo
    const createButton = screen.getByText('Create Team');
    await user.click(createButton);
    
    // Verificar que se actualiza la lista de equipos
    await waitFor(() => {
      expect(screen.getByText('New Team')).toBeInTheDocument();
    });
  });

  // Test 7: Maneja errores de fetch correctamente
  it('maneja errores al cargar equipos', async () => {
    // Configurar el servidor para responder con error
    server.use(
      rest.get('/teams/myteams', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<DashboardManager />);
    
    // Esperar a que se registre el error
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching teams:',
        expect.any(Error)
      );
    });
    
    consoleSpy.mockRestore();
  });

  // Test 8: Snapshot test
  it('coincide con el snapshot', async () => {
    const { container } = render(<DashboardManager />);
    
    // Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText('Frontend Team')).toBeInTheDocument();
      expect(screen.getByText('Implementar login')).toBeInTheDocument();
    });
    
    expect(container).toMatchSnapshot();
  });

  // Test 9: Limita la cantidad de tickets mostrados
  it('muestra solo los primeros 5 tickets', async () => {
    // Configurar el servidor para responder con más de 5 tickets
    server.use(
      rest.get('/tasks/all', (req, res, ctx) => {
        return res(
          ctx.json([
            { taskId: 1, title: 'Ticket 1', description: 'Desc 1', priority: 'Low', status: 'ToDo' },
            { taskId: 2, title: 'Ticket 2', description: 'Desc 2', priority: 'Mid', status: 'InProgress' },
            { taskId: 3, title: 'Ticket 3', description: 'Desc 3', priority: 'High', status: 'Finished' },
            { taskId: 4, title: 'Ticket 4', description: 'Desc 4', priority: 'Low', status: 'ToDo' },
            { taskId: 5, title: 'Ticket 5', description: 'Desc 5', priority: 'Mid', status: 'InProgress' },
            { taskId: 6, title: 'Ticket 6', description: 'Desc 6', priority: 'High', status: 'Finished' },
            { taskId: 7, title: 'Ticket 7', description: 'Desc 7', priority: 'Low', status: 'ToDo' }
          ])
        );
      })
    );
    
    render(<DashboardManager />);
    
    // Esperar a que se carguen los tickets
    await waitFor(() => {
      const tickets = screen.getAllByTestId('ticket');
      expect(tickets).toHaveLength(5); // Solo se muestran 5 tickets
      expect(screen.queryByText('Ticket 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Ticket 7')).not.toBeInTheDocument();
    });
  });
});