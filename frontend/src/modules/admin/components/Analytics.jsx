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
const legendColors = [
  "bg-[#176b60]",
  "bg-[#c2a36b]",
  "bg-[#71aaa0]",
  "bg-[#a4c8bf]",
  "bg-[#d1c1a2]",
  "bg-[#7d8c99]",
  "bg-[#d8e3df]",
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
      className="h-[240px] w-full min-w-0"
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
    <div className="ad-distribution [padding:0_20px_20px] flex flex-col [@media(width<=767px)]:flex-row [@media(width>=1500px)]:flex-row items-center gap-[10px] [@media(width<=767px)]:gap-[20px] [@media(width>=1500px)]:gap-[15px] [@media(width>=1500px)]:justify-center">
      <div
        className="h-[200px] w-[200px] shrink-0"
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
      <div className="ad-legend w-full [@media(width<=767px)]:w-auto [@media(width>=1500px)]:w-auto grid grid-cols-[1fr_1fr] [@media(width<=767px)]:grid-cols-[1fr] [@media(width>=1500px)]:grid-cols-[1fr] gap-[6px_13px] [&_button]:[border-top-width:0] [&_button]:[border-top-style:none] [&_button]:[border-top-color:currentColor] [&_button]:[border-right-width:0] [&_button]:[border-right-style:none] [&_button]:[border-right-color:currentColor] [&_button]:[border-bottom-width:0] [&_button]:[border-bottom-style:none] [&_button]:[border-bottom-color:currentColor] [&_button]:[border-left-width:0] [&_button]:[border-left-style:none] [&_button]:[border-left-color:currentColor] [&_button]:[background:none] [&_button]:flex [&_button]:items-center [&_button]:gap-[5px] [&_button]:text-[9px] [&_button]:min-w-0 [&_button]:text-left [&_button]:p-[3px] [&_button_>_span]:[overflow-x:hidden] [&_button_>_span]:[overflow-y:hidden] [&_button_>_span]:[text-overflow:ellipsis] [&_strong]:ml-[auto] [&_strong]:text-[9px] [&_strong]:font-[500] [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:rounded-[50%] [&_i]:shrink-0 [&_>_span]:text-[10px] [&_>_span]:text-[#9da89f] [&_>_span]:col-[1/-1] [&_>_span]:text-center [@media(width<=767px)]:min-w-0! [@media(width>=1500px)]:min-w-[110px] [@media(width<=767px)]:flex-1 [&_>_div]:flex [&_>_div]:gap-[10px] [&_>_div]:justify-between [&_>_div]:text-[12px] [&_>_div]:[padding:7px_0] [&_>_div_i]:w-[10px] [&_>_div_i]:h-[10px] [&_>_div_i]:rounded-[50%] [&_>_div_i]:shrink-0">
        {rows.map((row, index) => (
          <div key={row.name}>
            <i className={legendColors[index % legendColors.length]} />
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
    <div className="ad-bars [padding:4px_22px_24px] grid gap-[15px] [&_>_div_>_div:first-child]:flex [&_>_div_>_div:first-child]:justify-between [&_>_div_>_div:first-child]:gap-[12px] [&_>_div_>_div:first-child]:text-[9px] [&_>_div_>_div:first-child]:text-[#7b8c80] [&_>_div_>_div:first-child]:mb-[5px] [&_strong]:text-[#546c5c] [&_strong]:font-[500]">
      {rows.map((row) => (
        <div key={row.id}>
          <div>
            <span>{row.name}</span>
            <strong>{money(row.revenue, true)}</strong>
          </div>
          <div className="ad-bar-track h-[5px] [background:#f2f5f0] rounded-[4px] [&_i]:block [&_i]:h-full [&_i]:[background:#6c9b85] [&_i]:rounded-[4px]">
            <i
              className="[width:var(--admin-bar-width)]!"
              style={{ "--admin-bar-width": `${(row.revenue / max) * 100}%` }}
            />
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
