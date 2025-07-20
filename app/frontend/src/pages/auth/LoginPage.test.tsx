import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/store/auth-store');

const mockLogin = vi.fn();
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );
  };

  it('renders login form with all elements', () => {
    renderLoginPage();

    expect(screen.getByText('Lexicode')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays error message when login fails', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: 'Invalid credentials',
    });

    renderLoginPage();

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });

    renderLoginPage();

    const submitButton = screen.getByRole('button', { name: 'Signing in...' });
    expect(submitButton).toBeDisabled();
  });

  it('toggles password visibility', () => {
    renderLoginPage();

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: '' });

    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('redirects to dashboard when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      login: mockLogin,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    render(
      <BrowserRouter>
        <LoginPage />
        <div id="dashboard">Dashboard Route</div>
      </BrowserRouter>
    );

    // Navigate component should render nothing, so we shouldn't see the login page content
    expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
  });
});