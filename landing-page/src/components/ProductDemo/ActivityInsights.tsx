const ActivityInsights = () => {
  const chartData = [40, 65, 45, 80, 95, 70, 85];

  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Activity Insights
      </h4>
      <div className="bg-gray-50 rounded-lg p-4 h-48 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center gap-1 mb-4">
            {chartData.map((height, i) => (
              <div 
                key={i} 
                className="w-8 bg-gradient-to-t from-primary to-secondary rounded-t transition-all duration-300 hover:opacity-80" 
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
          <p className="text-sm text-gray-600">Documentation updates per day</p>
        </div>
      </div>
    </div>
  );
};

export default ActivityInsights;