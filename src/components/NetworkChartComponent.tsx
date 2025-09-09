import React, { useEffect, useState } from 'react';
import { NetworkNode, NetworkEdge, NetworkAnalysisData } from '../types';
import NetworkVisualization from './NetworkVisualization';
import { FRIENDSHIP_TYPE_COLORS, FRIENDSHIP_TYPES } from '../utils/colorMapping';

interface NetworkChartComponentProps {
  chartData: NetworkAnalysisData[];
}

const NetworkChartComponent: React.FC<NetworkChartComponentProps> = ({ chartData }) => {
  const [firstGraphData, setFirstGraphData] = useState<NetworkAnalysisData | null>(null);
  const [secondGraphData, setSecondGraphData] = useState<NetworkAnalysisData | null>(null);

  // 실제 네트워크 데이터 사용
  const getNetworkData = (data: NetworkAnalysisData) => {
    console.log('📊 실제 네트워크 데이터 사용:', data);
    console.log('📊 노드 수:', data.nodes.length);
    console.log('📊 엣지 수:', data.edges.length);
    console.log('📊 친구 관계 유형:', data.friendship_types);
    return data;
  };

  useEffect(() => {
    if (chartData && chartData.length > 0) {
      console.log('📊 NetworkChartComponent 데이터 수신:', chartData);
      setFirstGraphData(chartData[0]);
      if (chartData.length > 1) {
        setSecondGraphData(chartData[1]);
        console.log('📊 비교분석을 위한 두 번째 데이터:', chartData[1]);
      } else {
        setSecondGraphData(null);
      }
    }
  }, [chartData]);

  if (!firstGraphData) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-600">친구 관계 데이터를 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 첫 번째 네트워크 그래프 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 첫 번째 설문 - 학급 친구 관계 현황</h3>
        <p className="text-sm text-gray-600 mb-6">
          첫 번째 선택한 설문의 학급 내 학생들의 친구 관계를 시각화합니다.
        </p>
        
        <div className="relative">
          <NetworkVisualization data={getNetworkData(firstGraphData)} />
        </div>

        {/* 통계 정보 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800">총 학생 수</h4>
            <p className="text-2xl font-bold text-blue-900">{firstGraphData.metrics.total_students}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-800">총 친구 관계</h4>
            <p className="text-2xl font-bold text-green-900">{firstGraphData.metrics.total_relationships}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-purple-800">친구 관계 밀도</h4>
            <p className="text-2xl font-bold text-purple-900">{(firstGraphData.metrics.network_density * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-orange-800">친구 그룹 수</h4>
            <p className="text-2xl font-bold text-orange-900">{firstGraphData.metrics.connected_components}</p>
          </div>
        </div>
      </div>

      {/* 두 번째 네트워크 그래프 (두 개의 데이터가 있을 때) */}
      {secondGraphData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 두 번째 설문 - 학급 친구 관계 현황</h3>
          <p className="text-sm text-gray-600 mb-6">
            두 번째 선택한 설문의 학급 내 학생들의 친구 관계를 시각화합니다.
          </p>
          
          <div className="relative">
            <NetworkVisualization data={getNetworkData(secondGraphData)} />
          </div>

          {/* 통계 정보 */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800">총 학생 수</h4>
              <p className="text-2xl font-bold text-blue-900">{secondGraphData.metrics.total_students}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800">총 친구 관계</h4>
              <p className="text-2xl font-bold text-green-900">{secondGraphData.metrics.total_relationships}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800">친구 관계 밀도</h4>
              <p className="text-2xl font-bold text-purple-900">{(secondGraphData.metrics.network_density * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800">친구 그룹 수</h4>
              <p className="text-2xl font-bold text-orange-900">{secondGraphData.metrics.connected_components}</p>
            </div>
          </div>
        </div>
      )}

      {/* 비교 분석 (두 개의 데이터가 있을 때) */}
      {firstGraphData && secondGraphData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 학급 친구 관계 변화 분석</h3>
          <p className="text-sm text-gray-600 mb-6">
            두 시기의 설문 결과를 비교하여 학급 내 친구 관계가 어떻게 변화했는지 확인할 수 있습니다.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 주요 지표 비교 - 안정성 지표 형태 */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">🔍 학급 친구 관계 안정성 지표</h4>
              <p className="text-sm text-gray-600">
                각 지표의 수치가 높을수록 학급 내 친구 관계가 더 활발하고 안정적임을 의미합니다.
              </p>
              
              {/* 네트워크 밀도 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">친구 관계 밀도</span>
                  <span className="text-xs text-gray-500">학급 내 친구 관계의 활발함</span>
                </div>
                <div className="relative bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-6 rounded-full flex items-center justify-center"
                    style={{ width: `${Math.min(100, (secondGraphData.metrics.network_density * 100))}%` }}
                  >
                    <span className="text-xs font-bold text-white">
                      {secondGraphData.metrics.network_density.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>낮음 (0.0)</span>
                  <span>보통 (0.5)</span>
                  <span>높음 (1.0)</span>
                </div>
              </div>

              {/* 평균 경로 길이 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">친구 연결 효율성</span>
                  <span className="text-xs text-gray-500">친구를 통해 다른 친구를 만나는 용이함</span>
                </div>
                <div className="relative bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 h-6 rounded-full flex items-center justify-center"
                    style={{ width: `${Math.min(100, Math.max(0, 100 - (secondGraphData.metrics.average_path_length * 20)))}%` }}
                  >
                    <span className="text-xs font-bold text-white">
                      {secondGraphData.metrics.average_path_length.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>효율적 (1.0)</span>
                  <span>보통 (3.0)</span>
                  <span>비효율적 (5.0)</span>
                </div>
              </div>

              {/* 클러스터링 계수 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">소그룹 형성도</span>
                  <span className="text-xs text-gray-500">작은 친구 그룹이 얼마나 잘 형성되는지</span>
                </div>
                <div className="relative bg-gray-200 rounded-full h-6">
                  <div 
                    className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-6 rounded-full flex items-center justify-center"
                    style={{ width: `${Math.min(100, (secondGraphData.metrics.clustering_coefficient * 100))}%` }}
                  >
                    <span className="text-xs font-bold text-white">
                      {secondGraphData.metrics.clustering_coefficient.toFixed(3)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>낮음 (0.0)</span>
                  <span>보통 (0.5)</span>
                  <span>높음 (1.0)</span>
                </div>
              </div>
            </div>

            {/* 친구 관계 유형 변화 */}
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">👥 학생 유형별 변화</h4>
              <p className="text-sm text-gray-600">
                각 학생 유형의 변화를 통해 학급 전체의 친구 관계 패턴을 파악할 수 있습니다.
              </p>
              <div className="space-y-3">
                {FRIENDSHIP_TYPES.map((type) => {
                  // 실제 노드 데이터에서 해당 유형의 개수 계산
                  const firstCount = firstGraphData.nodes.filter((node: NetworkNode) => node.friendship_type === type).length;
                  const secondCount = secondGraphData.nodes.filter((node: NetworkNode) => node.friendship_type === type).length;
                  const change = secondCount - firstCount;
                  
                  return (
                    <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: FRIENDSHIP_TYPE_COLORS[type] }}
                        />
                        <span className="text-sm text-gray-600">{type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{firstCount}명</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm">{secondCount}명</span>
                        {change !== 0 && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            change > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {change > 0 ? '+' : ''}{change}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkChartComponent;