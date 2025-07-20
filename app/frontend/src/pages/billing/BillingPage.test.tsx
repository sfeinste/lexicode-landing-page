import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BillingPage } from './BillingPage';

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Header', () => {
    it('should render page title and description', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Billing & Usage')).toBeInTheDocument();
      expect(screen.getByText('Manage your subscription and view usage statistics')).toBeInTheDocument();
    });
  });

  describe('Current Plan Section', () => {
    it('should display current plan information', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Current Plan')).toBeInTheDocument();
      expect(screen.getByText('Free Plan')).toBeInTheDocument();
      expect(screen.getByText('Perfect for getting started')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('per month')).toBeInTheDocument();
    });

    it('should show change plan button', () => {
      render(<BillingPage />);
      
      const changePlanButton = screen.getByRole('button', { name: /change plan/i });
      expect(changePlanButton).toBeInTheDocument();
    });

    it('should display usage limits', () => {
      render(<BillingPage />);
      
      // Repositories
      expect(screen.getByText('Repositories')).toBeInTheDocument();
      const repoText = screen.getByText('3').parentElement;
      expect(repoText?.textContent).toContain('3 / 3');
      
      // AI Generations
      expect(screen.getByText('AI Generations')).toBeInTheDocument();
      const genText = screen.getByText('10').parentElement;
      expect(genText?.textContent).toContain('10 / 10');
      
      // Team Members
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      const teamText = screen.getByText('1').parentElement;
      expect(teamText?.textContent).toContain('1 / 1');
    });

    it('should show next billing cycle', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Next billing cycle: N/A')).toBeInTheDocument();
    });
  });

  describe('Usage This Month Section', () => {
    it('should display usage section header', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Usage This Month')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('should display usage metrics', () => {
      render(<BillingPage />);
      
      // API Calls
      expect(screen.getByText('API Calls')).toBeInTheDocument();
      
      // Generations
      expect(screen.getByText('Generations')).toBeInTheDocument();
      
      // Exports
      expect(screen.getByText('Exports')).toBeInTheDocument();
      
      // Active Days
      expect(screen.getByText('Active Days')).toBeInTheDocument();
      
      // All should show 0 for new users
      const zeroValues = screen.getAllByText('0');
      expect(zeroValues.length).toBeGreaterThanOrEqual(4);
    });

    it('should have correct icons for metrics', () => {
      const { container } = render(<BillingPage />);
      
      // Check for SVG icons in the usage section
      const usageSection = container.querySelectorAll('.bg-white.rounded-lg.shadow')[1]; // Second white card is usage
      const svgIcons = usageSection.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThanOrEqual(4); // At least 4 icons for metrics
    });
  });

  describe('Payment Methods Section', () => {
    it('should display payment methods header', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });

    it('should show add payment method button', () => {
      render(<BillingPage />);
      
      const addButton = screen.getByRole('button', { name: /add payment method/i });
      expect(addButton).toBeInTheDocument();
      expect(addButton).toHaveClass('bg-blue-600');
    });

    it('should display empty state for payment methods', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('No payment methods added')).toBeInTheDocument();
      expect(screen.getByText('Add a payment method to upgrade your plan')).toBeInTheDocument();
    });
  });

  describe('Billing History Section', () => {
    it('should display billing history header', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('Billing History')).toBeInTheDocument();
    });

    it('should show download all button', () => {
      render(<BillingPage />);
      
      const downloadButton = screen.getByRole('button', { name: /download all/i });
      expect(downloadButton).toBeInTheDocument();
    });

    it('should display empty state for billing history', () => {
      render(<BillingPage />);
      
      expect(screen.getByText('No billing history yet')).toBeInTheDocument();
      expect(screen.getByText('Your invoices will appear here once you have a paid subscription')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should use proper spacing and grid layouts', () => {
      const { container } = render(<BillingPage />);
      
      // Check for responsive grid layouts
      const grids = container.querySelectorAll('[class*="grid-cols"]');
      expect(grids.length).toBeGreaterThan(0);
      
      // Check for proper card styling
      const cards = container.querySelectorAll('.bg-white.rounded-lg.shadow');
      expect(cards.length).toBe(4); // 4 main sections
    });

    it('should use appropriate color schemes for different elements', () => {
      const { container } = render(<BillingPage />);
      
      // Check for blue action buttons
      expect(container.querySelector('.text-blue-600')).toBeInTheDocument();
      
      // Check for gray backgrounds for stats
      expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('should handle change plan button click', () => {
      render(<BillingPage />);
      
      const changePlanButton = screen.getByRole('button', { name: /change plan/i });
      
      // Button should be clickable
      expect(changePlanButton).not.toBeDisabled();
      fireEvent.click(changePlanButton);
      // Note: In a real test, we'd check if navigation or modal opens
    });

    it('should handle add payment method button click', () => {
      render(<BillingPage />);
      
      const addPaymentButton = screen.getByRole('button', { name: /add payment method/i });
      
      expect(addPaymentButton).not.toBeDisabled();
      fireEvent.click(addPaymentButton);
      // Note: In a real test, we'd check if payment modal opens
    });
  });
});