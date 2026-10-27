import { useId, useState } from "react";
import { money, number } from "../api";
import { Empty } from "./AdminTable";
const palette = [
  "#176b60",
  "#c2a36b",
  "#71aaa0",
  "#a4c8bf",
  "#d1c1a2",
  "#7d8c99",
  "#d8e3df",
];
export function TrendChart({
  data = [],
  months = [],
  currency = false,
  color = "#176b60",
  label,
}) {
  const id = useId().replaceAll(":", ""),
    [hover, setHover] = useState(null);
  const values = months.map((month) => ({
    month,
    value: Number(data.find((d) => d.month === month)?.value || 0),
  }));
  const max = Math.max(1, ...values.map((d) => d.value)),
    width = 640,
    height = 200,
    left = 58,
    right = 16,
    top = 14,
    bottom = 34;
  const point = (v, i) => [
    left + (i * (width - left - right)) / Math.max(1, values.length - 1),
    top + (1 - v / max) * (height - top - bottom),
  ];
  const points = values.map((d, i) => point(d.value, i)),
    path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const fmt = (v) => (currency ? money(v, true) : number(Math.round(v)));
  return (
    <div className="ad-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={left}
              x2={width - right}
              y1={point(max * f, 0)[1]}
              y2={point(max * f, 0)[1]}
              stroke="#edf1ef"
              strokeDasharray="4 5"
            />
            <text
              x={left - 10}
              y={point(max * f, 0)[1] + 4}
              textAnchor="end"
              fill="#8c9995"
              fontSize="10"
            >
              {fmt(max * f)}
            </text>
          </g>
        ))}
        {!!points.length && (
          <>
            <path
              d={`${path} L${points.at(-1)[0]},${height - bottom} L${left},${height - bottom} Z`}
              fill={`url(#${id})`}
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {values.map((d, i) => {
              const [x, y] = points[i];
              return (
                <g key={d.month}>
                  <circle cx={x} cy={y} r={hover === i ? 5 : 3} fill={color} />
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="transparent"
                    tabIndex="0"
                    aria-label={`${d.month}: ${fmt(d.value)}`}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>
                      {d.month}: {fmt(d.value)}
                    </title>
                  </circle>
                  {(values.length < 7 ||
                    i % Math.ceil(values.length / 6) === 0 ||
                    i === values.length - 1) && (
                    <text
                      x={x}
                      y={height - 9}
                      textAnchor="middle"
                      fill="#8c9995"
                      fontSize="10"
                    >
                      {new Date(`${d.month}-01T00:00:00`).toLocaleDateString(
                        "en",
                        {
                          month: "short",
                          year: values.length > 12 ? "2-digit" : undefined,
                        },
                      )}
                    </text>
                  )}
                </g>
              );
            })}
          </>
        )}
      </svg>
      {hover !== null && values[hover] && (
        <div className="ad-chart-tooltip">
          {values[hover].month} · <strong>{fmt(values[hover].value)}</strong>
        </div>
      )}
      {!data.length && (
        <span className="ad-chart-no-data">No activity in this period</span>
      )}
    </div>
  );
}
export function Distribution({ data = [], currency = false }) {
  const total = data.reduce((sum, d) => sum + Number(d.value), 0),
    [selected, setSelected] = useState(null);
  let offset = 0;
  const radius = 58,
    circumference = 2 * Math.PI * radius;
  return (
    <div className="ad-distribution">
      <div className="ad-donut">
        <svg viewBox="0 0 160 160" role="img" aria-label="Distribution">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#edf2ef"
            strokeWidth="17"
          />
          {data.map((d, i) => {
            const fraction = total ? Number(d.value) / total : 0,
              start = offset;
            offset += fraction;
            return (
              <circle
                key={d.name}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={palette[i % palette.length]}
                strokeWidth={selected === i ? 21 : 17}
                strokeDasharray={`${fraction * circumference} ${circumference}`}
                strokeDashoffset={-start * circumference}
                transform="rotate(-90 80 80)"
                onMouseEnter={() => setSelected(i)}
                onMouseLeave={() => setSelected(null)}
              >
                <title>
                  {d.name}: {currency ? money(d.value) : number(d.value)}
                </title>
              </circle>
            );
          })}
        </svg>
        <div>
          <strong>{currency ? money(total, true) : number(total)}</strong>
          <span>{currency ? "Total payouts" : "Total bookings"}</span>
        </div>
      </div>
      <div className="ad-legend">
        {data.length ? (
          data.map((d, i) => (
            <button
              key={d.name}
              onFocus={() => setSelected(i)}
              onBlur={() => setSelected(null)}
              onMouseEnter={() => setSelected(i)}
              onMouseLeave={() => setSelected(null)}
            >
              <i style={{ background: palette[i % palette.length] }} />
              <span>{d.name}</span>
              <strong>
                {currency ? money(d.value, true) : number(d.value)}
              </strong>
            </button>
          ))
        ) : (
          <span>No records in this period</span>
        )}
      </div>
    </div>
  );
}
export function CategoryBars({ categories = [] }) {
  const rows = [...categories]
      .filter((r) => Number(r.revenue) > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    max = Math.max(1, ...rows.map((r) => r.revenue));
  return rows.length ? (
    <div className="ad-bars">
      {rows.map((row) => (
        <div key={row.id}>
          <div>
            <span>{row.name}</span>
            <strong>{money(row.revenue, true)}</strong>
          </div>
          <div className="ad-bar-track">
            <i style={{ width: `${(row.revenue / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Empty
      text="No category revenue yet"
      description="Paid booking line totals will appear here."
    />
  );
}
