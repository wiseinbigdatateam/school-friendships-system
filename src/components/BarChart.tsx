import React from 'react';

interface BarChartProps {
  data: Array<{
    date: string;
    count: number;
    cumulative: number;
  }>;
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>데이터가 없습니다.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));
  const maxCumulative = Math.max(...data.map(d => d.cumulative));
  const maxValue = Math.max(maxCount, maxCumulative);

  // Y축 값을 2씩 증가하도록 설정 (20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 0)
  const yAxisValues = [];
  for (let i = maxValue; i >= 0; i -= 2) {
    yAxisValues.push(i);
  }

  return (
    <div className="space-y-6">
      {/* 차트 헤더 */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>응답수 (명)</span>
        <span>누적 응답수 (명)</span>
      </div>

      {/* 차트 컨테이너 */}
      <div className="relative h-96 bg-blue-600 rounded-lg overflow-hidden">
        {/* Y축 라벨과 그리드 라인 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
          {yAxisValues.map((value, index) => (
            <div key={index} className="relative flex items-center">
              <span className="text-xs text-white font-medium w-8 text-right">{value}</span>
              <div className="absolute left-12 w-full h-px bg-white opacity-30" style={{ width: 'calc(100vw - 3rem)' }}></div>
            </div>
          ))}
        </div>

        {/* 차트 영역 */}
        <div className="ml-12 h-full py-4 pb-12 flex items-end justify-between px-8">
          {data.map((item, index) => (
            <div key={item.date} className="flex flex-col items-center h-full justify-end">
              {/* 응답수 바 */}
              {item.count > 0 && (
                <div 
                  className="w-4 bg-white transition-all duration-500"
                  style={{ 
                    height: `${(item.count / maxValue) * 100}%`,
                    minHeight: item.count > 0 ? '2px' : '0px'
                  }}
                ></div>
              )}
            </div>
          ))}
        </div>

        {/* X축 날짜 라벨 - 0 라인 밑 공간에 배치 */}
        <div className="ml-12 h-12 flex justify-between px-8 items-center">
          {data.map((item) => (
            <span key={item.date} className="text-sm text-white font-semibold whitespace-nowrap">
              {item.date}
            </span>
          ))}
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="mt-8">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">구분</th>
              {data.map((item) => (
                <th key={item.date} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  {item.date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">응답수 (명)</td>
              {data.map((item) => (
                <td key={item.date} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {item.count}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">누적 응답수 (명)</td>
              {data.map((item) => (
                <td key={item.date} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                  {item.cumulative}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BarChart;
