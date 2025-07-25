import { Link } from 'react-router-dom';
import { ArrowRight, Github, Zap, FileText, Shield } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-dark-300">
      {/* Header */}
      <header className="glass-effect border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold gradient-text">Lexicode</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="gradient-bg text-white hover:opacity-90 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-purple-500/20 to-pink-500/20 animate-gradient" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-8">
              AI-Powered Code Documentation
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Transform your GitHub repositories into comprehensive documentation automatically. 
              Save time, improve code quality, and keep your team aligned.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                to="/register"
                className="gradient-bg text-white hover:opacity-90 px-8 py-3 rounded-md text-lg font-medium inline-flex items-center transition-all duration-200"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="glass-effect border border-white/10 text-gray-200 glass-hover px-8 py-3 rounded-md text-lg font-medium inline-flex items-center transition-all duration-200">
                <Github className="mr-2 w-5 h-5" />
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-200 mb-4">
              Everything you need for perfect documentation
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our AI-powered platform automatically generates comprehensive documentation 
              for your codebase, keeping it up-to-date and accessible.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
              <div className="gradient-bg w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Automatic Generation
              </h3>
              <p className="text-gray-400">
                Connect your GitHub repo and let our AI analyze your code to generate 
                comprehensive documentation automatically.
              </p>
            </div>

            <div className="text-center glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
              <div className="gradient-bg w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Always Up-to-Date
              </h3>
              <p className="text-gray-400">
                Documentation automatically updates when you push changes, 
                ensuring your docs never fall behind your code.
              </p>
            </div>

            <div className="text-center glass-effect rounded-lg p-6 hover:bg-white/10 transition-all duration-200">
              <div className="gradient-bg w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-2">
                Secure & Private
              </h3>
              <p className="text-gray-400">
                Your code stays secure with enterprise-grade encryption and 
                granular access controls for your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-purple-500/20 to-pink-500/20 animate-gradient" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-bold gradient-text mb-4">
            Ready to improve your documentation?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of developers who trust Lexicode for their documentation needs.
          </p>
          <Link
            to="/register"
            className="gradient-bg text-white hover:opacity-90 px-8 py-3 rounded-md text-lg font-medium inline-flex items-center transition-all duration-200"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-effect border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold gradient-text mb-4">Lexicode</h3>
            <p className="text-gray-400">
              AI-powered documentation for modern development teams.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};