import { useEffect, useMemo, useState } from "react";
import Footer from "../components/footer"
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
import { supabase } from "../components/supabaseClient";

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

// Mirrors the reports.status CHECK constraint in Supabase (see AdminLocations.jsx).
const OPEN_STATUSES = ["open", "in_progress", "under_review"];
const RESOLVED_STATUSES = ["resolved", "closed"];
const OVERDUE_AFTER_DAYS = 7;

const RANGE_TO_DAYS = {
  "Last 7 Days": 7,
  "Last 30 Days": 30,
  "Last 90 Days": 90,
  "This Year": 365,
};

// Cycled onto whatever categories exist in the categories table.
const CATEGORY_PALETTE = ["#F59E0B", "#3B82F6", "#10B981", "#16A34A", "#A855F7", "#EF4444", "#9CA3AF"];
const CATEGORY_ICONS = [TriangleAlert, Droplet, Zap, Leaf, Shield, null];

function isOverdue(row) {
  if (!OPEN_STATUSES.includes(row.status)) return false;
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  return ageMs > OVERDUE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function fmtSigned(value, suffix = "%") {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                                */
/* ------------------------------------------------------------------ */
function Select({ value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", WebkitAppearance: "none", background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 8, padding: "6px 26px 6px 11px", fontSize: 12, fontWeight: 500, color: COLORS.ink700, cursor: "pointer", fontFamily: "inherit" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} color={COLORS.ink500} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 12, padding: 14, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ card }) {
  const Icon = card.icon;
  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 12, padding: "13px 13px 12px", flex: "1 1 160px", minWidth: 150 }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 9 }}>
        <Icon size={13} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.ink900, lineHeight: 1.1 }}>{card.value}</div>
      <div style={{ fontSize: 11, color: COLORS.ink500, marginTop: 2, marginBottom: 6 }}>{card.label}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: card.up ? COLORS.green700 : COLORS.red500 }}>
        {card.up ? "↑" : "↓"} {card.trend} vs. last period
      </div>
    </div>
  );
}

function DonutChart({ segments, centerLabel, centerValue, size = 120 }) {
  let acc = 0;
  const stops = segments.map((s) => {
    const start = acc;
    acc += s.pct;
    return `${s.color} ${start}% ${acc}%`;
  });
  const innerInset = Math.round(size * 0.125);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `conic-gradient(${stops.join(", ")})` }} />
      <div style={{ position: "absolute", inset: innerInset, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink900 }}>{centerValue}</div>
        <div style={{ fontSize: 9.5, color: COLORS.ink500 }}>{centerLabel}</div>
      </div>
    </div>
  );
}

/* Simple grouped bar chart, no chart library — CSS bars scaled to max  */
function TrendChart({ data }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.received, d.resolved]));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130, padding: "0 2px" }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 106, width: "100%", justifyContent: "center" }}>
              <div title={`Received: ${d.received}`} style={{ width: 10, height: `${(d.received / max) * 100}%`, background: COLORS.ink300, borderRadius: "3px 3px 0 0" }} />
              <div title={`Resolved: ${d.resolved}`} style={{ width: 10, height: `${(d.resolved / max) * 100}%`, background: COLORS.green600, borderRadius: "3px 3px 0 0" }} />
            </div>
            <div style={{ fontSize: 10, color: COLORS.ink500, fontWeight: 600 }}>{d.month}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 9, fontSize: 10.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.ink300 }} /> Received
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: COLORS.green600 }} /> Resolved
        </div>
      </div>
    </div>
  );
}

