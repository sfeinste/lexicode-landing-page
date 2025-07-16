interface ActivityItemProps {
  color: string;
  message: string;
  badges: string[];
  timestamp: string;
  isLive?: boolean;
}

const ActivityItem = ({ color, message, badges, timestamp, isLive }: ActivityItemProps) => {
  const badgeColors = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="relative">
        <div className={`w-2 h-2 ${color} rounded-full ${isLive ? 'animate-pulse' : ''}`}></div>
        {isLive && <div className={`absolute inset-0 w-2 h-2 ${color} rounded-full animate-ping`}></div>}
      </div>
      <div className="flex-1">
        <span className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: message }}></span>
        <div className="flex gap-2 mt-1">
          {badges.map((badge, index) => {
            const colorKey = badge.includes('+') ? 'green' : 
                           badge.includes('coverage') ? 'blue' :
                           badge.includes('endpoints') ? 'blue' :
                           badge.includes('Swagger') ? 'purple' :
                           badge.includes('files') ? 'purple' :
                           badge.includes('Migration') ? 'orange' :
                           badge.includes('affected') ? 'red' : 'gray';
            
            return (
              <span key={index} className={`text-xs px-2 py-0.5 rounded ${badgeColors[colorKey as keyof typeof badgeColors]}`}>
                {badge}
              </span>
            );
          })}
        </div>
      </div>
      <span className="text-xs text-gray-400">{timestamp}</span>
    </div>
  );
};

const ActivityFeed = () => {
  const activities = [
    {
      color: 'bg-green-500',
      message: 'Auto-documented <code class="bg-gray-200 px-1 rounded text-xs">AuthenticationService</code> with AI analysis',
      badges: ['+45 methods', '100% coverage'],
      timestamp: 'just now',
      isLive: true
    },
    {
      color: 'bg-blue-500',
      message: 'Generated OpenAPI spec for <code class="bg-gray-200 px-1 rounded text-xs">REST API v2</code>',
      badges: ['32 endpoints', 'Swagger UI'],
      timestamp: '5 min ago'
    },
    {
      color: 'bg-purple-500',
      message: 'Synced docs with <code class="bg-gray-200 px-1 rounded text-xs">feature/payment-gateway</code>',
      badges: ['12 files', 'PR #1247'],
      timestamp: '23 min ago'
    },
    {
      color: 'bg-orange-500',
      message: 'AI detected breaking changes in <code class="bg-gray-200 px-1 rounded text-xs">UserModel</code>',
      badges: ['Migration needed', '3 affected files'],
      timestamp: '1 hour ago'
    }
  ];

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Recent Activity
      </h4>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <ActivityItem key={index} {...activity} />
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;