import { CreditCard, Download, Calendar, TrendingUp } from 'lucide-react';

export const BillingPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
          <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            Change Plan
          </button>
        </div>
        
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-xl font-medium text-gray-900">Free Plan</h3>
            <p className="text-gray-600">Perfect for getting started</p>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              Next billing cycle: N/A
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">$0</p>
            <p className="text-sm text-gray-500">per month</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Repositories</p>
            <p className="text-2xl font-semibold text-gray-900">3 <span className="text-sm text-gray-500">/ 3</span></p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">AI Generations</p>
            <p className="text-2xl font-semibold text-gray-900">10 <span className="text-sm text-gray-500">/ 10</span></p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Team Members</p>
            <p className="text-2xl font-semibold text-gray-900">1 <span className="text-sm text-gray-500">/ 1</span></p>
          </div>
        </div>
      </div>

      {/* Usage This Month */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Usage This Month</h2>
          <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            View Details
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-sm text-gray-500">API Calls</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <CreditCard className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Generations</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <Download className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Exports</p>
          </div>
          <div className="text-center p-4 border border-gray-200 rounded-lg">
            <Calendar className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Active Days</p>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
            Add Payment Method
          </button>
        </div>
        
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No payment methods added</p>
          <p className="text-sm text-gray-400 mt-2">
            Add a payment method to upgrade your plan
          </p>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Billing History</h2>
          <button className="text-blue-600 hover:text-blue-500 text-sm font-medium">
            Download All
          </button>
        </div>
        
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No billing history yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Your invoices will appear here once you have a paid subscription
          </p>
        </div>
      </div>
    </div>
  );
};