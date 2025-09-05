import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

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
  width = 800,
  height = 600,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.edges || !svgRef.current) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const g = svg.append("g");

    // 심플한 색상 팔레트
    const colorScale = d3
      .scaleOrdinal<string, string>()
      .domain([
        "외톨이형",
        "소수 친구 학생",
        "평균적인 학생",
        "친구 많은 학생",
        "사교 스타",
      ])
      .range(["#ef4444", "#eab308", "#60a5fa", "#1d4ed8", "#22c55e"]);

    // 노드 크기 스케일 (중심성 기반)
    const sizeScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.nodes, (d) => d.centrality) || 1])
      .range([12, 25]);

    // 엣지 두께 스케일
    const edgeWidthScale = d3
      .scaleLinear()
      .domain([0, d3.max(data.edges, (d) => d.weight) || 1])
      .range([1, 3]);

    // 시뮬레이션 설정
    const simulation = d3
      .forceSimulation(data.nodes as any)
      .force(
        "link",
        d3
          .forceLink(data.edges)
          .id((d: any) => d.id)
          .distance(80),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => sizeScale(d.centrality) + 8),
      );

    // 엣지 그리기
    const links = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(data.edges)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 1)
      // .attr("stroke-width", (d) => edgeWidthScale(d.weight))
      .attr("stroke-width", 1)
      .style("stroke-linecap", "round");

    // 노드 그리기
    const nodes = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => 12)
      .attr("fill", (d) => colorScale(d.friendship_type))
      // .attr("stroke", "#ffffff")
      // .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
      .on("click", (event, d) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", sizeScale(d.centrality) + 3)
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");

        // 연결된 엣지 하이라이트
        links
          .transition()
          .duration(200)
          .attr("stroke-opacity", (link: any) =>
            link.source.id === d.id || link.target.id === d.id ? 0.8 : 0.2,
          );
      })
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", sizeScale(d.centrality))
          .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

        // 엣지 원래 상태로 복원
        links.transition().duration(200).attr("stroke-opacity", 0.4);
      });

    // 노드 라벨
    const labels = g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .enter()
      .append("text")
      .text((d) => d.name)
      .attr("font-size", 14)
      .attr("font-weight", "500")
      .attr("text-anchor", "middle")
      .attr("dx", 32)
      .attr("dy", 5)
      .attr("fill", "#374151")
      .style("pointer-events", "none");
    // .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    // 심플한 툴팁
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "network-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(31, 41, 55, 0.9)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("opacity", 0)
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
      .style("border", "1px solid rgba(255,255,255,0.1)");

    function showTooltip(event: any, d: NetworkNode) {
      tooltip.transition().duration(200).style("opacity", 0.9);

      tooltip
        .html(
          `
        <strong>${d.name}</strong><br/>
        ${d.grade}학년 ${d.class}반<br/>
        ${d.friendship_type}<br/>
        연결: ${d.connection_count}명
      `,
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 10 + "px");
    }

    function hideTooltip() {
      tooltip.transition().duration(200).style("opacity", 0);
    }

    // 노드에 툴팁 이벤트 추가
    nodes.on("mouseenter", showTooltip).on("mouseleave", hideTooltip);

    // 드래그 기능
    nodes.call(
      d3
        .drag<any, NetworkNode>()
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
        }) as any,
    );

    // 시뮬레이션 업데이트
    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);

      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });

    // 클린업
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, period, width, height, onNodeClick]);

  return (
    <div className="network-visualization">
      <div className="mb-4">
        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          {period} 교우관계 네트워크
        </h3>

        {/* 심플한 범례 */}
        <div className="mb-4 flex flex-wrap gap-3">
          {[
            "외톨이형",
            "소수 친구 학생",
            "평균적인 학생",
            "친구 많은 학생",
            "사교 스타",
          ].map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    type === "외톨이형"
                      ? "#ef4444"
                      : type === "소수 친구 학생"
                        ? "#f59e0b"
                        : type === "평균적인 학생"
                          ? "#10b981"
                          : type === "친구 많은 학생"
                            ? "#06b6d4"
                            : "#8b5cf6",
                }}
              />
              <span className="text-sm text-gray-600">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="h-auto w-full"
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
              <span className="font-medium text-gray-600">중심성:</span>{" "}
              {(selectedNode.centrality * 100).toFixed(1)}%
            </div>
            <div>
              <span className="font-medium text-gray-600">커뮤니티:</span>{" "}
              {selectedNode.community + 1}번 그룹
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkVisualization;
