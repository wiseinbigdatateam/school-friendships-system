import React from 'react';
import * as d3 from 'd3';

interface FriendshipTypeData {
  type: string;
  count: number;
  color: string;
}

interface FriendshipStatsChartProps {
  data: FriendshipTypeData[];
  period: string;
  width?: number;
  height?: number;
}

const FriendshipStatsChart: React.FC<FriendshipStatsChartProps> = ({
  data,
  period,
  width = 300,
  height = 200
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!data || !data.length || !svgRef.current) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X축 스케일 (교우관계 유형)
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .range([0, chartWidth])
      .padding(0.1);

    // Y축 스케일 (학생 수)
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([chartHeight, 0]);

    // X축
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");

    // Y축
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5));

    // 막대 그래프
    g.selectAll(".bar")
      .data(data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.type) || 0)
      .attr("y", d => yScale(d.count))
      .attr("width", xScale.bandwidth())
      .attr("height", d => chartHeight - yScale(d.count))
      .attr("fill", d => d.color)
      .attr("rx", 4)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("opacity", 0.8);
        
        // 툴팁 표시
        const tooltip = d3.select("body").append("div")
          .attr("class", "chart-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0, 0, 0, 0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000");
        
        tooltip.html(`
          <strong>${d.type}</strong><br/>
          학생 수: ${d.count}명
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("opacity", 1);
        
        // 툴팁 제거
        d3.selectAll(".chart-tooltip").remove();
      });

    // 막대 위에 값 표시
    g.selectAll(".bar-label")
      .data(data)
      .enter().append("text")
      .attr("class", "bar-label")
      .attr("x", d => (xScale(d.type) || 0) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#333")
      .text(d => d.count);

    // 차트 제목
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -5)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(`${period} 교우관계 유형 분포`);

  }, [data, period, width, height]);

  return (
    <div className="friendship-stats-chart">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-auto"
        />
      </div>
    </div>
  );
};

export default FriendshipStatsChart;
