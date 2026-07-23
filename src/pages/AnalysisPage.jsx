import { useState } from "react";
import {
  FileText,
  Clock3,
  CheckCircle2,
  TrendingUp,
  ChevronDown,
  Droplet,
  TriangleAlert,
  Zap,
  Leaf,
  Shield,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens — matches Reports/Assignments pages                    */
/* ------------------------------------------------------------------ */
const COLORS = {
  green900: "#064E3B",
  green700: "#15803D",
  green600: "#16A34A",
  green100: "#DCFCE7",
  amber500: "#F59E0B",
  amber100: "#FEF3C7",
  blue500: "#3B82F6",
  blue100: "#DBEAFE",
  purple500: "#A855F7",
  red500: "#EF4444",
  ink900: "#111827",
  ink700: "#374151",
  ink500: "#6B7280",
  ink300: "#D1D5DB",
  ink200: "#E5E7EB",
  ink100: "#F3F4F6",
};

const STAT_CARDS = [
  { label: "Reports Analyzed", value: "12,458", trend: "+18.6%", up: true, icon: FileText, color: COLORS.green600, bg: COLORS.green100 },
  { label: "Avg. Resolution Time", value: "3.2 days", trend: "-0.6 days", up: true, icon: Clock3, color: COLORS.amber500, bg: COLORS.amber100 },
  { label: "Resolution Rate", value: "70.1%", trend: "+4.2%", up: true, icon: CheckCircle2, color: COLORS.blue500, bg: COLORS.blue100 },
  { label: "Overdue Rate", value: "9.4%", trend: "+1.1%", up: false, icon: TrendingUp, color: COLORS.purple500, bg: "#F3E8FF" },
];

const CATEGORY_BREAKDOWN = [
  { name: "Roads & Infrastructure", pct: 31.0, color: "#F59E0B", icon: TriangleAlert },
  { name: "Water & Sanitation", pct: 24.0, color: "#3B82F6", icon: Droplet },
  { name: "Public Utilities", pct: 18.0, color: "#10B981", icon: Zap },
  { name: "Environment", pct: 13.0, color: "#16A34A", icon: Leaf },
  { name: "Safety & Security", pct: 9.0, color: "#A855F7", icon: Shield },
  { name: "Other", pct: 5.0, color: "#9CA3AF", icon: null },
];

// Reports received vs resolved, last 6 months — swap for a real query.
const MONTHLY_TREND = [
  { month: "Feb", received: 1520, resolved: 1180 },
  { month: "Mar", received: 1690, resolved: 1310 },
  { month: "Apr", received: 1840, resolved: 1490 },
  { month: "May", received: 2010, resolved: 1620 },
  { month: "Jun", received: 2210, resolved: 1980 },
  { month: "Jul", received: 2340, resolved: 2162 },
];

const TEAM_WORKLOAD = [
  { name: "Roads & Infrastructure", value: 18, total: 30, color: "#F59E0B" },
  { name: "Water & Sanitation", value: 14, total: 25, color: "#3B82F6" },
  { name: "Public Utilities", value: 12, total: 20, color: "#10B981" },
  { name: "Environment", value: 9, total: 20, color: "#16A34A" },
  { name: "Safety & Security", value: 6, total: 15, color: "#A855F7" },
];

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */
function Select({ value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", WebkitAppearance: "none", background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 10, padding: "9px 30px 9px 14px", fontSize: 13, fontWeight: 500, color: COLORS.ink700, cursor: "pointer", fontFamily: "inherit" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} color={COLORS.ink500} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ card }) {
  const Icon = card.icon;
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 14, padding: "18px 18px 16px", flex: "1 1 200px", minWidth: 180 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Icon size={17} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.ink900, lineHeight: 1.1 }}>{card.value}</div>
      <div style={{ fontSize: 12.5, color: COLORS.ink500, marginTop: 2, marginBottom: 8 }}>{card.label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: card.up ? COLORS.green700 : COLORS.red500 }}>
        {card.up ? "↑" : "↓"} {card.trend} vs. last period
      </div>
    </div>
  );
}

function DonutChart({ segments, centerLabel, centerValue }) {
  let acc = 0;
  const stops = segments.map((s) => {
    const start = acc;
    acc += s.pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  return (
    <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `conic-gradient(${stops.join(", ")})` }} />
      <div style={{ position: "absolute", inset: 20, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.ink900 }}>{centerValue}</div>
        <div style={{ fontSize: 11, color: COLORS.ink500 }}>{centerLabel}</div>
      </div>
    </div>
  );
}

/* Simple grouped bar chart, no chart library — CSS bars scaled to max  */
function TrendChart({ data }) {
  const max = Math.max(...data.flatMap((d) => [d.received, d.resolved]));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 180, padding: "0 4px" }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150, width: "100%", justifyContent: "center" }}>
              <div title={`Received: ${d.received}`} style={{ width: 14, height: `${(d.received / max) * 100}%`, background: COLORS.ink300, borderRadius: "4px 4px 0 0" }} />
              <div title={`Resolved: ${d.resolved}`} style={{ width: 14, height: `${(d.resolved / max) * 100}%`, background: COLORS.green600, borderRadius: "4px 4px 0 0" }} />
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.ink500, fontWeight: 600 }}>{d.month}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS.ink300 }} /> Received
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: COLORS.green600 }} /> Resolved
        </div>
      </div>
    </div>
  );
}

function WorkloadBar({ item }) {
  const pct = Math.round((item.value / item.total) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: COLORS.ink700, fontWeight: 600 }}>{item.name}</span>
        <span style={{ color: COLORS.ink500 }}>{item.value}/{item.total}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: COLORS.ink100, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: item.color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Analysis panel                                                  */
/* ------------------------------------------------------------------ */
export default function AnalysisPage() {
  const [range, setRange] = useState("Last 30 Days");

  return (
    <div style={{ padding: "36px 40px 80px", maxWidth: 1400, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 800, letterSpacing: "-.01em", color: COLORS.ink900 }}>Analysis</h1>
          <p style={{ margin: 0, color: COLORS.ink500, fontSize: 13.5 }}>Trends and analytics across reports, assignments, and resolution performance.</p>
        </div>
        <Select value={range} onChange={setRange} options={["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"]} />
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        {STAT_CARDS.map((c) => <StatCard key={c.label} card={c} />)}
      </div>

      {/* Trend + category breakdown */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <Card style={{ flex: "1 1 560px", minWidth: 320 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink900, marginBottom: 4 }}>Reports Received vs. Resolved</div>
          <div style={{ fontSize: 12, color: COLORS.ink500, marginBottom: 16 }}>Last 6 months</div>
          <TrendChart data={MONTHLY_TREND} />
        </Card>

        <Card style={{ flex: "0 0 340px", width: 340 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink900, marginBottom: 16 }}>Category Breakdown</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <DonutChart segments={CATEGORY_BREAKDOWN} centerValue="12,458" centerLabel="Total" />
            <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 0 }}>
              {CATEGORY_BREAKDOWN.map((c) => (
                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: COLORS.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                  <span style={{ fontWeight: 700, color: COLORS.ink900 }}>{c.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Team workload */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.ink900 }}>Team Workload by Category</div>
          <span style={{ fontSize: 12, color: COLORS.ink500 }}>Open assignments per category</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "4px 32px" }}>
          {TEAM_WORKLOAD.map((item) => <WorkloadBar key={item.name} item={item} />)}
        </div>
      </Card>
    </div>
  );
}
