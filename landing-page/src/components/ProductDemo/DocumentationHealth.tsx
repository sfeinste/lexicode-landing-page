import ProgressBar from './ProgressBar';

const DocumentationHealth = () => {
  const healthData = [
    { label: 'TypeScript Interfaces', percentage: 98, color: 'bg-green-500' },
    { label: 'React Components', percentage: 92, color: 'bg-blue-500' },
    { label: 'API Endpoints', percentage: 88, color: 'bg-purple-500' },
    { label: 'Utility Functions', percentage: 95, color: 'bg-orange-500' }
  ];

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Documentation Health
      </h4>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          {healthData.map((item, index) => (
            <ProgressBar 
              key={index}
              label={item.label}
              percentage={item.percentage}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentationHealth;