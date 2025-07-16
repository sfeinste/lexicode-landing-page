interface BrowserWindowProps {
  title: string;
  children: React.ReactNode;
}

const BrowserWindow = ({ title, children }: BrowserWindowProps) => {
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
      {children}
    </div>
  );
};

export default BrowserWindow;