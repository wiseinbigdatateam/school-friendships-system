import React from 'react';
import * as d3 from 'd3';

interface TrendData {
  period: string;
  외톨이형: number;
  소수친구학생: number;
  평균적인학생: number;
  친구많은학생: number;
  사교스타: number;
}

interface TrendComparisonChartProps {
  data: TrendData[];
  width?: number;
  height?: number;
}

const TrendComparisonChart: React.FC<TrendComparisonChartProps> = ({
  data,
  width = 600,
  height = 400
}) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!data || !data.length || !svgRef.current) return;

    // 기존 SVG 내용 클리어
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);
    const margin = { top: 40, right: 80, bottom: 60, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X축 스케일 (시기)
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.period))
      .range([0, chartWidth])
      .padding(0.2);

    // Y축 스케일 (학생 수)
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => 
        Math.max(d.외톨이형, d.소수친구학생, d.평균적인학생, d.친구많은학생, d.사교스타)
      ) || 0])
      .range([chartHeight, 0]);

    // 색상 스케일
    const colorScale = d3.scaleOrdinal<string, string>()
      .domain(["외톨이형", "소수친구학생", "평균적인학생", "친구많은학생", "사교스타"])
      .range(["#ff6b6b", "#ffd93d", "#6bcf7f", "#4ecdc4", "#45b7d1"]);

    // X축
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale));

    // Y축
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5));

    // 범례
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

    const legendItems = ["외톨이형", "소수친구학생", "평균적인학생", "친구많은학생", "사교스타"];
    
    legendItems.forEach((item, i) => {
      const legendGroup = legend.append("g")
        .attr("transform", `translate(0, ${i * 25})`);
      
      legendGroup.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", colorScale(item));
      
      legendGroup.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("font-size", "12px")
        .attr("fill", "#333")
        .text(item);
    });

    // 선 그래프 그리기
    const lineGenerator = d3.line<TrendData>()
      .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
      .y(d => yScale(d.외톨이형));

    // 각 유형별로 선 그래프 생성
    const types = [
      { key: '외톨이형', label: '외톨이형' },
      { key: '소수친구학생', label: '소수 친구 학생' },
      { key: '평균적인학생', label: '평균적인 학생' },
      { key: '친구많은학생', label: '친구 많은 학생' },
      { key: '사교스타', label: '사교 스타' }
    ];

    types.forEach(type => {
      const lineData = data.map(d => ({
        period: d.period,
        value: d[type.key as keyof TrendData] as number
      }));

      const line = d3.line<{period: string, value: number}>()
        .x(d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .y(d => yScale(d.value));

      // 선 그리기
      g.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", colorScale(type.label))
        .attr("stroke-width", 3)
        .attr("d", line);

      // 점 그리기
      g.selectAll(`.${type.key}-dot`)
        .data(lineData)
        .enter().append("circle")
        .attr("class", `${type.key}-dot`)
        .attr("cx", d => (xScale(d.period) || 0) + xScale.bandwidth() / 2)
        .attr("cy", d => yScale(d.value))
        .attr("r", 4)
        .attr("fill", colorScale(type.label))
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
          d3.select(this).attr("r", 6);
          
          // 툴팁 표시
          const tooltip = d3.select("body").append("div")
            .attr("class", "trend-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
          
          tooltip.html(`
            <strong>${d.period}</strong><br/>
            ${type.label}: ${d.value}명
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4);
          d3.selectAll(".trend-tooltip").remove();
        });
    });

    // 차트 제목
    g.append("text")
      .attr("x", chartWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text("교우관계 유형 변화 추이");

    // Y축 라벨
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -chartHeight / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text("학생 수 (명)");

  }, [data, width, height]);

  return (
    <div className="trend-comparison-chart">
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

export default TrendComparisonChart;
