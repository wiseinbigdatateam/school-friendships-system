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

  useEffect(() => {
    if (!networkRef.current || !data.nodes.length) return;

    // 기존 네트워크 인스턴스 정리
    if (networkInstanceRef.current) {
      networkInstanceRef.current.destroy();
      networkInstanceRef.current = null;
    }

    // vis-network용 데이터 변환
    const visNodes = data.nodes.map((node) => ({
      id: node.id,
      label: node.name,
      color: {
        background: colorMap[node.friendship_type] || "#94a3b8",
        border: "#ffffff",
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
      font: {
        size: 12,
        color: "#333333",
        face: "Arial, sans-serif",
        strokeWidth: 0,
      },
      title: `${node.name}\n${node.friendship_type}\n연결 수: ${node.connection_count || 0}`,
      // 원본 데이터 저장
      originalData: node,
    }));

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
        borderWidth: 0,
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
          setSelectedNode(node);
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
      {/* 범례 */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur-sm">
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
              <span className="text-sm font-medium text-gray-700">
                {type}: {count}명
              </span>
            </div>
          ))}
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
