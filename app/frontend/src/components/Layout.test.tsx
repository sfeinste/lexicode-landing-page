import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/store/auth-store');

const mockLogout = vi.fn();
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('Layout', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    subscriptionTier: 'Pro'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  const renderLayout = (initialRoute = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );
  };

  it('renders navigation items', () => {
    renderLayout();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders user information', () => {
    renderLayout();

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, Test User')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    renderLayout('/repositories');

    const repoLink = screen.getByText('Repositories').closest('a');
    expect(repoLink).toHaveClass('bg-blue-50', 'text-blue-700');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toHaveClass('bg-blue-50');
  });

  it('renders children content', () => {
    renderLayout();

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    renderLayout();

    const logoutButton = screen.getByRole('button');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('displays page title based on active route', () => {
    renderLayout('/dashboard');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Dashboard');
  });

  it('displays correct title for repositories route', () => {
    renderLayout('/repositories');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Repositories');
  });

  it('renders logo', () => {
    renderLayout();

    expect(screen.getByText('Lexicode')).toBeInTheDocument();
  });

  it('displays email when fullName is not available', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        ...mockUser,
        fullName: undefined
      },
      logout: mockLogout,
    });

    renderLayout();

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Welcome back, test@example.com')).toBeInTheDocument();
  });

  it('renders all navigation icons', () => {
    renderLayout();

    const navItems = screen.getAllByRole('link');
    
    // Each navigation item should have an icon
    navItems.forEach(item => {
      const svg = item.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  it('applies hover styles to navigation items', () => {
    renderLayout();

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveClass('hover:bg-gray-50', 'hover:text-gray-900');
  });
});