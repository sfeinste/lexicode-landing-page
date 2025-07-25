import { CreditCard, Download, Calendar, TrendingUp } from 'lucide-react';

export const BillingPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-200">Billing & Usage</h1>
        <p className="text-gray-400 mt-1">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Current Plan */}
      <div className="glass-effect rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Current Plan</h2>
          <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
            Change Plan
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-xl font-medium text-gray-200">Free Plan</h3>
            <p className="text-gray-400">Perfect for getting started</p>
            <div className="mt-2 flex items-center text-sm text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              Next billing cycle: N/A
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold gradient-text">$0</p>
            <p className="text-sm text-gray-400">per month</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 glass-effect rounded-lg">
            <p className="text-sm text-gray-400">Repositories</p>
            <p className="text-2xl font-semibold text-gray-200">3 <span className="text-sm text-gray-400">/ 3</span></p>
          </div>
          <div className="p-4 glass-effect rounded-lg">
            <p className="text-sm text-gray-400">AI Generations</p>
            <p className="text-2xl font-semibold text-gray-200">10 <span className="text-sm text-gray-400">/ 10</span></p>
          </div>
          <div className="p-4 glass-effect rounded-lg">
            <p className="text-sm text-gray-400">Team Members</p>
            <p className="text-2xl font-semibold text-gray-200">1 <span className="text-sm text-gray-400">/ 1</span></p>
          </div>
        </div>
      </div>

      {/* Usage This Month */}
      <div className="glass-effect rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Usage This Month</h2>
          <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
            View Details
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 glass-effect border border-white/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary-400 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-200">0</p>
            <p className="text-sm text-gray-400">API Calls</p>
          </div>
          <div className="text-center p-4 glass-effect border border-white/10 rounded-lg">
            <CreditCard className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-200">0</p>
            <p className="text-sm text-gray-400">Generations</p>
          </div>
          <div className="text-center p-4 glass-effect border border-white/10 rounded-lg">
            <Download className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-200">0</p>
            <p className="text-sm text-gray-400">Exports</p>
          </div>
          <div className="text-center p-4 glass-effect border border-white/10 rounded-lg">
            <Calendar className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-200">0</p>
            <p className="text-sm text-gray-400">Active Days</p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="glass-effect rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Payment Methods</h2>
          <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 text-sm transition-all duration-200">
            Add Payment Method
          </button>
        </div>
        
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No payment methods added</p>
          <p className="text-sm text-gray-500 mt-2">
            Add a payment method to upgrade your plan
          </p>
        </div>
      </div>

      {/* Billing History */}
      <div className="glass-effect rounded-lg border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Billing History</h2>
          <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
            Download All
          </button>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No billing history yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Your invoices will appear here once you have a paid subscription
          </p>
        </div>
      </div>
    </div>
  );
};