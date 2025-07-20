import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

// Mock Link component to avoid navigation issues in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to, className, ...props }: any) => (
      <a href={to} className={className} {...props}>{children}</a>
    ),
  };
});

describe('LandingPage', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
  };

  describe('Header', () => {
    it('should render the logo', () => {
      renderLandingPage();
      
      const logos = screen.getAllByText('Lexicode');
      expect(logos[0]).toBeInTheDocument(); // First one should be the header logo
    });

    it('should render navigation links', () => {
      renderLandingPage();
      
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getAllByText('Get Started')[0]).toBeInTheDocument();
    });

    it('should have correct link destinations', () => {
      renderLandingPage();
      
      const signInLink = screen.getByText('Sign In').closest('a');
      expect(signInLink).toHaveAttribute('href', '/login');
      
      const getStartedLink = screen.getAllByText('Get Started')[0].closest('a');
      expect(getStartedLink).toHaveAttribute('href', '/register');
    });
  });

  describe('Hero Section', () => {
    it('should render hero title and subtitle', () => {
      renderLandingPage();
      
      expect(screen.getByText('AI-Powered Code Documentation')).toBeInTheDocument();
      expect(screen.getByText(/Transform your GitHub repositories/)).toBeInTheDocument();
    });

    it('should render CTA buttons', () => {
      renderLandingPage();
      
      expect(screen.getByText('Start Free Trial')).toBeInTheDocument();
      expect(screen.getByText('View Demo')).toBeInTheDocument();
    });

    it('should have correct styling for hero section', () => {
      const { container } = renderLandingPage();
      
      const heroSection = container.querySelector('.bg-gradient-to-r');
      expect(heroSection).toBeInTheDocument();
      expect(heroSection).toHaveClass('from-blue-600', 'to-blue-800');
    });
  });

  describe('Features Section', () => {
    it('should render features section title', () => {
      renderLandingPage();
      
      expect(screen.getByText('Everything you need for perfect documentation')).toBeInTheDocument();
      expect(screen.getByText(/Our AI-powered platform/)).toBeInTheDocument();
    });

    it('should render all three features', () => {
      renderLandingPage();
      
      // Feature 1
      expect(screen.getByText('Automatic Generation')).toBeInTheDocument();
      expect(screen.getByText(/Connect your GitHub repo/)).toBeInTheDocument();
      
      // Feature 2
      expect(screen.getByText('Always Up-to-Date')).toBeInTheDocument();
      expect(screen.getByText(/Documentation automatically updates/)).toBeInTheDocument();
      
      // Feature 3
      expect(screen.getByText('Secure & Private')).toBeInTheDocument();
      expect(screen.getByText(/Your code stays secure/)).toBeInTheDocument();
    });

    it('should render feature icons', () => {
      const { container } = renderLandingPage();
      
      // Check for icon containers
      const iconContainers = container.querySelectorAll('.rounded-full');
      expect(iconContainers.length).toBeGreaterThanOrEqual(3);
      
      // Check for SVG elements (icons)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('CTA Section', () => {
    it('should render CTA content', () => {
      renderLandingPage();
      
      expect(screen.getByText('Ready to improve your documentation?')).toBeInTheDocument();
      expect(screen.getByText(/Join thousands of developers/)).toBeInTheDocument();
    });

    it('should render CTA button', () => {
      renderLandingPage();
      
      const ctaButton = screen.getByText('Get Started Free');
      expect(ctaButton).toBeInTheDocument();
      
      const ctaLink = ctaButton.closest('a');
      expect(ctaLink).toHaveAttribute('href', '/register');
    });

    it('should have correct styling for CTA section', () => {
      const { container } = renderLandingPage();
      
      const ctaSections = container.querySelectorAll('.bg-blue-600');
      expect(ctaSections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Footer', () => {
    it('should render footer content', () => {
      renderLandingPage();
      
      const footerLogo = screen.getAllByText('Lexicode')[1]; // Second occurrence is in footer
      expect(footerLogo).toBeInTheDocument();
      
      expect(screen.getByText('AI-powered documentation for modern development teams.')).toBeInTheDocument();
    });

    it('should have dark footer styling', () => {
      const { container } = renderLandingPage();
      
      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('bg-gray-900', 'text-white');
    });
  });

  describe('Responsive Design', () => {
    it('should use responsive classes', () => {
      const { container } = renderLandingPage();
      
      // Check for responsive text sizing
      const heroTitle = screen.getByText('AI-Powered Code Documentation');
      expect(heroTitle).toHaveClass('text-4xl', 'md:text-6xl');
      
      // Check for responsive grid
      const featuresGrid = container.querySelector('.md\\:grid-cols-3');
      expect(featuresGrid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderLandingPage();
      
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements.length).toBeGreaterThanOrEqual(1);
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThanOrEqual(2);
      
      const h3Elements = screen.getAllByRole('heading', { level: 3 });
      expect(h3Elements.length).toBe(4); // 3 features + 1 footer
    });
  });
});