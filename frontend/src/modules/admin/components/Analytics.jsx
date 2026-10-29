import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
  const values = months.map((month) => ({
    month,
    value: Number(data.find((row) => row.month === month)?.value || 0),
  }));
  const format = (value) => (currency ? money(value, true) : number(value));
  if (!data.length) return <Empty text="No activity in this period" />;
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: "100%", height: 240, minWidth: 0 }}
    >
      <ResponsiveContainer>
        <AreaChart
          data={values}
          margin={{ top: 12, right: 12, bottom: 0, left: 8 }}
          accessibilityLayer
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={format} tick={{ fontSize: 10 }} width={70} />
          <Tooltip formatter={(value) => [format(value), label]} />
          <Area
            dataKey="value"
            type="monotone"
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Distribution({ data = [], currency = false }) {
  const rows = data.map((row) => ({ ...row, value: Number(row.value) }));
  if (!rows.length) return <Empty text="No records in this period" />;
  return (
    <div className="ad-distribution">
      <div
        style={{ width: 200, height: 200, flexShrink: 0 }}
        role="img"
        aria-label="Status distribution"
      >
        <ResponsiveContainer>
          <PieChart accessibilityLayer>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={76}
              isAnimationActive={false}
            >
              {rows.map((row, index) => (
                <Cell key={row.name} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => (currency ? money(value) : number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="ad-legend">
        {rows.map((row, index) => (
          <div key={row.name}>
            <i style={{ background: palette[index % palette.length] }} />
            <span>{row.name}</span>
            <strong>{currency ? money(row.value) : number(row.value)}</strong>
          </div>
        ))}
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
