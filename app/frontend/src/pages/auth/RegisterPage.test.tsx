import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/store/auth-store');

const mockRegister = vi.fn();
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>;

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  const renderRegisterPage = () => {
    return render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );
  };

  it('renders registration form with all elements', () => {
    renderRegisterPage();

    expect(screen.getByText('Lexicode')).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByText('Sign up with GitHub')).toBeInTheDocument();
    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    renderRegisterPage();

    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const agreeCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(fullNameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(agreeCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        fullName: 'John Doe'
      });
    });
  });

  it('does not submit when passwords do not match', async () => {
    renderRegisterPage();

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const agreeCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.click(agreeCheckbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  it('displays error message when registration fails', () => {
    mockUseAuthStore.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: false,
      error: 'Email already exists',
    });

    renderRegisterPage();

    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    mockUseAuthStore.mockReturnValue({
      register: mockRegister,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });

    renderRegisterPage();

    const submitButton = screen.getByRole('button', { name: 'Creating account...' });
    expect(submitButton).toBeDisabled();
  });

  it('toggles password visibility', () => {
    renderRegisterPage();

    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const toggleButtons = screen.getAllByRole('button', { name: '' });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButtons[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButtons[1]);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
  });

  it('redirects to dashboard when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      register: mockRegister,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    renderRegisterPage();

    // Navigate component should render nothing, so we shouldn't see the register page content
    expect(screen.queryByText('Create your account')).not.toBeInTheDocument();
  });

  it('requires agreement to terms', () => {
    renderRegisterPage();

    const agreeCheckbox = screen.getByRole('checkbox');
    expect(agreeCheckbox).toBeRequired();
  });
});