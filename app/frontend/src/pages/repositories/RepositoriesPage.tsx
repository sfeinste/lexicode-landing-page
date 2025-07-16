import { useState } from 'react';
import { Plus, Search, FolderGit2, Star, GitBranch, Calendar } from 'lucide-react';

export const RepositoriesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-1">
            Manage your connected GitHub repositories
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Connect Repository
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option>All Languages</option>
              <option>JavaScript</option>
              <option>TypeScript</option>
              <option>Python</option>
              <option>Java</option>
            </select>
            <select className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Repository List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Repositories</h2>
          
          {/* Empty State */}
          <div className="text-center py-12">
            <FolderGit2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories connected</h3>
            <p className="text-gray-500 mb-6">
              Connect your first GitHub repository to start generating documentation
            </p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Repository
            </button>
          </div>

          {/* Repository Cards (hidden when empty) */}
          <div className="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <FolderGit2 className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="font-medium text-gray-900">sample-repo</h3>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                A sample repository for testing documentation generation
              </p>
              <div className="flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
                  JavaScript
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  12
                </div>
                <div className="flex items-center">
                  <GitBranch className="h-4 w-4 mr-1" />
                  main
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                Updated 2 days ago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};