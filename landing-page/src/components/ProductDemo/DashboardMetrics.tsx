interface MetricCardProps {
  value: string;
  label: string;
  subtext: string;
  bgColor: string;
  textColor: string;
  icon?: React.ReactNode;
}

const MetricCard = ({ value, label, subtext, bgColor, textColor, icon }: MetricCardProps) => {
  return (
    <div className={`${bgColor} rounded-xl p-6 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 rounded-full -mr-10 -mt-10"></div>
      <div className="relative">
        <div className={`text-4xl font-bold ${textColor} mb-2`}>{value}</div>
        <div className="text-gray-600 text-sm">{label}</div>
        <div className={`text-xs ${textColor} mt-1`}>{subtext}</div>
        {icon && <div className="mt-1">{icon}</div>}
      </div>
    </div>
  );
};

const DashboardMetrics = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-4 mb-8">
      <MetricCard
        value="1,847"
        label="Functions Documented"
        subtext="↑ 12% this week"
        bgColor="bg-gradient-to-br from-primary/10 to-secondary/10"
        textColor="text-primary"
      />
      <MetricCard
        value="94.2%"
        label="Coverage Rate"
        subtext="Above target"
        bgColor="bg-gradient-to-br from-green-50 to-emerald-50"
        textColor="text-green-600"
      />
      <MetricCard
        value="127 hrs"
        label="Time Saved"
        subtext="This month"
        bgColor="bg-gradient-to-br from-blue-50 to-cyan-50"
        textColor="text-blue-600"
      />
      <MetricCard
        value="5.0"
        label="Quality Score"
        subtext=""
        bgColor="bg-gradient-to-br from-purple-50 to-pink-50"
        textColor="text-purple-600"
        icon={
          <div className="flex mt-1">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
            ))}
          </div>
        }
      />
    </div>
  );
};

export default DashboardMetrics;