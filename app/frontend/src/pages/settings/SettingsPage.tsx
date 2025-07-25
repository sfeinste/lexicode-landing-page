import { User, Shield, Bell, Key, Trash2 } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-200">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <div className="glass-effect rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-200">Profile</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-dark-200 border border-white/10 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 bg-dark-200 border border-white/10 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-dark-200 border border-white/10 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Zone
              </label>
              <select className="w-full px-3 py-2 bg-dark-200 border border-white/10 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-200">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass-effect rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center">
            <Shield className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-200">Security</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Password</h3>
                <p className="text-sm text-gray-400">Last changed 30 days ago</p>
              </div>
              <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                Change Password
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-400">Add an extra layer of security</p>
              </div>
              <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                Enable
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Connected Accounts</h3>
                <p className="text-sm text-gray-400">Manage your connected GitHub accounts</p>
              </div>
              <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-effect rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-200">Notifications</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Email Notifications</h3>
                <p className="text-sm text-gray-400">Receive updates about your documentation</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-white/10 rounded bg-dark-200" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Generation Complete</h3>
                <p className="text-sm text-gray-400">Get notified when documentation is ready</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-white/10 rounded bg-dark-200" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-200">Weekly Summary</h3>
                <p className="text-sm text-gray-400">Get a weekly summary of your activity</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-white/10 rounded bg-dark-200" />
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="glass-effect rounded-lg border border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center">
            <Key className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-200">API Keys</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No API keys created yet</p>
            <p className="text-sm text-gray-500 mt-2 mb-4">
              Create API keys to integrate with our platform
            </p>
            <button className="gradient-bg text-white px-4 py-2 rounded-md hover:opacity-90 transition-all duration-200">
              Create API Key
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-effect rounded-lg border border-red-500/30">
        <div className="p-6 border-b border-red-500/30">
          <div className="flex items-center">
            <Trash2 className="h-5 w-5 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-400">Delete Account</h3>
              <p className="text-sm text-red-300">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-md hover:bg-red-500/30 transition-all duration-200">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};