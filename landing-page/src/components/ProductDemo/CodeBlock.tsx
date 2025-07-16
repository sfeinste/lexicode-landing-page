interface CodeBlockProps {
  title: string;
}

const CodeBlock = ({ title }: CodeBlockProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-gray-400 text-sm ml-2">{title}</span>
      </div>
      <div className="p-6 bg-slate-900 font-mono text-xs overflow-x-auto">
        <div className="space-y-0">
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">Request</span>, <span className="text-cyan-400">Response</span>, <span className="text-cyan-400">NextFunction</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'express'</span>;
          </div>
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">PrismaClient</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'@prisma/client'</span>;
          </div>
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">Redis</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'ioredis'</span>;
          </div>
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">Logger</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'winston'</span>;
          </div>
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">validateEmail</span>, <span className="text-cyan-400">hashPassword</span>, <span className="text-cyan-400">generateToken</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'./utils'</span>;
          </div>
          <div className="text-slate-300">
            <span className="text-purple-400">import</span> {'{'} <span className="text-cyan-400">RateLimiter</span> {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'./middleware/rateLimiter'</span>;
          </div>
          <div className="h-4"></div>
          <div className="text-slate-300">
            <span className="text-purple-400">interface</span> <span className="text-yellow-300">AuthConfig</span> {'{'}
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-blue-300">tokenExpiry</span>: <span className="text-cyan-400">string</span>;
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-blue-300">maxLoginAttempts</span>: <span className="text-cyan-400">number</span>;
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-blue-300">lockoutDuration</span>: <span className="text-cyan-400">number</span>;
          </div>
          <div className="text-slate-300">{`}`}</div>
          <div className="h-4"></div>
          <div className="text-slate-300">
            <span className="text-purple-400">export class</span> <span className="text-yellow-300">AuthenticationService</span> {'{'}
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">private</span> <span className="text-blue-300">prisma</span>: <span className="text-cyan-400">PrismaClient</span>;
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">private</span> <span className="text-blue-300">redis</span>: <span className="text-cyan-400">Redis</span>;
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">private</span> <span className="text-blue-300">logger</span>: <span className="text-cyan-400">Logger</span>;
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">private</span> <span className="text-blue-300">config</span>: <span className="text-cyan-400">AuthConfig</span>;
          </div>
          <div className="h-4"></div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">constructor</span>(<span className="text-orange-300">dependencies</span>: <span className="text-cyan-400">ServiceDependencies</span>) {'{'}
          </div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">this</span>.<span className="text-blue-300">prisma</span> = <span className="text-orange-300">dependencies</span>.prisma;
          </div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">this</span>.<span className="text-blue-300">redis</span> = <span className="text-orange-300">dependencies</span>.redis;
          </div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">this</span>.<span className="text-blue-300">logger</span> = <span className="text-orange-300">dependencies</span>.logger;
          </div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">this</span>.<span className="text-blue-300">config</span> = <span className="text-orange-300">dependencies</span>.config.auth;
          </div>
          <div className="text-slate-300 pl-4">{`}`}</div>
          <div className="h-4"></div>
          <div className="text-slate-500 italic pl-4">
            /**
          </div>
          <div className="text-slate-500 italic pl-4">
             * Authenticates user with email and password
          </div>
          <div className="text-slate-500 italic pl-4">
             * Implements rate limiting and account lockout
          </div>
          <div className="text-slate-500 italic pl-4">
             */
          </div>
          <div className="text-slate-300 pl-4">
            <span className="text-purple-400">async</span> <span className="text-yellow-300">login</span>(<span className="text-orange-300">req</span>: <span className="text-cyan-400">Request</span>, <span className="text-orange-300">res</span>: <span className="text-cyan-400">Response</span>): <span className="text-cyan-400">Promise</span>&lt;<span className="text-purple-400">void</span>&gt; {'{'}
          </div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">const</span> {'{'} <span className="text-blue-300">email</span>, <span className="text-blue-300">password</span> {'}'} = <span className="text-orange-300">req</span>.body;
          </div>
          <div className="h-4"></div>
          <div className="text-slate-300 pl-8">
            <span className="text-purple-400">try</span> {'{'}
          </div>
          <div className="text-slate-500 italic pl-12">
            // Validate input
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">if</span> (!<span className="text-yellow-300">validateEmail</span>(<span className="text-blue-300">email</span>)) {'{'}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-purple-400">throw new</span> <span className="text-red-400">ValidationError</span>(<span className="text-green-400">'Invalid email format'</span>);
          </div>
          <div className="text-slate-300 pl-12">{`}`}</div>
          <div className="h-2"></div>
          <div className="text-slate-500 italic pl-12">
            // Check rate limiting
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">const</span> <span className="text-blue-300">attempts</span> = <span className="text-purple-400">await this</span>.<span className="text-blue-300">redis</span>.<span className="text-yellow-300">incr</span>({`(`}<span className="text-green-400">{`\`login_attempts:\${email}\``}</span>{`)`});
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">if</span> (<span className="text-blue-300">attempts</span> &gt; <span className="text-purple-400">this</span>.<span className="text-blue-300">config</span>.maxLoginAttempts) {'{'}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-purple-400">throw new</span> <span className="text-red-400">TooManyAttemptsError</span>(<span className="text-green-400">'Account temporarily locked'</span>);
          </div>
          <div className="text-slate-300 pl-12">{`}`}</div>
          <div className="h-2"></div>
          <div className="text-slate-500 italic pl-12">
            // Find user with related data
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">const</span> <span className="text-blue-300">user</span> = <span className="text-purple-400">await this</span>.<span className="text-blue-300">prisma</span>.user.<span className="text-yellow-300">findUnique</span>({`({`}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">where</span>: {'{'} email {'}'},
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">include</span>: {'{'}
          </div>
          <div className="text-slate-300 pl-20">
            <span className="text-blue-300">profile</span>: <span className="text-orange-400">true</span>,
          </div>
          <div className="text-slate-300 pl-20">
            <span className="text-blue-300">permissions</span>: {'{'}
          </div>
          <div className="text-slate-300 pl-24">
            <span className="text-blue-300">include</span>: {'{'} <span className="text-blue-300">role</span>: <span className="text-orange-400">true</span> {'}'}
          </div>
          <div className="text-slate-300 pl-20">{`}`}</div>
          <div className="text-slate-300 pl-16">{`}`}</div>
          <div className="text-slate-300 pl-12">{`});`}</div>
          <div className="h-2"></div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">if</span> (!<span className="text-blue-300">user</span> || !<span className="text-purple-400">await this</span>.<span className="text-yellow-300">verifyPassword</span>(<span className="text-blue-300">password</span>, <span className="text-blue-300">user</span>.hashedPassword)) {'{'}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-purple-400">this</span>.<span className="text-blue-300">logger</span>.<span className="text-yellow-300">warn</span>({`(`}<span className="text-green-400">{`\`Failed login attempt for \${email}\``}</span>{`)`});
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-purple-400">throw new</span> <span className="text-red-400">UnauthorizedError</span>(<span className="text-green-400">'Invalid credentials'</span>);
          </div>
          <div className="text-slate-300 pl-12">{`}`}</div>
          <div className="h-2"></div>
          <div className="text-slate-500 italic pl-12">
            // Generate tokens
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">const</span> {'{'} <span className="text-blue-300">accessToken</span>, <span className="text-blue-300">refreshToken</span> {'}'} = <span className="text-purple-400">await this</span>.<span className="text-yellow-300">generateTokenPair</span>(<span className="text-blue-300">user</span>);
          </div>
          <div className="h-2"></div>
          <div className="text-slate-500 italic pl-12">
            // Update last login
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">await this</span>.<span className="text-blue-300">prisma</span>.user.<span className="text-yellow-300">update</span>({`({`}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">where</span>: {'{'} <span className="text-blue-300">id</span>: <span className="text-blue-300">user</span>.id {'}'},
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">data</span>: {'{'} <span className="text-blue-300">lastLoginAt</span>: <span className="text-purple-400">new</span> <span className="text-yellow-300">Date</span>() {'}'}
          </div>
          <div className="text-slate-300 pl-12">{`});`}</div>
          <div className="h-2"></div>
          <div className="text-slate-500 italic pl-12">
            // Clear login attempts
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">await this</span>.<span className="text-blue-300">redis</span>.<span className="text-yellow-300">del</span>({`(`}<span className="text-green-400">{`\`login_attempts:\${email}\``}</span>{`)`});
          </div>
          <div className="h-2"></div>
          <div className="text-slate-300 pl-12">
            <span className="text-orange-300">res</span>.<span className="text-yellow-300">json</span>({`({`}
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">user</span>: <span className="text-purple-400">this</span>.<span className="text-yellow-300">sanitizeUser</span>(<span className="text-blue-300">user</span>),
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">accessToken</span>,
          </div>
          <div className="text-slate-300 pl-16">
            <span className="text-blue-300">refreshToken</span>
          </div>
          <div className="text-slate-300 pl-12">{`});`}</div>
          <div className="text-slate-300 pl-8">{'}'} <span className="text-purple-400">catch</span> (<span className="text-orange-300">error</span>) {'{'}
          </div>
          <div className="text-slate-300 pl-12">
            <span className="text-purple-400">this</span>.<span className="text-yellow-300">handleAuthError</span>(<span className="text-orange-300">error</span>, <span className="text-orange-300">res</span>);
          </div>
          <div className="text-slate-300 pl-8">{`}`}</div>
          <div className="text-slate-300 pl-4">{`}`}</div>
          <div className="text-slate-300">{`}`}</div>
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;