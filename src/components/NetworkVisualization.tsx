import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface NetworkNode {
  id: string;
  name: string;
  grade: string;
  class: string;
  friendship_type: string;
  centrality: number;
  community: number;
  connection_count: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  relationship_type: string;
}

interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

interface NetworkVisualizationProps {
  data: NetworkData;
  period: string;
  width?: number;
  height?: number;
  onNodeClick?: (node: NetworkNode) => void;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  data,
  period,
  width = 900,
  height = 750,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.edges || !svgRef.current) {
      console.warn('NetworkVisualization: 유효하지 않은 데이터 또는 SVG 참조');
      return;
    }

    // 노드 데이터 검증
    if (data.nodes.length === 0) {
      console.warn('NetworkVisualization: 빈 노드 데이터');
      return;
    }

    // 노드 ID 집합 생성
    const nodeIds = new Set(data.nodes.map(node => node.id));
    
    // 유효한 엣지만 필터링 (source와 target이 모두 존재하는 노드인 경우)
    const validEdges = data.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any)?.id;
      const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any)?.id;
      return sourceId && targetId && nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    if (validEdges.length !== data.edges.length) {
      console.warn(`NetworkVisualization: ${data.edges.length - validEdges.length}개의 유효하지 않은 엣지 제거됨`);
    }

    // 유효한 데이터로 업데이트
    const validData = {
      ...data,
      edges: validEdges
    };

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    
    // SVG 뷰포트 설정 (이미지와 동일한 비율)
    svg.attr("viewBox", `-450,-375,${width},${height}`)
       .style("max-width", "100%")
       .style("height", "auto");

    const g = svg.append("g");

    // 이미지와 일치하는 색상 팔레트
    const colorScale = d3.scaleOrdinal<string, string>()
      .domain(["외톨이형", "소수 친구 학생", "평균적인 학생", "친구 많은 학생", "사교 스타"])
      .range(["#FF6B35", "#FFBC0E", "#2EA5E8", "#4459F5", "#10B981"]);

    // 노드 크기 고정 (이미지와 동일하게)
    const nodeRadius = 12;

    // 엣지 스타일 (이미지와 동일하게)
    const edgeColor = "#999";
    const edgeOpacity = 1;
    const edgeWidth = 1;

    // 시뮬레이션 설정 (더 안정적인 레이아웃)
    const simulation = d3.forceSimulation(validData.nodes as any)
      .force("link", d3.forceLink(validData.edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(0, 0))
      .force("collision", d3.forceCollide().radius(nodeRadius + 5));

    // 엣지 그리기 (이미지와 동일한 스타일)
    const links = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(validData.edges)
      .enter().append("line")
      .attr("stroke", edgeColor)
      .attr("stroke-opacity", edgeOpacity)
      .attr("stroke-width", edgeWidth)
      .style("stroke-linecap", "round");

    // 노드 그리기 (이미지와 동일한 스타일)
    const nodes = g.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(validData.nodes)
      .enter().append("circle")
      .attr("r", nodeRadius)
      .attr("fill", d => colorScale(d.friendship_type))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", nodeRadius + 2)
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");
        
        // 연결된 엣지 하이라이트
        links
          .transition()
          .duration(200)
          .attr("stroke-opacity", (link: any) => 
            link.source.id === d.id || link.target.id === d.id ? 0.8 : 0.3
          )
          .attr("stroke-width", (link: any) => 
            link.source.id === d.id || link.target.id === d.id ? 2 : 1
          );
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", nodeRadius)
          .style("filter", "none");
        
        // 엣지 원래 상태로 복원
        links
          .transition()
          .duration(200)
          .attr("stroke-opacity", edgeOpacity)
          .attr("stroke-width", edgeWidth);
      });

    // 노드 라벨 (이미지와 동일한 스타일)
    const labels = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(validData.nodes)
      .enter().append("text")
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("text-anchor", "middle")
      .attr("dy", "0.2rem")
      .attr("fill", "#374151")
      .style("pointer-events", "none")
      .style("font-family", "system-ui, -apple-system, sans-serif");

    // 시뮬레이션 업데이트
    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      labels
        .attr("x", (d: any) => d.x + nodeRadius + 14)
        .attr("y", (d: any) => d.y);
    });

    // 드래그 기능
    nodes.call(d3.drag<any, NetworkNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }) as any);

    // 클린업
    return () => {
      simulation.stop();
    };
  }, [data, period, width, height, onNodeClick]);

  // 각 유형별 학생 수 계산
  const getTypeCount = (type: string) => {
    return data.nodes.filter(node => node.friendship_type === type).length;
  };

  return (
    <div className="network-visualization">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{period} 교우관계 네트워크</h3>
        <p className="text-sm text-gray-600 mb-4">
          학생들 간의 친구 관계를 시각화하여 네트워크 구조를 분석합니다
        </p>
        
        {/* 개선된 범례 (이미지와 동일한 스타일) */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">학생 유형별 분류</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {/* 외톨이형 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-red-500"></div>
              <div className="text-xs">
                <div className="font-medium text-gray-900">외톨이형</div>
                <div className="text-gray-600">{getTypeCount("외톨이형")}명</div>
              </div>
            </div>

            {/* 소수 친구 학생 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
              <div className="text-xs">
                <div className="font-medium text-gray-900">소수 친구 학생</div>
                <div className="text-gray-600">{getTypeCount("소수 친구 학생")}명</div>
              </div>
            </div>

            {/* 평균적인 학생 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-blue-400"></div>
              <div className="text-xs">
                <div className="font-medium text-gray-900">평균적인 학생</div>
                <div className="text-gray-600">{getTypeCount("평균적인 학생")}명</div>
              </div>
            </div>

            {/* 친구 많은 학생 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-blue-700"></div>
              <div className="text-xs">
                <div className="font-medium text-gray-900">친구 많은 학생</div>
                <div className="text-gray-600">{getTypeCount("친구 많은 학생")}명</div>
              </div>
            </div>

            {/* 사교 스타 */}
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full bg-green-500"></div>
              <div className="text-xs">
                <div className="font-medium text-gray-900">사교 스타</div>
                <div className="text-gray-600">{getTypeCount("사교 스타")}명</div>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="text-xs text-gray-600">
              💡 <strong>시각화 가이드:</strong> 노드 크기는 중심성 점수에 비례하며, 색상은 학생의 사회적 관계 유형을 나타냅니다.
            </div>
          </div>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-auto"
        />
      </div>

      {/* 네트워크 요약 정보 */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {getTypeCount("외톨이형")}
          </div>
          <div className="text-xs text-blue-800">외톨이형</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">
            {getTypeCount("소수 친구 학생")}
          </div>
          <div className="text-xs text-yellow-800">소수 친구</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {getTypeCount("평균적인 학생")}
          </div>
          <div className="text-xs text-blue-800">평균적</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-bold text-green-600">
            {getTypeCount("친구 많은 학생") + getTypeCount("사교 스타")}
          </div>
          <div className="text-xs text-green-800">친구 많음</div>
        </div>
      </div>

      {selectedNode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-800">선택된 학생 정보</h4>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              닫기
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-600">이름:</span> {selectedNode.name}
            </div>
            <div>
              <span className="font-medium text-gray-600">학년/반:</span> {selectedNode.grade}학년 {selectedNode.class}반
            </div>
            <div>
              <span className="font-medium text-gray-600">유형:</span> {selectedNode.friendship_type}
            </div>
            <div>
              <span className="font-medium text-gray-600">연결 수:</span> {selectedNode.connection_count}명
            </div>
            <div>
              <span className="font-medium text-gray-600">중심성:</span> {(selectedNode.centrality * 100).toFixed(1)}%
            </div>
            <div>
              <span className="font-medium text-gray-600">커뮤니티:</span> {selectedNode.community + 1}번 그룹
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
