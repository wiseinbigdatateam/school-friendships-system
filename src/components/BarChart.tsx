import { useState, useEffect, useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  LineElement,
  PointElement,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

interface BarChartProps {
  data: {
    date: string;
    count: number;
    cumulative: number;
  }[];
  totalStudents?: number;
}

interface GraphData {
  labels: string[];
  datasets: (
    | {
        type: "bar";
        label: string;
        data: number[];
        backgroundColor: string;
        barThickness: number;
        borderRadius: number;
      }
    | {
        type: "line";
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        borderWidth: number;
        pointRadius: number;
        pointBackgroundColor: string;
        pointBorderColor: string;
        fill: boolean;
      }
  )[];
}

const BarChart: React.FC<BarChartProps> = ({ data, totalStudents }) => {
  const [graphData, setGraphData] = useState<GraphData>({
    labels: [],
    datasets: [],
  });
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    if (data !== undefined) {
      setLabels(data.map((item) => item.date));
    }
  }, [data]);

  useEffect(() => {
    if (labels.length > 0) {
      setGraphData({
        labels: labels,
        datasets: [
          {
            type: "bar",
            label: "응답수",
            data: data.map((item) => {
              return item.count;
            }),
            backgroundColor: "rgba(256, 256, 256)",
            barThickness: 6,
            borderRadius: 5,
          },
          {
            type: "line",
            label: "누적 응답수",
            data: data.map((item) => {
              return item.cumulative;
            }),
            borderColor: "rgba(255, 255, 255, 0.8)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 3,
            pointRadius: 3,
            pointBackgroundColor: "rgba(255, 255, 255, 1)",
            pointBorderColor: "rgba(255, 255, 255, 1)",
            fill: false,
          },
        ],
      });
    }
  }, [labels, data]);

  const options = useMemo(() => ({
    responsive: true,
    // 캔버스 비율 유지
    maintainAspectRatio: false,
    devicePixelRatio: window.devicePixelRatio || 1,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      // x축 글씨 설정
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 13,
          },
          color: "#fff",
        },
      },
      // y축 글씨 및 동적 최대값 설정
      y: {
        max: totalStudents && totalStudents > 0 ? totalStudents : undefined,
        grid: {
          color: "rgba(228,228,228,0.3)", // x-axis grid color
        },
        ticks: {
          font: {
            size: 13,
          },
          color: "#fff",
        },
      },
    },
  }), [totalStudents]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 차트 헤더 */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>응답수 (명)</span>
        <span>누적 응답수 (명)</span>
      </div>

      {/* 차트 컨테이너 */}
      <div className="relative px-5 py-6 h-96 bg-[#3F80EA] rounded-lg overflow-hidden">
        <Chart type="bar" data={graphData} options={options} />
      </div>

      {/* 데이터 테이블 */}
      <div className="mt-8">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                구분
              </th>
              {data.map((item) => (
                <th
                  key={item.date}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                >
                  {item.date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                응답수 (명)
              </td>
              {data.map((item) => (
                <td
                  key={item.date}
                  className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center"
                >
                  {item.count}
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                누적 응답수 (명)
              </td>
              {data.map((item) => (
                <td
                  key={item.date}
                  className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center"
                >
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