function WorkloadBar({ item }) {
  const pct = item.total ? Math.round((item.value / item.total) * 100) : 0;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: COLORS.ink700, fontWeight: 600 }}>{item.name}</span>
        <span style={{ color: COLORS.ink500 }}>{item.value}/{item.total}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: COLORS.ink100, overflow: "hidden" }}>
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
  const [currentRows, setCurrentRows] = useState([]);
  const [previousRows, setPreviousRows] = useState([]);
  const [trendRows, setTrendRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const days = RANGE_TO_DAYS[range] ?? 30;

  const fetchAnalysis = async () => {
    setLoading(true);
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const baseSelect = "id, status, severity, created_at, category:categories(category_name)";

    const [{ data: current, error: currentError }, { data: previous, error: previousError }, { data: trend, error: trendError }, { data: cats }] = await Promise.all([
      supabase.from("reports").select(baseSelect).gte("created_at", currentStart.toISOString()),
      supabase.from("reports").select(baseSelect).gte("created_at", previousStart.toISOString()).lt("created_at", currentStart.toISOString()),
      supabase.from("reports").select(baseSelect).gte("created_at", sixMonthsAgo.toISOString()),
      supabase.from("categories").select("id, category_name").order("category_name", { ascending: true }),
    ]);

    const firstError = currentError || previousError || trendError;
    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    setLoadError("");
    setCurrentRows(current || []);
    setPreviousRows(previous || []);
    setTrendRows(trend || []);
    setCategories(cats || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalysis();
    // Keep the dashboard live, matching the pattern used on the Locations page.
    const channel = supabase
      .channel("analysis-page-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchAnalysis();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const categoryColor = useMemo(() => {
    const map = new Map();
    categories.forEach((c, i) => map.set(c.category_name, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]));
    return map;
  }, [categories]);

  const categoryIcon = useMemo(() => {
    const map = new Map();
    categories.forEach((c, i) => map.set(c.category_name, CATEGORY_ICONS[i % CATEGORY_ICONS.length]));
    return map;
  }, [categories]);

  const summarize = (rows) => {
    const total = rows.length;
    const resolved = rows.filter((r) => RESOLVED_STATUSES.includes(r.status)).length;
    const overdue = rows.filter((r) => isOverdue(r)).length;
    // No resolved_at column exists yet, so resolution time is approximated
    // from the age of currently-resolved reports until that column is added.
    const resolvedAges = rows
      .filter((r) => RESOLVED_STATUSES.includes(r.status))
      .map((r) => (Date.now() - new Date(r.created_at).getTime()) / (24 * 60 * 60 * 1000));
    const avgAge = resolvedAges.length ? resolvedAges.reduce((a, b) => a + b, 0) / resolvedAges.length : 0;
    return { total, resolved, overdue, avgAge };
  };

  const current = useMemo(() => summarize(currentRows), [currentRows]);
  const previous = useMemo(() => summarize(previousRows), [previousRows]);

  const statCards = useMemo(() => {
    const resolutionRate = current.total ? (current.resolved / current.total) * 100 : 0;
    const prevResolutionRate = previous.total ? (previous.resolved / previous.total) * 100 : 0;
    const overdueRate = current.total ? (current.overdue / current.total) * 100 : 0;
    const prevOverdueRate = previous.total ? (previous.overdue / previous.total) * 100 : 0;
    const resolutionDelta = resolutionRate - prevResolutionRate;
    const overdueDelta = overdueRate - prevOverdueRate;
    const avgAgeDelta = current.avgAge - previous.avgAge;

    return [
      { label: "Reports Analyzed", value: current.total.toLocaleString(), trend: fmtSigned(pctChange(current.total, previous.total)), up: current.total >= previous.total, icon: FileText, color: COLORS.green600, bg: COLORS.green100 },
      { label: "Avg. Resolution Time", value: `${current.avgAge.toFixed(1)} days`, trend: fmtSigned(avgAgeDelta, " days"), up: avgAgeDelta <= 0, icon: Clock3, color: COLORS.amber500, bg: COLORS.amber100 },
      { label: "Resolution Rate", value: `${resolutionRate.toFixed(1)}%`, trend: fmtSigned(resolutionDelta, " pts"), up: resolutionDelta >= 0, icon: CheckCircle2, color: COLORS.blue500, bg: COLORS.blue100 },
      { label: "Overdue Rate", value: `${overdueRate.toFixed(1)}%`, trend: fmtSigned(overdueDelta, " pts"), up: overdueDelta <= 0, icon: TrendingUp, color: COLORS.purple500, bg: "#F3E8FF" },
    ];
  }, [current, previous]);

  const categoryBreakdown = useMemo(() => {
    const counts = new Map();
    currentRows.forEach((r) => {
      const name = r.category?.category_name || "Uncategorized";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const total = currentRows.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        pct: (count / total) * 100,
        color: categoryColor.get(name) || "#9CA3AF",
        icon: categoryIcon.get(name) || null,
      }));
  }, [currentRows, categoryColor, categoryIcon]);

  const monthlyTrend = useMemo(() => {
    const buckets = new Map();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.set(key, { month: d.toLocaleString("en-ZA", { month: "short" }), received: 0, resolved: 0 });
    }
    trendRows.forEach((r) => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.received += 1;
      if (RESOLVED_STATUSES.includes(r.status)) bucket.resolved += 1;
    });
    return [...buckets.values()];
  }, [trendRows]);

  const teamWorkload = useMemo(() => {
    const openRows = currentRows.filter((r) => OPEN_STATUSES.includes(r.status));
    const byCategory = new Map();
    openRows.forEach((r) => {
      const name = r.category?.category_name || "Uncategorized";
      const entry = byCategory.get(name) || { total: 0, inProgress: 0 };
      entry.total += 1;
      if (r.status === "in_progress") entry.inProgress += 1;
      byCategory.set(name, entry);
    });
    return [...byCategory.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, entry]) => ({
        name,
        value: entry.inProgress,
        total: entry.total,
        color: categoryColor.get(name) || "#9CA3AF",
      }));
  }, [currentRows, categoryColor]);

  const totalForDonut = current.total;

  return (
    <div className="home-page" style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", paddingTop: 20, paddingBottom: 0, paddingLeft: 40 }}>
      <div style={{maxWidth: 1300, margin: "0 10", display: "flex", flexDirection: "column", gap: 20}}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 3px",fontWeight: 800, letterSpacing: "-.01em", color: COLORS.ink900 }}>Analysis</h1>
          <p style={{ margin: 0, color: COLORS.ink500, fontSize: 11.5 }}>Trends and analytics across reports, assignments, and resolution performance.</p>
        </div>
        <Select value={range} onChange={setRange} options={["Last 7 Days", "Last 30 Days", "Last 90 Days", "This Year"]} />
      </div>

      {loadError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 10, padding: "9px 12px", fontSize: 12, marginBottom: 14 }}>
          Couldn't load analysis data: {loadError}
        </div>
      )}

      {loading ? (
        <Card>
          <div style={{ fontSize: 12.5, color: COLORS.ink500 }}>Loading analysis…</div>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {statCards.map((c) => <StatCard key={c.label} card={c} />)}
          </div>

          {/* Trend + category breakdown */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            <Card style={{ flex: "1 1 480px", minWidth: 280 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink900, marginBottom: 3 }}>Reports Received vs. Resolved</div>
              <div style={{ fontSize: 10.5, color: COLORS.ink500, marginBottom: 11 }}>Last 6 months</div>
              <TrendChart data={monthlyTrend} />
            </Card>

            <Card style={{ flex: "0 0 280px", width: 280 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink900, marginBottom: 11 }}>Category Breakdown</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DonutChart segments={categoryBreakdown} centerValue={totalForDonut.toLocaleString()} centerLabel="Total" />
                <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
                  {categoryBreakdown.map((c) => (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: COLORS.ink700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: COLORS.ink900 }}>{c.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <div style={{ fontSize: 10.5, color: COLORS.ink500 }}>No reports in this period.</div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Team workload */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink900 }}>Team Workload by Category</div>
              <span style={{ fontSize: 10.5, color: COLORS.ink500 }}>In-progress vs. open assignments per category</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "3px 26px" }}>
              {teamWorkload.map((item) => <WorkloadBar key={item.name} item={item} />)}
              {teamWorkload.length === 0 && (
                <div style={{ fontSize: 11, color: COLORS.ink500 }}>No open reports in this period.</div>
              )}
            </div>
          </Card>
        </>
      )}
      </div>
      <Footer />
    </div>
  );
}