const DocumentationSection = () => {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">AuthenticationService</h3>
          <p className="text-sm text-gray-500">src/services/auth/AuthenticationService.ts</p>
        </div>
      </div>
      
      <div className="prose prose-sm max-w-none">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">📋 Overview</h4>
          <p className="text-gray-600">Enterprise-grade authentication service implementing secure user login with rate limiting, account lockout protection, and comprehensive error handling. Integrates with Prisma ORM, Redis for caching, and Winston for structured logging.</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="text-xs text-gray-600">Test Coverage</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">A+</div>
            <div className="text-xs text-gray-600">Security Score</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">2.3ms</div>
            <div className="text-xs text-gray-600">Avg Response</div>
          </div>
        </div>

        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">🔧 Dependencies</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Express.js</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Prisma ORM</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Redis</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Winston Logger</span>
        </div>
        
        <h4 className="text-lg font-semibold text-gray-800 mt-6 mb-3">📚 Methods</h4>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-mono font-semibold text-primary">login(req: Request, res: Response)</h5>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">async</span>
            </div>
            <p className="text-gray-600 text-sm mb-3">Authenticates users with comprehensive security measures including rate limiting and account lockout protection.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Parameters</span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">req</code>
                    <span className="text-xs text-gray-600">Express Request object containing email & password</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">res</code>
                    <span className="text-xs text-gray-600">Express Response object</span>
                  </div>
                </div>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Returns</span>
                <div className="mt-1">
                  <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">Promise&lt;void&gt;</code>
                  <p className="text-xs text-gray-600 mt-1">Sends JSON response with user data and tokens</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Error Handling</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">ValidationError</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">TooManyAttemptsError</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">UnauthorizedError</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-xs text-gray-600">Generic Errors</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Tested</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Rate Limited</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Logged</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationSection;