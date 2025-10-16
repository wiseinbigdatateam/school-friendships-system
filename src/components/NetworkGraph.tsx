import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  friendCount: number;
  isCenter?: boolean;
}

interface NetworkGraphProps {
  students: Student[];
  maxSelections?: number;
  onStudentSelect?: (studentId: string) => void;
  isInteractive?: boolean;
}

// D3.js 노드 타입 정의
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  grade: string;
  class: string;
  friendCount: number;
  isCenter: boolean;
  x?: number;
  y?: number;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  students,
  maxSelections = 5,
  onStudentSelect,
  isInteractive = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current || students.length === 0) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const width = 500;
    const height = 360;

    // SVG 크기 설정
    svg.attr("width", width).attr("height", height);

    // 중심점 계산
    const centerX = width / 2;
    const centerY = height / 2;

    // 노드 데이터 준비
    const nodes: D3Node[] = students.map((student) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
      class: student.class,
      friendCount: student.friendCount,
      isCenter: student.isCenter || false,
      x: student.isCenter ? centerX : undefined,
      y: student.isCenter ? centerY : undefined,
    }));

    // 엣지 데이터 생성 (중심 학생과 다른 학생들 연결)
    const centerStudent = students.find((s) => s.isCenter);
    const edges = centerStudent
      ? students
          .filter((s) => !s.isCenter)
          .map((student) => ({
            source: centerStudent.id,
            target: student.id,
            value: 1,
          }))
      : [];

    // 학생 유형별 색상 매핑 함수 (NetworkVisualization과 동일한 색상)
    const getStudentTypeColor = (student: Student) => {
      console.log(`🎨 NetworkGraph 색상 결정: ${student.name}`, {
        friendship_type: (student as any).friendship_type,
        friendCount: student.friendCount,
        totalStudents: students.length
      });
      
      // friendship_type이 있으면 직접 사용
      if ((student as any).friendship_type) {
        const colorMap: { [key: string]: string } = {
          "외톨이형": "#FF6B6B",
          "소수 친구 학생": "#4ECDC4", 
          "평균적인 학생": "#45B7D1",
          "친구 많은 학생": "#96CEB4",
          "사교 스타": "#FFEAA7"
        };
        const color = colorMap[(student as any).friendship_type] || "#94a3b8";
        console.log(`✅ friendship_type 사용: ${(student as any).friendship_type} → ${color}`);
        return color;
      }
      
      // friendship_type이 없으면 friendCount 기반으로 계산
      const maxPossibleConnections = students.length - 1;
      const normalizedCentrality = student.friendCount / Math.max(maxPossibleConnections, 1);
      
      let color: string;
      if (normalizedCentrality < 0.1) color = "#FF6B6B";      // 외톨이형
      else if (normalizedCentrality < 0.3) color = "#4ECDC4"; // 소수 친구 학생
      else if (normalizedCentrality < 0.6) color = "#45B7D1"; // 평균적인 학생
      else if (normalizedCentrality < 0.8) color = "#96CEB4"; // 친구 많은 학생
      else color = "#FFEAA7";                                 // 사교 스타
      
      console.log(`⚠️ friendCount 기반 계산: ${student.friendCount}/${maxPossibleConnections} = ${normalizedCentrality.toFixed(2)} → ${color}`);
      return color;
    };

    // 노드 크기 스케일 설정
    const radiusScale = d3
      .scaleLinear()
      .domain([0, d3.max(students, (d) => d.friendCount) || 0])
      .range([8, 20]);

    // 시뮬레이션 설정
    const simulation = d3
      .forceSimulation<D3Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, any>(edges)
          .id((d: D3Node) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(centerX, centerY))
      .force(
        "collision",
        d3.forceCollide().radius((d: d3.SimulationNodeDatum) => {
          const node = d as D3Node;
          return radiusScale(node.friendCount) + 5;
        }),
      );

    simulationRef.current = simulation;

    // 엣지 그리기
    const edgesGroup = svg.append("g").attr("class", "edges");

    const edge = edgesGroup
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    // 노드 그리기
    const nodesGroup = svg.append("g").attr("class", "nodes");

    const node = nodesGroup
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, D3Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      );

    // 노드 원형 추가
    node
      .append("circle")
      .attr("r", (d: D3Node) => radiusScale(d.friendCount))
      .attr("fill", (d: D3Node) => {
        const student = students.find(s => s.id === d.id);
        return student ? getStudentTypeColor(student) : "#94a3b8";
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("cursor", isInteractive ? "pointer" : "default");

    // 노드 텍스트 추가
    node
      .append("text")
      .text((d: D3Node) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d: D3Node) => radiusScale(d.friendCount) + 20)
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#374151")
      .attr("pointer-events", "none");

    // 추가 정보 텍스트
    node
      .append("text")
      .text((d: D3Node) => `${d.grade}학년 ${d.class}반`)
      .attr("text-anchor", "middle")
      .attr("dy", (d: D3Node) => radiusScale(d.friendCount) + 35)
      .attr("font-size", "10px")
      .attr("fill", "#6b7280")
      .attr("pointer-events", "none");

    // 친구 수 표시
    node
      .append("text")
      .text((d: D3Node) => `친구: ${d.friendCount}명`)
      .attr("text-anchor", "middle")
      .attr("dy", (d: D3Node) => radiusScale(d.friendCount) + 50)
      .attr("font-size", "10px")
      .attr("fill", "#6b7280")
      .attr("pointer-events", "none");

    // 클릭 이벤트 (인터랙티브 모드에서만)
    if (isInteractive && onStudentSelect) {
      node.on("click", (event, d: D3Node) => {
        onStudentSelect(d.id);
      });
    }

    // 호버 효과
    node
      .on("mouseover", function (event, d: D3Node) {
        if (!isInteractive) return;

        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("stroke-width", 4)
          .attr("stroke", "#1f2937");

        // 연결된 엣지 강조
        edgesGroup
          .selectAll("line")
          .attr("stroke-opacity", (edgeData: any) =>
            edgeData.source === d.id || edgeData.target === d.id ? 1 : 0.2,
          );
      })
      .on("mouseout", function (event, d: D3Node) {
        if (!isInteractive) return;

        d3.select(this)
          .select("circle")
          .transition()
          .duration(200)
          .attr("stroke-width", 2)
          .attr("stroke", "#fff");

        // 엣지 원래 상태로 복원
        edgesGroup.selectAll("line").attr("stroke-opacity", 0.6);
      });

    // 시뮬레이션 틱 이벤트
    simulation.on("tick", () => {
      edge
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`);
    });

    // 드래그 함수들
    function dragstarted(event: any, d: D3Node) {
      if (!isInteractive) return;
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: D3Node) {
      if (!isInteractive) return;
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: D3Node) {
      if (!isInteractive) return;
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 줌 기능 (인터랙티브 모드에서만)
    if (isInteractive) {
      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .on("zoom", (event) => {
          svg.selectAll("g").attr("transform", event.transform);
        });

      svg.call(zoom);
    }

    // 정리 함수
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [students, maxSelections, onStudentSelect, isInteractive]);

  return (
    <div className="flex h-fit w-fit flex-col items-center">
      <div className="rounded-lg bg-white">
        <svg
          ref={svgRef}
          className="h-full w-full"
          style={{ minHeight: "360px" }}
        />
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#FF6B6B" }}></div>
          <span className="text-gray-700">외톨이형</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#4ECDC4" }}></div>
          <span className="text-gray-700">소수 친구 학생</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#45B7D1" }}></div>
          <span className="text-gray-700">평균적인 학생</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#96CEB4" }}></div>
          <span className="text-gray-700">친구 많은 학생</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#FFEAA7" }}></div>
          <span className="text-gray-700">사교 스타</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraph;
