import React from 'react';
import { MessageCircle } from 'lucide-react';


interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        {/* Logo Container */}
        <div className="relative mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-silver-400 to-blue-500 rounded-2xl shadow-2xl transform transition-all duration-1000 animate-pulse">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          
          {/* Glow effect */}
          <div className="absolute inset-0 w-24 h-24 bg-gradient-to-r from-silver-400 to-blue-500 rounded-2xl opacity-30 blur-lg animate-ping"></div>
        </div>

        {/* App Name */}
        <h1 className="text-4xl font-bold text-white mb-8 tracking-wide">
          <span className="bg-gradient-to-r from-silver-200 via-white to-blue-300 bg-clip-text text-transparent">
            Metal Exchange
          </span>
        </h1>

        {/* Loading Dots */}
        <div className="flex items-center justify-center space-x-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="w-3 h-3 bg-gradient-to-r from-silver-400 to-blue-500 rounded-full animate-bounce shadow-lg"
              style={{
                animationDelay: `${index * 0.2}s`,
                animationDuration: '0.8s'
              }}
            ></div>
          ))}
        </div>

        <p className="text-silver-300 mt-4 text-sm opacity-75">
          Please Wait ...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;