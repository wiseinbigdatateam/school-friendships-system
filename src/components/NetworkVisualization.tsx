import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
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
  width = 1200,
  height = 800,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set(),
  );

  // 클러스터 색상 정의
  const clusterColors = [
    "#3B82F6",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ];

  // 클러스터 정보 계산
  const clusterInfo = useMemo(() => {
    console.log("🎨 NetworkVisualization - 받은 데이터:", {
      노드수: data.nodes.length,
      엣지수: data.edges.length,
      nodes: data.nodes,
      edges: data.edges,
    });

    const clusters: { [key: number]: NetworkNode[] } = {};

    data.nodes.forEach((node) => {
      if (node.friendship_type !== "외톨이형") {
        const clusterId = node.community || 0;
        if (!clusters[clusterId]) {
          clusters[clusterId] = [];
        }
        clusters[clusterId].push(node);
      }
    });

    const clusterResult = Object.entries(clusters).map(([id, nodes]) => ({
      id: parseInt(id),
      nodes,
      size: nodes.length,
      color: clusterColors[parseInt(id) % clusterColors.length],
    }));

    console.log("📍 클러스터 정보:", clusterResult);

    return clusterResult;
  }, [data.nodes]);

  // 그룹별 완전 분리 레이아웃 계산
  const calculateGroupLayout = useMemo(() => {
    const groupCenters: {
      [key: number]: { x: number; y: number; radius: number };
    } = {};

    const totalGroups = clusterInfo.length;
    console.log(
      "🎯 calculateGroupLayout - totalGroups:",
      totalGroups,
      "width:",
      width,
      "height:",
      height,
    );

    if (totalGroups === 0) return groupCenters;

    const centerX = width / 2;
    const centerY = height / 2;

    console.log("📐 중심점:", { centerX, centerY });

    // 그룹 크기에 따른 동적 반경 계산
    const maxGroupSize = Math.max(...clusterInfo.map((c) => c.size), 1);
    // ⚙️ 조절 가능: 그룹 원의 크기 범위
    const minGroupRadius = 50; // 최소 그룹 반경 (작은 그룹)
    const maxGroupRadius = 210; // 최대 그룹 반경 (큰 그룹)

    // 그룹이 1개일 때는 중앙에 배치
    let circleRadius = 0;

    if (totalGroups === 1) {
      // 그룹이 1개면 중앙에 배치
      circleRadius = 0;
      console.log("📏 그룹 1개 - 중앙 배치");
    } else {
      // 그룹 간 최소 거리 계산 (겹치지 않도록 - 여유 추가)
      const avgGroupRadius = 140;
      const minDistance = avgGroupRadius * 0.5; // 1.6 → 2.5로 증가 (더 넓은 간격)
      circleRadius = Math.max(
        minDistance / (2 * Math.sin(Math.PI / totalGroups)),
        Math.min(width, height) * 0.3, // 0.25 → 0.3으로 증가
      );
      console.log("📏 circleRadius 계산:", {
        minDistance,
        totalGroups,
        circleRadius,
      });
    }

    clusterInfo.forEach((cluster, index) => {
      const angle = (index * 2 * Math.PI) / totalGroups;

      // 그룹 크기에 따라 반경 조정 (약간 감소)
      const groupRadius =
        minGroupRadius +
        (cluster.size / maxGroupSize) * (maxGroupRadius - minGroupRadius);

      const x = centerX + circleRadius * Math.cos(angle);
      const y = centerY + circleRadius * Math.sin(angle);

      groupCenters[cluster.id] = { x, y, radius: groupRadius };

      console.log(`🎯 클러스터 ${cluster.id} 중심점:`, {
        x,
        y,
        radius: groupRadius,
        angle,
        circleRadius,
      });
    });

    return groupCenters;
  }, [clusterInfo, width, height]);

  // 노드 초기 위치 계산 (그룹 내에서만 자유 배치)
  const initialNodePositions = useMemo(() => {
    console.log(
      "📍 초기 위치 계산 시작 - clusterInfo:",
      clusterInfo,
      "groupLayout:",
      calculateGroupLayout,
    );

    const positions: { [key: string]: { x: number; y: number } } = {};

    clusterInfo.forEach((cluster) => {
      const groupCenter = calculateGroupLayout[cluster.id];
      if (!groupCenter) {
        console.log(`⚠️ 클러스터 ${cluster.id}의 groupCenter 없음`);
        return;
      }

      const groupRadius = groupCenter.radius * 0.4; // 그룹 반경의 40%만 허용 (더 중심 집중)

      cluster.nodes.forEach((node, index) => {
        const angle = (index * 2 * Math.PI) / cluster.nodes.length;
        const distance = Math.random() * groupRadius * 0.5; // 중심 근처에 배치 (중심 집중)
        const x = groupCenter.x + distance * Math.cos(angle);
        const y = groupCenter.y + distance * Math.sin(angle);

        positions[node.id] = { x, y };

        if (index === 0) {
          console.log(`📍 첫 번째 노드(${node.name}) 초기 위치:`, {
            x,
            y,
            groupCenter,
            groupRadius,
          });
        }
      });
    });

    // 외톨이형 노드들은 별도 영역에 배치
    data.nodes.forEach((node) => {
      if (node.friendship_type === "외톨이형" && !positions[node.id]) {
        positions[node.id] = {
          x: width * 0.1 + Math.random() * 100,
          y: height * 0.1 + Math.random() * 100,
        };
      }
    });

    console.log(
      "✅ 초기 위치 계산 완료 - 총",
      Object.keys(positions).length,
      "개 노드",
    );

    return positions;
  }, [clusterInfo, calculateGroupLayout, data.nodes, width, height]);

  // 하이라이트 초기화 함수
  const resetHighlight = () => {
    setHighlightedNodes(new Set());
    setSelectedNode(null);

    // D3 요소가 있다면 스타일 리셋
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll(".node circle").attr("opacity", 1).attr("stroke-width", 2);

      svg
        .selectAll(".links line")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("stroke", "oklch(70.7% 0.022 261.325)");
    }
  };

  // D3 Force Simulation 설정
  useEffect(() => {
    console.log(
      "🎬 D3 렌더링 시작 - svgRef:",
      svgRef.current,
      "nodes:",
      data.nodes.length,
    );

    if (!svgRef.current || !data.nodes.length) {
      console.log("⚠️ D3 렌더링 중단 - svgRef 또는 nodes 없음");
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // SVG 설정
    svg.attr("width", width).attr("height", height);
    console.log("📐 SVG 크기 설정:", { width, height });

    // 배경 클릭 시 하이라이트 해제
    svg.on("click", (event) => {
      // 노드나 링크가 아닌 배경을 클릭한 경우만
      if (event.target === svgRef.current) {
        resetHighlight();
      }
    });

    // 노드에 초기 위치 할당
    const simulationNodes = data.nodes.map((node) => ({
      ...node,
      x: initialNodePositions[node.id]?.x || width / 2,
      y: initialNodePositions[node.id]?.y || height / 2,
      fx: null as number | null,
      fy: null as number | null,
    }));

    // 링크 데이터 준비
    const simulationLinks = data.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    // Force Simulation 생성
    const simulation = d3
      .forceSimulation(simulationNodes)
      // ⚙️ 링크 연결 강도 (친구 관계)
      .force(
        "link",
        d3
          .forceLink(simulationLinks)
          .id((d: any) => d.id)
          .distance(50) // 링크 길이 (낮추면 노드들이 더 가까워짐)
          .strength(0.3),
      ) // 링크 강도 (높이면 더 강하게 연결)
      // ⚙️ 노드 간 반발력
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength(-250) // 반발 강도 감소 (떨림 방지)
          .distanceMax(200),
      ) // 반발 최대 거리
      // ⚙️ 노드 충돌 방지 (겹침 방지)
      .force(
        "collide",
        d3
          .forceCollide()
          .radius(65) // 충돌 반경 더 증가 (30 → 35, 노드들 사이 간격 더 넓게)
          .strength(1), // 충돌 강도 최대
      )
      // ⚙️ 중앙 집중력
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05)) // 중앙 집중 강도 (낮을수록 자유롭게 배치)
      // ⚙️ 그룹 유지 강도 (조건 강화)
      .force("group", () => {
        // 각 노드를 자신의 그룹 중심으로 끌어당김
        simulationNodes.forEach((node) => {
          if (node.friendship_type === "외톨이형") return;

          const groupCenter = calculateGroupLayout[node.community || 0];
          if (!groupCenter) return;

          const dx = groupCenter.x - (node.x || 0);
          const dy = groupCenter.y - (node.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const groupRadius = groupCenter.radius * 0.4; // 그룹 반경의 40%만 허용 (더 중심 집중)

          // 그룹 반경을 벗어나면 중심으로 끌어당김 (조건 완화)
          if (distance > groupRadius) {
            const force = 0.05; // 그룹 복원 강도 증가 (중심 유지 강화)
            node.x = (node.x || 0) + dx * force;
            node.y = (node.y || 0) + dy * force;
          }
        });
      })
      // ⚙️ 시뮬레이션 속도 조절 (떨림 방지 - 더 빠른 안정화)
      .alpha(0.3) // 시작 alpha 낮춤
      .alphaDecay(0.08) // 감속 속도 대폭 증가 (더 빠르게 안정화)
      .velocityDecay(0.7); // 속도 감쇠 대폭 증가 (더 빠르게 멈춤)

    // 그룹 영역 그리기 (타원형)
    const groupAreas = svg.append("g").attr("class", "group-areas");

    clusterInfo.forEach((cluster) => {
      const groupCenter = calculateGroupLayout[cluster.id];
      if (!groupCenter) return;

      const groupRadius = groupCenter.radius;
      // ⚙️ 조절 가능: 타원 비율
      const ellipseRx = groupRadius * 1.3; // 가로 반경 (더 넓게)
      const ellipseRy = groupRadius * 1.1; // 세로 반경 (더 좁게)

      groupAreas
        .append("ellipse")
        .attr("cx", groupCenter.x)
        .attr("cy", groupCenter.y)
        .attr("rx", ellipseRx) // 가로 반경
        .attr("ry", ellipseRy) // 세로 반경
        .attr("fill", cluster.color)
        .attr("fill-opacity", 0.15)
        .attr("stroke", cluster.color)
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "3");
    });

    // 링크 그리기
    const linkElements = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simulationLinks)
      .enter()
      .append("line")
      .attr("stroke", "oklch(70.7% 0.022 261.325)")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    console.log("🔗 링크 엘리먼트 생성됨:", linkElements.size(), "개");

    // 노드 그룹 생성
    const nodeElements = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simulationNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    console.log("👤 노드 엘리먼트 생성됨:", nodeElements.size(), "개");

    // 노드 원형
    nodeElements
      .append("circle")
      .attr("r", 28)
      .attr("fill", (d) => {
        if (d.friendship_type === "외톨이형") return "#FF6B6B";
        if (d.friendship_type === "소수 친구 학생") return "#4ECDC4";
        if (d.friendship_type === "평균적인 학생") return "#45B7D1";
        if (d.friendship_type === "친구 많은 학생") return "#96CEB4";
        if (d.friendship_type === "사교 스타") return "#FFEAA7";
        return "#94a3b8";
      })
      // .attr("stroke", (d) => {
      //   if (d.friendship_type === "외톨이형") return "#999999";
      //   const clusterId = d.community || 0;
      //   return clusterColors[clusterId % clusterColors.length];
      // })
      .attr("stroke", "oklch(70.7% 0.022 261.325)")
      .attr("stroke-width", 2);

    // 노드 텍스트
    nodeElements
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", (d) =>
        d.friendship_type === "사교 스타" ? "#000" : "#fff",
      )
      .text((d) => d.name);

    // 노드 클릭 이벤트
    nodeElements.on("click", (event, d) => {
      // 연결된 노드 찾기
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(d.id); // 클릭한 노드 자신도 포함

      data.edges.forEach((edge) => {
        if (edge.source === d.id) {
          connectedNodeIds.add(edge.target);
        } else if (edge.target === d.id) {
          connectedNodeIds.add(edge.source);
        }
      });

      setHighlightedNodes(connectedNodeIds);
      setSelectedNode(d);

      // 모든 노드와 링크 스타일 초기화
      nodeElements
        .selectAll("circle")
        .attr("opacity", 0.3)
        .attr("stroke-width", 3);

      linkElements.attr("stroke-opacity", 0.1).attr("stroke-width", 2);

      // 연결된 노드 하이라이트
      nodeElements
        .filter((node: any) => connectedNodeIds.has(node.id))
        .selectAll("circle")
        .attr("opacity", 1)
        .attr("stroke-width", 3);

      // 연결된 링크 하이라이트
      linkElements
        .filter((link: any) => {
          const sourceId =
            typeof link.source === "object" ? link.source.id : link.source;
          const targetId =
            typeof link.target === "object" ? link.target.id : link.target;
          return sourceId === d.id || targetId === d.id;
        })
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", 3)
        .attr("stroke", "#FF6B35");

      if (onNodeClick) {
        onNodeClick(d);
      }
    });

    // 노드 호버 이벤트
    nodeElements.on("mouseover", (event, d) => {
      d3.select(event.currentTarget).select("circle").attr("r", 30);
    });

    nodeElements.on("mouseout", (event, d) => {
      d3.select(event.currentTarget).select("circle").attr("r", 28);
    });

    // Simulation tick 이벤트 (떨림 방지 - 강화된 버전)
    let tickCount = 0;
    let hasStopped = false;
    let stableCount = 0;

    simulation.on("tick", () => {
      // 현재 모든 노드의 속도 추적
      let currentMaxVelocity = 0;
      simulationNodes.forEach((node: any) => {
        const vx = node.vx || 0;
        const vy = node.vy || 0;
        const velocity = Math.sqrt(vx * vx + vy * vy);
        currentMaxVelocity = Math.max(currentMaxVelocity, velocity);
      });

      // alpha 값과 속도를 모두 확인 - 완전히 안정화되면 시뮬레이션 종료
      const isStable = simulation.alpha() < 0.001 && currentMaxVelocity < 0.05;

      if (isStable) {
        stableCount++;
      } else {
        stableCount = 0;
      }

      // 연속 5번 안정적이면 종료 (조건 완화하여 더 빠른 종료)
      if (!hasStopped && stableCount >= 5) {
        hasStopped = true;
        console.log("🛑 시뮬레이션 안정화 완료 - 모든 노드 고정");

        // 모든 노드를 고정하여 떨림 완전히 방지
        simulationNodes.forEach((node: any) => {
          if (node.x !== null && node.y !== null) {
            // 완전히 고정 (모든 속도와 힘 제거)
            node.fx = node.x;
            node.fy = node.y;
            node.vx = 0;
            node.vy = 0;
            node.x = node.fx; // 위치 강제 고정
            node.y = node.fy;
          }
        });

        // 모든 Force 즉시 제거 (떨림 완전 방지)
        simulation.force("link", null);
        simulation.force("charge", null);
        simulation.force("collide", null);
        simulation.force("center", null);
        simulation.force("group", null);

        // 시뮬레이션 즉시 종료
        simulation.stop();

        // 최종 렌더링
        linkElements
          .attr("x1", (d) => (d.source as any).x)
          .attr("y1", (d) => (d.source as any).y)
          .attr("x2", (d) => (d.target as any).x)
          .attr("y2", (d) => (d.target as any).y);

        nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);
        return;
      }

      // 링크 업데이트
      linkElements
        .attr("x1", (d) => (d.source as any).x)
        .attr("y1", (d) => (d.source as any).y)
        .attr("x2", (d) => (d.target as any).x)
        .attr("y2", (d) => (d.target as any).y);

      // 노드 위치 업데이트
      nodeElements.attr("transform", (d) => `translate(${d.x},${d.y})`);

      // 첫 몇 틱만 로그 출력
      tickCount++;
      if (tickCount === 1 || tickCount === 10 || tickCount % 50 === 0) {
        console.log(
          `⚡ Simulation tick ${tickCount} - alpha: ${simulation.alpha().toFixed(4)}, maxVelocity: ${currentMaxVelocity.toFixed(4)}`,
        );
      }
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [
    data,
    initialNodePositions,
    clusterInfo,
    calculateGroupLayout,
    width,
    height,
    onNodeClick,
  ]);

  return (
    <div className="network-visualization">
      {/* 네트워크 시각화 */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ width: `${width}px`, height: `${height}px` }}
        />

        {/* 친구 그룹 정보 */}
        <div className="absolute right-0 top-0 rounded-lg bg-white/90 p-4 shadow-md">
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
                        backgroundColor: cluster.color + "20",
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
            💡 원형 영역이 그룹을 나타냅니다
          </div>
        </div>
      </div>

      {/* 범례 영역 - 그래프 아래쪽에 고정 배치 */}
      {/* <div className="mt-4 flex justify-end">
        <div className="flex space-x-3">
          친구 유형 범례 - 상위 컴포넌트로 이동
          <div className="rounded-lg bg-white/90 p-3 shadow-md">
            <h4 className="mb-2 text-sm font-bold text-gray-800">친구 유형</h4>
            <div className="space-y-2">
              {[
                {
                  type: "외톨이형",
                  color: "#FF6B6B",
                  count: data.nodes.filter((n) => n.friendship_type === "외톨이형").length,
                },
                {
                  type: "소수 친구 학생",
                  color: "#4ECDC4",
                  count: data.nodes.filter((n) => n.friendship_type === "소수 친구 학생").length,
                },
                {
                  type: "평균적인 학생",
                  color: "#45B7D1",
                  count: data.nodes.filter((n) => n.friendship_type === "평균적인 학생").length,
                },
                {
                  type: "친구 많은 학생",
                  color: "#96CEB4",
                  count: data.nodes.filter((n) => n.friendship_type === "친구 많은 학생").length,
                },
                {
                  type: "사교 스타",
                  color: "#FFEAA7",
                  count: data.nodes.filter((n) => n.friendship_type === "사교 스타").length,
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
        </div>
      </div> */}

      {/* 선택된 노드 정보 */}
      {selectedNode && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-blue-800">선택된 학생 정보</h4>
            <button
              onClick={resetHighlight}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900">이름:</span>{" "}
              {selectedNode.name}
            </div>
            <div>
              <span className="font-medium text-gray-900">학년/반:</span>{" "}
              {selectedNode.grade}학년 {selectedNode.class}반
            </div>
            <div>
              <span className="font-medium text-gray-900">친구 유형:</span>{" "}
              {selectedNode.friendship_type}
            </div>
            <div>
              <span className="font-medium text-gray-900">연결 수:</span>{" "}
              {selectedNode.connection_count}개
            </div>
          </div>

          {/* 연결된 친구 목록 */}
          {highlightedNodes.size > 1 && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <h5 className="mb-2 text-xs font-semibold text-blue-700">
                연결된 친구 ({highlightedNodes.size - 1}명):
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {data.nodes
                  .filter(
                    (node) =>
                      highlightedNodes.has(node.id) &&
                      node.id !== selectedNode.id,
                  )
                  .map((node) => (
                    <span
                      key={node.id}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                    >
                      {node.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
