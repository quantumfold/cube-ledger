type Series = {
  name: string;
  color: string;
  points: Array<{ label: string; value: number }>;
};

type LineChartProps = {
  series: Series[];
  formatValue: (value: number) => string;
  emptyLabel: string;
};

const width = 720;
const height = 280;
const padding = { top: 18, right: 28, bottom: 34, left: 54 };

export function LineChart({ series, formatValue, emptyLabel }: LineChartProps) {
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const maxPoints = Math.max(0, ...series.map((item) => item.points.length));

  if (!series.length || !allValues.length || maxPoints < 1) {
    return <div className="chart-empty">{emptyLabel}</div>;
  }

  const rawMin = Math.min(...allValues, 0);
  const rawMax = Math.max(...allValues, 0);
  const spread = rawMax - rawMin || 1;
  const min = rawMin - spread * 0.08;
  const max = rawMax + spread * 0.08;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const xFor = (index: number) => padding.left + (maxPoints === 1 ? innerWidth / 2 : (index / (maxPoints - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + ((max - value) / (max - min)) * innerHeight;
  const zeroY = yFor(0);
  const yTicks = [max, (max + min) / 2, min];

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={yFor(tick)} y2={yFor(tick)} className="chart-grid" />
            <text x={padding.left - 10} y={yFor(tick) + 4} textAnchor="end" className="chart-tick">{formatValue(tick)}</text>
          </g>
        ))}
        {min < 0 && max > 0 ? <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} className="chart-zero" /> : null}
        {series.map((item) => {
          const path = item.points.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index)} ${yFor(point.value)}`).join(" ");
          return (
            <g key={item.name}>
              <path d={path} fill="none" stroke="transparent" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
                <title>{item.name}</title>
              </path>
              <path d={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {item.points.map((point, index) => (
                <circle key={`${item.name}-${point.label}-${index}`} cx={xFor(index)} cy={yFor(point.value)} r="3.5" fill={item.color}>
                  <title>{`${item.name}: ${formatValue(point.value)} on ${point.label}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} className="chart-axis" />
      </svg>
      <div className="chart-legend">
        {series.map((item) => (
          <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>
        ))}
      </div>
    </div>
  );
}
