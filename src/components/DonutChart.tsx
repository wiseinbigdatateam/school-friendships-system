import React from 'react';

interface DonutChartProps {
  title: string;
  value: number;
  total: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const DonutChart: React.FC<DonutChartProps> = ({ title, value, total, color, size = 'md' }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const circumference = 2 * Math.PI * 40; // 반지름 40
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <h4 className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>{title}</h4>
      
      <div className={`relative ${sizeClasses[size]}`}>
        {/* 배경 원 */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* 진행률 원 */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold text-gray-900 ${textSizeClasses[size]}`}>
            {value}
          </span>
          <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
            / {total}
          </span>
        </div>
      </div>
      
      <span className={`font-medium text-gray-600 ${textSizeClasses[size]}`}>
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
};

export default DonutChart;
