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
  width = 600,
  height = 400,
  onNodeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.edges || !svgRef.current) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append("g");

    // 시뮬레이션 설정 (처음의 자연스러운 배치)
    const simulation = d3.forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.edges).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(35))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // 교우관계 유형별 색상 매핑 (기본 버전)
    const colorScale = d3.scaleOrdinal<string, string>()
      .domain(["외톨이형", "소수 친구 학생", "평균적인 학생", "친구 많은 학생", "사교 스타"])
      .range(["#ff6b6b", "#ffd93d", "#6bcf7f", "#4ecdc4", "#45b7d1"]);

    // 노드 크기 스케일 (기본 버전)
    const maxConnections = d3.max(data.nodes, d => d.connection_count) || 0;
    const sizeScale = d3.scaleLinear()
      .domain([0, maxConnections])
      .range([12, 28]);

    // 엣지 그리기 (기본 버전)
    const links = g.append("g")
      .selectAll("line")
      .data(data.edges)
      .enter().append("line")
      .attr("stroke", "#666")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.weight || 1) * 1.5))
      .style("stroke-linecap", "round");

    // 노드 그리기 (기본 버전)
    const nodes = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter().append("circle")
      .attr("r", d => sizeScale(d.connection_count))
      .attr("fill", d => colorScale(d.friendship_type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))")
      .on("click", (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("r", sizeScale(d.connection_count) + 3)
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))");
      })
      .on("mouseleave", (event, d) => {
        setHoveredNode(null);
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr("r", sizeScale(d.connection_count))
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
      });

    // 노드 라벨 (이름 + 색깔 원)
    const labels = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .enter().append("g");

    // 디버깅: 데이터 확인
    console.log('🔍 네트워크 시각화 데이터:', {
      nodes: data.nodes,
      edges: data.edges,
      nodeColors: data.nodes.map(n => ({ name: n.name, centrality: n.centrality, color: colorScale(n.friendship_type) }))
    });

    // 색깔 원 삭제 (더 깔끔한 디자인)
    // labels.append("circle")
    //   .attr("r", 10)
    //   .attr("fill", (d: any) => {
    //     const color = colorScale(d.friendship_type);
    //     console.log('🔍 색깔 원 생성:', { name: d.name, type: d.friendship_type, color });
    //     return color;
    //   })
    //   .attr("stroke", "#fff")
    //   .attr("stroke-width", 2)
    //   .attr("cx", -30)
    //   .attr("cy", 0)
    //   .style("opacity", 0.95)
    //   .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.3))");

    // 이름 텍스트 추가 (기본 버전)
    labels.append("text")
      .text(d => d.name)
      .attr("font-size", "13px")
      .attr("font-weight", "500")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#2d3748")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    // 툴팁 생성 (기본 버전)
    const tooltip = d3.select("body").append("div")
      .attr("class", "network-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(45, 55, 72, 0.95)")
      .style("color", "white")
      .style("padding", "12px 16px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("opacity", 0)
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
      .style("border", "1px solid rgba(255,255,255,0.1)")
      .style("backdrop-filter", "blur(8px)");

    function showTooltip(event: any, d: NetworkNode) {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      tooltip.html(`
        <strong>${d.name}</strong><br/>
        학년: ${d.grade}학년 ${d.class}반<br/>
        교우관계 유형: ${d.friendship_type}<br/>
        연결 수: ${d.connection_count}명<br/>
        중심성: ${d.centrality.toFixed(3)}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    }

    function hideTooltip() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    }

    // 시뮬레이션 기반의 동적 업데이트 (처음과 동일)
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
        .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
    });

    // 고정된 위치 그리기 제거 (시뮬레이션 기반으로 복원)
    // links
    //   .attr("x1", (d: any) => d.source.x)
    //   .attr("y1", (d: any) => d.source.y)
    //   .attr("x2", (d: any) => d.target.x)
    //   .attr("y2", (d: any) => d.target.y);

    // nodes
    //   .attr("cx", (d: any) => d.x)
    //   .attr("cy", (d: any) => d.y);

    // labels
    //   .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);

    // 줌 기능 제거 (확대/축소 비활성화)
    // const zoom = d3.zoom()
    //   .scaleExtent([0.5, 3]) // 줌 범위 제한
    //   .on("zoom", (event) => {
    //     g.attr("transform", event.transform);
    //   });

    // svg.call(zoom as any);
    
    // 더블클릭 줌 리셋 기능도 제거
    // svg.on("dblclick.zoom", null);
    // svg.on("dblclick", () => {
    //   svg.transition().duration(750).call(
    //     zoom.transform as any,
    //     d3.zoomIdentity
    //   );
    // });

    // 드래그 기능 복원 (처음과 동일한 상호작용)
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
      simulation.stop(); // 시뮬레이션 제거로 인한 클린업 변경
      tooltip.remove();
    };
  }, [data, period, width, height, onNodeClick]);

  return (
    <div className="network-visualization">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{period} 교우관계 네트워크</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {["외톨이형", "소수 친구 학생", "평균적인 학생", "친구 많은 학생", "사교 스타"].map(type => (
            <div key={type} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: 
                    type === "외톨이형" ? "#ff6b6b" :
                    type === "소수 친구 학생" ? "#ffd93d" :
                    type === "평균적인 학생" ? "#6bcf7f" :
                    type === "친구 많은 학생" ? "#4ecdc4" : "#45b7d1"
                }}
              />
              <span className="text-sm text-gray-600">{type}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-auto"
        />
      </div>

      {selectedNode && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">선택된 학생 정보</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">이름:</span> {selectedNode.name}
            </div>
            <div>
              <span className="font-medium">학년/반:</span> {selectedNode.grade}학년 {selectedNode.class}반
            </div>
            <div>
              <span className="font-medium">교우관계 유형:</span> {selectedNode.friendship_type}
            </div>
            <div>
              <span className="font-medium">연결 수:</span> {selectedNode.connection_count}명
            </div>
            <div>
              <span className="font-medium">중심성:</span> {selectedNode.centrality.toFixed(3)}
            </div>
            <div>
              <span className="font-medium">커뮤니티:</span> {selectedNode.community}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
