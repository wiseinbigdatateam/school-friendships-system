import React, { useEffect, useRef, useState, useMemo } from "react";
import { Network } from "vis-network";
import { NetworkNode, NetworkEdge } from "../types";

interface NetworkVisualizationProps {
  data: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
  period?: string;
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  data,
  period,
  width = 900,
  height = 750,
  onNodeClick,
}) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstanceRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);

  // 색상 매핑
  const colorMap = useMemo(
    (): { [key: string]: string } => ({
      외톨이형: "#FF6B6B",
      "소수 친구 학생": "#4ECDC4",
      "평균적인 학생": "#45B7D1",
      "친구 많은 학생": "#96CEB4",
      "사교 스타": "#FFEAA7",
    }),
    [],
  );

  // 클러스터별 색상 매핑 (연한 배경색)
  const clusterColors = useMemo(
    (): string[] => [
      "#E3F2FD", // 연한 파랑
      "#F3E5F5", // 연한 보라
      "#E8F5E9", // 연한 초록
      "#FFF3E0", // 연한 주황
      "#FCE4EC", // 연한 분홍
      "#E0F2F1", // 연한 청록
      "#FFF9C4", // 연한 노랑
      "#F1F8E9", // 연한 라임
      "#E1BEE7", // 연한 자주
      "#FFCCBC", // 연한 빨강
    ],
    [],
  );

  // 클러스터 정보 계산
  const clusterInfo = useMemo(() => {
    const clusters = new Map<number, NetworkNode[]>();
    data.nodes.forEach((node) => {
      const clusterId = node.community ?? 0;
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, []);
      }
      clusters.get(clusterId)?.push(node);
    });
    return Array.from(clusters.entries()).map(([id, nodes]) => ({
      id,
      size: nodes.length,
      nodes,
      color: clusterColors[id % clusterColors.length],
    }));
  }, [data.nodes, clusterColors]);

  useEffect(() => {
    if (!networkRef.current || !data.nodes.length) return;

    // 기존 네트워크 인스턴스 정리
    if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
      networkInstanceRef.current = null;
    }

    // vis-network용 데이터 변환
    const visNodes = data.nodes.map((node) => {
      const clusterId = node.community ?? 0;
      const clusterBgColor = clusterColors[clusterId % clusterColors.length];
      
      return {
        id: node.id,
        label: node.name,
        group: `cluster_${clusterId}`, // 그룹 ID 설정 (문자열로 변환)
        color: {
          background: colorMap[node.friendship_type] || "#94a3b8",
          border: clusterBgColor, // 클러스터 색상을 테두리로 표시
          highlight: {
            background: colorMap[node.friendship_type] || "#94a3b8",
            border: "#3F80EA",
          },
          hover: {
            background: colorMap[node.friendship_type] || "#94a3b8",
            border: "#3F80EA",
          },
        },
        size: 25,
        borderWidth: 3, // 테두리 두껍게
        font: {
          size: 12,
          color: "#333333",
          face: "Arial, sans-serif",
          strokeWidth: 0,
        },
        title: `${node.name}\n${node.friendship_type}\n연결 수: ${node.connection_count || 0}\n친구 그룹: ${clusterId + 1}`,
        // 원본 데이터 저장
        originalData: node,
      };
    });

    const visEdges = data.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}`,
      from: edge.source,
      to: edge.target,
      color: {
        color: "#999999",
        highlight: "#3F80EA",
        hover: "#3F80EA",
      },
      width: 1,
      smooth: false,
      title: `관계: ${edge.relationship_type || "기타"}`,
    }));

    // 네트워크 옵션 설정
    const options = {
      nodes: {
        shape: "circle",
        size: 25,
        font: {
          size: 12,
          color: "#333333",
          face: "Arial, sans-serif",
          strokeWidth: 0,
        },
        borderWidth: 3,
        shadow: {
          enabled: false,
        },
      },
      edges: {
        width: 1,
        color: {
          color: "#999999",
          highlight: "#3F80EA",
          hover: "#3F80EA",
        },
        smooth: false,
        shadow: {
          enabled: false,
        },
      },
      physics: {
        enabled: true,
        stabilization: {
          enabled: true,
          iterations: 200,
          updateInterval: 25,
        },
        barnesHut: {
          gravitationalConstant: -800,
          centralGravity: 0.1,
          springLength: 200,
          springConstant: 0.01,
          damping: 0.09,
          avoidOverlap: 0.5,
        },
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: false,
        dragNodes: true, // 노드 드래그 활성화
        dragView: false,
        zoomView: false,
        zoomSpeed: 1,
        tooltipDelay: 200,
      },
      layout: {
        improvedLayout: true,
        clusterThreshold: 150,
      },
      // 그룹별 설정
      groups: {} as any,
    };

    // 네트워크 생성
    const network = new Network(
      networkRef.current,
      { nodes: visNodes, edges: visEdges },
      options,
    );
    networkInstanceRef.current = network;

    // 이벤트 리스너 등록
    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = data.nodes.find((n) => n.id === nodeId);
        if (node) {
          // setSelectedNode(node); // 상태 변경으로 인한 재로드 방지
          onNodeClick?.(node);
        }
      }
    });

    // 네트워크가 안정화되면 줌 조정
    network.on("stabilizationIterationsDone", () => {
      network.fit();
    });

    return () => {
      if (networkInstanceRef.current) {
        networkInstanceRef.current.destroy();
        networkInstanceRef.current = null;
      }
    };
  }, [data, period, width, height, onNodeClick, colorMap]);

  return (
    <div className="network-visualization relative">
      {/* 친구 유형 범례 */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-3 shadow-md">
        <h4 className="mb-2 text-sm font-bold text-gray-800">친구 유형</h4>
        <div className="space-y-2">
          {[
            {
              type: "외톨이형",
              color: "#FF6B6B",
              count: data.nodes.filter((n) => n.friendship_type === "외톨이형")
                .length,
            },
            {
              type: "소수 친구 학생",
              color: "#4ECDC4",
              count: data.nodes.filter(
                (n) => n.friendship_type === "소수 친구 학생",
              ).length,
            },
            {
              type: "평균적인 학생",
              color: "#45B7D1",
              count: data.nodes.filter(
                (n) => n.friendship_type === "평균적인 학생",
              ).length,
            },
            {
              type: "친구 많은 학생",
              color: "#96CEB4",
              count: data.nodes.filter(
                (n) => n.friendship_type === "친구 많은 학생",
              ).length,
            },
            {
              type: "사교 스타",
              color: "#FFEAA7",
              count: data.nodes.filter((n) => n.friendship_type === "사교 스타")
                .length,
            },
          ].map(({ type, color, count }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-gray-700">
                {type}: {count}명
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 친구 그룹 정보 */}
      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 p-3 shadow-md">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-800">친구 그룹</h4>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
            {clusterInfo.length}개
          </span>
        </div>
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {clusterInfo
            .sort((a, b) => b.size - a.size)
            .map((cluster) => (
              <div
                key={cluster.id}
                onMouseEnter={() => setHoveredCluster(cluster.id)}
                onMouseLeave={() => setHoveredCluster(null)}
                className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1 transition-all ${
                  hoveredCluster === cluster.id
                    ? "bg-blue-100 shadow-sm"
                    : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-sm border-2"
                    style={{
                      borderColor: cluster.color,
                      backgroundColor: cluster.color + "80",
                    }}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    그룹 {cluster.id + 1}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-900">
                  {cluster.size}명
                </span>
              </div>
            ))}
        </div>
        <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-500">
          💡 노드 테두리 색상이 그룹을 나타냅니다
        </div>
      </div>

      {/* 네트워크 시각화 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div
          ref={networkRef}
          className="w-full"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>

      {selectedNode && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-blue-800">선택된 학생 정보</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              닫기
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-600">이름:</span>{" "}
              {selectedNode.name}
            </div>
            <div>
              <span className="font-medium text-gray-600">학년/반:</span>{" "}
              {selectedNode.grade}학년 {selectedNode.class}반
            </div>
            <div>
              <span className="font-medium text-gray-600">유형:</span>{" "}
              {selectedNode.friendship_type}
            </div>
            <div>
              <span className="font-medium text-gray-600">연결 수:</span>{" "}
              {selectedNode.connection_count}명
            </div>
            <div>
              <span className="font-medium text-gray-600">연결 정도:</span>{" "}
              {(selectedNode.centrality * 100).toFixed(1)}%
            </div>
            <div>
              <span className="font-medium text-gray-600">친구 그룹:</span>{" "}
              {selectedNode.community + 1}번 그룹
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
