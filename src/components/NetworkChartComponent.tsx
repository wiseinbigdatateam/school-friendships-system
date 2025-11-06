import React, { useEffect, useState } from "react";
import { NetworkNode, NetworkAnalysisData } from "../types";
import NetworkVisualization from "./NetworkVisualization";
import {
  FRIENDSHIP_TYPE_COLORS,
  FRIENDSHIP_TYPES,
} from "../utils/colorMapping";
import { Check, TriangleAlert } from "lucide-react";

interface NetworkChartComponentProps {
  chartData: NetworkAnalysisData[];
  activeTab: number;
  onNodeClick?: (node: any) => void;
  selectedStudentData?: {
    id: string;
    name: string;
    grade: string;
    class: string;
    friendship_type: string;
    centrality: number;
    degree: number;
    connection_count: number;
  } | null;
}

const friendType = [
  {
    type: "외톨이형",
    color: "#FF6B6B",
  },
  {
    type: "소수 친구 학생",
    color: "#4ECDC4",
  },
  {
    type: "평균적인 학생",
    color: "#45B7D1",
  },
  {
    type: "친구 많은 학생",
    color: "#96CEB4",
  },
  {
    type: "사교 스타",
    color: "#FFEAA7",
  },
];

const NetworkChartComponent: React.FC<NetworkChartComponentProps> = ({
  chartData,
  activeTab,
  onNodeClick,
  selectedStudentData,
}) => {
  const [firstGraphData, setFirstGraphData] =
    useState<NetworkAnalysisData | null>(null);
  const [secondGraphData, setSecondGraphData] =
    useState<NetworkAnalysisData | null>(null);

  // 클러스터 수 계산 유틸리티 함수 (외톨이형 제외)
  const getClusterCount = (graphData: NetworkAnalysisData): number => {
    const clusters = new Map<number, any>();
    graphData.nodes.forEach((node) => {
      // 외톨이형은 그룹 수에서 제외
      if (node.friendship_type === "외톨이형") {
        return;
      }
      const clusterId = node.community ?? 0;
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, []);
      }
      clusters.get(clusterId)?.push(node);
    });
    return clusters.size;
  };

  // 실제 네트워크 데이터 사용
  const getNetworkData = (data: NetworkAnalysisData) => {
    console.log("🔄 getNetworkData 호출됨:", data);
    return data;
  };

  useEffect(() => {
    console.log("📊 NetworkChartComponent - chartData 받음:", chartData);
    if (chartData && chartData.length > 0) {
      console.log("✅ chartData[0]:", chartData[0]);
      setFirstGraphData(chartData[0]);
      if (chartData.length > 1) {
        console.log("✅ chartData[1]:", chartData[1]);
        setSecondGraphData(chartData[1]);
      } else {
        setSecondGraphData(null);
      }
    }
  }, [chartData]);

  if (!firstGraphData) {
    console.log("⚠️ firstGraphData가 없음!");
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="text-gray-600">친구 관계 데이터를 로딩 중...</p>
      </div>
    );
  }

  console.log(
    "🎯 렌더링 시작 - activeTab:",
    activeTab,
    "firstGraphData:",
    firstGraphData,
  );

  return (
    <div className="space-y-6">
      {/* 첫 번째 네트워크 그래프 */}
      {activeTab === 1 && (
        <div className="rounded-lg bg-white p-4">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            첫 번째 설문 - 학급 친구 관계 현황
          </h3>

          <div className="mb-4 flex justify-between">
            <p className="text-sm text-gray-600">
              첫 번째 선택한 설문의 학급 내 학생들의 친구 관계를 시각화합니다.
            </p>

            {/* 친구 유형 범례 */}
            <div className="flex gap-3">
              {friendType.map((item) => (
                <div key={item.type} className="flex items-center gap-1">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <NetworkVisualization
              data={getNetworkData(firstGraphData)}
              onNodeClick={onNodeClick}
            />
          </div>

          {/* 기본 통계 정보 */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">총 학생 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {firstGraphData.metrics.total_students}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">친구 관계 밀도</p>
              <p className="text-2xl font-semibold text-blue-700">
                {(firstGraphData.metrics.network_density * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">친구 그룹 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {getClusterCount(firstGraphData)}개
              </p>
              <p className="mt-1 text-xs text-blue-600">
                {(() => {
                  const clusterCount = getClusterCount(firstGraphData);
                  return clusterCount <= 2
                    ? "매우 통합됨"
                    : clusterCount <= 4
                      ? "적절함"
                      : clusterCount <= 6
                        ? "다소 분산됨"
                        : "주의 필요";
                })()}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">평균 친구 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {firstGraphData.metrics.average_degree.toFixed(1)}명
              </p>
            </div>
          </div>

          {/* 단일 설문일 때만 안정성 지표와 학생 유형별 수 표시 */}
          {!secondGraphData && (
            <>
              {/* 선택된 학생 정보 섹션 */}
              {selectedStudentData && (
                <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xl font-semibold text-gray-900">
                    선택된 학생 정보
                  </h3>
                  <p className="mb-6 text-sm text-gray-600">
                    네트워크 그래프에서 클릭한 학생의 상세 정보를 확인할 수
                    있습니다.
                  </p>

                  <div className="rounded-lg bg-blue-50 p-6">
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          이름:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {selectedStudentData.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{
                            backgroundColor:
                              selectedStudentData.friendship_type === "외톨이형"
                                ? "#FF6B6B"
                                : selectedStudentData.friendship_type ===
                                    "소수 친구 학생"
                                  ? "#4ECDC4"
                                  : selectedStudentData.friendship_type ===
                                      "평균적인 학생"
                                    ? "#45B7D1"
                                    : selectedStudentData.friendship_type ===
                                        "친구 많은 학생"
                                      ? "#96CEB4"
                                      : selectedStudentData.friendship_type ===
                                          "사교 스타"
                                        ? "#FFEAA7"
                                        : "#45B7D1",
                          }}
                        ></div>
                        <span className="text-sm font-medium text-gray-600">
                          유형:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {selectedStudentData.friendship_type ||
                            "평균적인 학생"}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          연결 수:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {selectedStudentData.connection_count || 0}명
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          연결 정도:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                          {(
                            (selectedStudentData.centrality || 0) * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-8">
                {/* 학급 친구 관계 안정성 지표 */}
                <div className="mt-8 w-1/2 rounded-lg bg-white">
                  <h4 className="mb-1 text-lg font-medium text-gray-950">
                    학급 친구 관계 안정성 지표
                  </h4>
                  <p className="mb-4 text-sm text-gray-600">
                    각 지표의 수치가 높을수록 학급 내 친구 관계가 더 활발하고
                    안정적임을 의미합니다.
                  </p>

                  <div className="grid grid-cols-1 gap-6 rounded-lg border border-dashed border-gray-400 p-6">
                    {/* 네트워크 밀도 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                          <li>친구 관계 밀도</li>
                        </ul>
                        <span className="text-sm text-gray-500">
                          학급 내 친구 관계의 활발함
                        </span>
                      </div>
                      <div className="relative h-5 rounded-full bg-gray-200">
                        <div
                          className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                          style={{
                            width: `${Math.min(100, firstGraphData.metrics.network_density * 100)}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {firstGraphData.metrics.network_density.toFixed(3)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-700">
                        <span>낮음 (0.0)</span>
                        <span>보통 (0.5)</span>
                        <span>높음 (1.0)</span>
                      </div>
                    </div>

                    {/* 평균 경로 길이 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                          <li>친구 연결 효율성</li>
                        </ul>
                        <span className="text-sm text-gray-500">
                          친구를 통해 다른 친구를 만나는 용이함
                        </span>
                      </div>
                      <div className="relative h-5 rounded-full bg-gray-200">
                        <div
                          className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                          style={{
                            width: `${Math.min(100, Math.max(0, 100 - firstGraphData.metrics.average_path_length * 20))}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {firstGraphData.metrics.average_path_length.toFixed(
                              2,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-700">
                        <span>효율적 (1.0)</span>
                        <span>보통 (3.0)</span>
                        <span>비효율적 (5.0)</span>
                      </div>
                    </div>

                    {/* 클러스터링 계수 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                          <li>소그룹 형성도</li>
                        </ul>
                        <span className="text-sm text-gray-500">
                          작은 친구 그룹이 얼마나 잘 형성되는지
                        </span>
                      </div>
                      <div className="relative h-5 rounded-full bg-gray-200">
                        <div
                          className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                          style={{
                            width: `${Math.min(100, firstGraphData.metrics.clustering_coefficient * 100)}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {firstGraphData.metrics.clustering_coefficient.toFixed(
                              3,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-700">
                        <span>낮음 (0.0)</span>
                        <span>보통 (0.5)</span>
                        <span>높음 (1.0)</span>
                      </div>
                    </div>

                    {/* 모듈성 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                          <li>커뮤니티 구조성</li>
                        </ul>
                        <span className="text-sm text-gray-500">
                          명확한 친구 그룹이 얼마나 잘 형성되는지
                        </span>
                      </div>
                      <div className="relative h-5 rounded-full bg-gray-200">
                        <div
                          className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                          style={{
                            width: `${Math.min(100, Math.max(0, firstGraphData.metrics.modularity * 100))}%`,
                          }}
                        >
                          <span className="text-xs font-bold text-white">
                            {firstGraphData.metrics.modularity.toFixed(3)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-700">
                        <span>낮음 (0.0)</span>
                        <span>보통 (0.3)</span>
                        <span>높음 (0.7)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 학생 유형별 수 */}
                <div className="mt-8 w-1/2 rounded-lg bg-white">
                  <h4 className="mb-1 text-lg font-medium text-gray-900">
                    학생 유형별 분포
                  </h4>
                  <p className="mb-4 text-sm text-gray-600">
                    각 학생의 친구 관계 패턴에 따른 유형별 분포를 확인할 수
                    있습니다.
                  </p>

                  <div className="grid grid-cols-1 gap-2.5 rounded-lg border border-dashed border-gray-400 p-6">
                    {FRIENDSHIP_TYPES.map((type) => {
                      const count = firstGraphData.nodes.filter(
                        (node: NetworkNode) => node.friendship_type === type,
                      ).length;
                      const percentage =
                        firstGraphData.metrics.total_students > 0
                          ? (
                              (count / firstGraphData.metrics.total_students) *
                              100
                            ).toFixed(1)
                          : "0.0";

                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between rounded-xl bg-gray-50 px-6 py-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="h-4 w-4 rounded-full"
                              style={{
                                backgroundColor: FRIENDSHIP_TYPE_COLORS[type],
                              }}
                            />
                            <div>
                              <span className="text-sm font-semibold text-gray-950">
                                {type}
                              </span>
                              <div className="text-xs text-gray-500">
                                {percentage}%
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">
                              {count}명
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 두 번째 네트워크 그래프 (두 개의 데이터가 있을 때) */}
      {secondGraphData && activeTab === 2 && (
        <div className="rounded-lg bg-white p-4">
          <h3 className="mb-4 text-xl font-semibold text-gray-900">
            두 번째 설문 - 학급 친구 관계 현황
          </h3>
          <p className="mb-6 text-sm text-gray-600">
            두 번째 선택한 설문의 학급 내 학생들의 친구 관계를 시각화합니다.
          </p>

          <div className="relative">
            <NetworkVisualization
              data={getNetworkData(secondGraphData)}
              onNodeClick={onNodeClick}
            />
          </div>

          {/* 기본 통계 정보 */}
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">총 학생 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {firstGraphData.metrics.total_students}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">친구 관계 밀도</p>
              <p className="text-2xl font-semibold text-blue-700">
                {(firstGraphData.metrics.network_density * 100).toFixed(1)}%
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">친구 그룹 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {getClusterCount(firstGraphData)}개
              </p>
              <p className="mt-1 text-xs text-blue-600">
                {(() => {
                  const clusterCount = getClusterCount(firstGraphData);
                  return clusterCount <= 2
                    ? "매우 통합됨"
                    : clusterCount <= 4
                      ? "적절함"
                      : clusterCount <= 6
                        ? "다소 분산됨"
                        : "주의 필요";
                })()}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-blue-700">평균 친구 수</p>
              <p className="text-2xl font-semibold text-blue-700">
                {firstGraphData.metrics.average_degree.toFixed(1)}명
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 비교 분석 (두 개의 데이터가 있을 때) */}
      {firstGraphData && secondGraphData && (
        <div className="rounded-lg bg-white p-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* 주요 지표 비교 - 안정성 지표 변화 형태 */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-semibold text-gray-950">
                  학급 친구 관계 안정성 지표의 변화
                </h4>
                <p className="text-sm text-gray-500">
                  두 시기 간의 지표 변화를 통해 학급 내 친구 관계가 어떻게
                  발전했는지 확인할 수 있습니다.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                {/* 친구 그룹 수 변화 */}
                <div className="rounded-lg border border-dashed border-gray-400 bg-gray-100 px-6 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      친구 그룹 수 변화
                    </span>
                    {(() => {
                      const firstClusterCount = getClusterCount(firstGraphData);
                      const secondClusterCount =
                        getClusterCount(secondGraphData);
                      const change = secondClusterCount - firstClusterCount;
                      const isPositive = change < 0; // 그룹 수가 줄어든 것이 긍정적
                      return (
                        <span
                          className={`text-sm ${
                            isPositive
                              ? "text-green-500"
                              : change === 0
                                ? "text-gray-500"
                                : "text-red-500"
                          }`}
                        >
                          {change > 0 ? "+" : ""}
                          {change}개
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-blue-700">
                        {getClusterCount(firstGraphData)}개
                      </div>
                      <div className="text-xs text-gray-500">첫 번째 설문</div>
                    </div>
                    <div className="text-2xl">
                      {(() => {
                        const firstCount = getClusterCount(firstGraphData);
                        const secondCount = getClusterCount(secondGraphData);
                        return secondCount < firstCount ? (
                          <p>vs</p>
                        ) : secondCount > firstCount ? (
                          <TriangleAlert color="#1d4Ed8" />
                        ) : (
                          "→"
                        );
                      })()}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-semibold text-blue-700">
                        {getClusterCount(secondGraphData)}개
                      </div>
                      <div className="text-xs text-gray-500">두 번째 설문</div>
                    </div>
                  </div>
                  <p className="mt-1 text-center text-xs text-blue-700">
                    {(() => {
                      const firstCount = getClusterCount(firstGraphData);
                      const secondCount = getClusterCount(secondGraphData);
                      return secondCount < firstCount
                        ? "그룹이 통합되어 학급 응집력이 향상되었습니다"
                        : secondCount > firstCount
                          ? "그룹이 분산되어 학급 통합에 관심이 필요합니다"
                          : "그룹 수는 동일하게 유지되고 있습니다";
                    })()}
                  </p>
                </div>

                <div className="flex flex-col gap-5 rounded-lg border border-dashed border-gray-400 bg-white p-6">
                  {/* 네트워크 밀도 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                        <li>친구 관계 밀도</li>
                      </ul>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          학급 내 친구 관계의 활발함
                        </span>
                        {(() => {
                          const change =
                            secondGraphData.metrics.network_density -
                            firstGraphData.metrics.network_density;
                          const changePercent = (change * 100).toFixed(1);
                          return (
                            <span
                              className={`text-xs font-medium ${
                                change > 0
                                  ? "text-emerald-600"
                                  : change < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {changePercent}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="relative h-5 rounded-full bg-gray-200">
                      <div
                        className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{
                          width: `${Math.min(100, secondGraphData.metrics.network_density * 100)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {secondGraphData.metrics.network_density.toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span>낮음 (0.0)</span>
                      <span>보통 (0.5)</span>
                      <span>높음 (1.0)</span>
                    </div>
                  </div>

                  {/* 평균 경로 길이 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                        <li>친구 연결 효율성</li>
                      </ul>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          친구를 통해 다른 친구를 만나는 용이함
                        </span>
                        {(() => {
                          const change =
                            firstGraphData.metrics.average_path_length -
                            secondGraphData.metrics.average_path_length;
                          const changePercent = (change * 100).toFixed(1);
                          return (
                            <span
                              className={`text-xs font-medium ${
                                change > 0
                                  ? "text-emerald-600"
                                  : change < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {changePercent}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="relative h-5 rounded-full bg-gray-200">
                      <div
                        className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
                        style={{
                          width: `${Math.min(100, Math.max(0, 100 - secondGraphData.metrics.average_path_length * 20))}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {secondGraphData.metrics.average_path_length.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span>효율적 (1.0)</span>
                      <span>보통 (3.0)</span>
                      <span>비효율적 (5.0)</span>
                    </div>
                  </div>

                  {/* 클러스터링 계수 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                        <li>소그룹 형성도</li>
                      </ul>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          작은 친구 그룹이 얼마나 잘 형성되는지
                        </span>
                        {(() => {
                          const change =
                            secondGraphData.metrics.clustering_coefficient -
                            firstGraphData.metrics.clustering_coefficient;
                          const changePercent = (change * 100).toFixed(1);
                          return (
                            <span
                              className={`text-xs font-medium ${
                                change > 0
                                  ? "text-emerald-600"
                                  : change < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {changePercent}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="relative h-5 rounded-full bg-gray-200">
                      <div
                        className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{
                          width: `${Math.min(100, secondGraphData.metrics.clustering_coefficient * 100)}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {secondGraphData.metrics.clustering_coefficient.toFixed(
                            3,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span>낮음 (0.0)</span>
                      <span>보통 (0.5)</span>
                      <span>높음 (1.0)</span>
                    </div>
                  </div>

                  {/* 모듈성 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <ul className="ml-5 list-disc text-sm font-medium text-gray-950">
                        <li>커뮤니티 구조성</li>
                      </ul>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          명확한 친구 그룹이 얼마나 잘 형성되는지
                        </span>
                        {(() => {
                          const change =
                            secondGraphData.metrics.modularity -
                            firstGraphData.metrics.modularity;
                          const changePercent = (change * 100).toFixed(1);
                          return (
                            <span
                              className={`text-xs font-medium ${
                                change > 0
                                  ? "text-green-600"
                                  : change < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {changePercent}%
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="relative h-5 rounded-full bg-gray-200">
                      <div
                        className="flex h-5 items-center justify-center rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{
                          width: `${Math.min(100, Math.max(0, secondGraphData.metrics.modularity * 100))}%`,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {secondGraphData.metrics.modularity.toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span>낮음 (0.0)</span>
                      <span>보통 (0.3)</span>
                      <span>높음 (0.7)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 친구 관계 유형 변화 */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-lg font-semibold text-gray-950">
                  학생 유형별 변화
                </h4>
                <p className="text-sm text-gray-500">
                  각 학생 유형의 변화를 통해 학급 전체의 친구 관계 패턴을 파악할
                  수 있습니다.
                </p>
              </div>

              <div className="flex h-full flex-col rounded-lg border border-dashed border-gray-400 bg-white p-6">
                <div className="space-y-4">
                  {FRIENDSHIP_TYPES.map((type) => {
                    // 실제 노드 데이터에서 해당 유형의 개수 계산
                    const firstCount = firstGraphData.nodes.filter(
                      (node: NetworkNode) => node.friendship_type === type,
                    ).length;
                    const secondCount = secondGraphData.nodes.filter(
                      (node: NetworkNode) => node.friendship_type === type,
                    ).length;
                    const change = secondCount - firstCount;

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-6 py-4"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: FRIENDSHIP_TYPE_COLORS[type],
                            }}
                          />
                          <span className="text-sm font-semibold text-gray-950">
                            {type}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-semibold text-gray-950">
                            {firstCount}명
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-sm font-semibold text-gray-950">
                            {secondCount}명
                          </span>
                          {change !== 0 && (
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                change > 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-[#b60000]"
                              }`}
                            >
                              {change > 0 ? "+" : ""}
                              {change}
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
        </div>
      )}
    </div>
  );
};

export default NetworkChartComponent;
