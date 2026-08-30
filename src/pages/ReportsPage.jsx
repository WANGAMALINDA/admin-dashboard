import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../components/supabaseClient";
import Footer from "../components/footer";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  X,
  Droplet,
  TriangleAlert,
  Zap,
  Leaf,
  Shield,
  Trash2,
  Home,
  Bus,
  HeartPulse,
  GraduationCap,
  Trees,
  CircleHelp,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Flag,
  Loader2,
  ImageOff,
  User,
  Users,
  ThumbsUp,
  RotateCcw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Design tokens & Category Icons                                     */
/* ------------------------------------------------------------------ */
const COLORS = {
  green900: "#064E3B",
  green700: "#15803D",
  green600: "#16A34A",
  green500: "#22B95E",
  green100: "#DCFCE7",
  green50: "#F0FDF4",
  amber500: "#F59E0B",
  amber100: "#FEF3C7",
  orange500: "#F97316",
  orange100: "#FFE9D6",
  blue500: "#3B82F6",
  blue100: "#DBEAFE",
  purple500: "#A855F7",
  purple100: "#F3E8FF",
  red500: "#EF4444",
  red100: "#FEE2E2",
  ink900: "#111827",
  ink700: "#374151",
  ink500: "#6B7280",
  ink300: "#D1D5DB",
  ink200: "#E5E7EB",
  ink100: "#F3F4F6",
};

function staffDisplayName(staff) {
  return staff.full_name || staff.username || "Unnamed staff";
}

const CATEGORY_ICON_FALLBACKS = [
  { match: /water|sanitation|sewer|pipe|leak/i, icon: Droplet, color: "#3B82F6" },
  { match: /road|infrastructure|pothole|traffic|bridge/i, icon: TriangleAlert, color: "#F59E0B" },
  { match: /util|power|electr|light|grid/i, icon: Zap, color: "#10B981" },
  { match: /environment|pollution|nature|air/i, icon: Leaf, color: "#16A34A" },
  { match: /safety|security|crime|police/i, icon: Shield, color: "#A855F7" },
  { match: /waste|garbage|dump|refuse|litter/i, icon: Trash2, color: "#EF4444" },
  { match: /housing|building|structure|shelter/i, icon: Home, color: "#8B5CF6" },
  { match: /transport|bus|transit|vehicle/i, icon: Bus, color: "#06B6D4" },
  { match: /health|clinic|hospital|medical/i, icon: HeartPulse, color: "#EC4899" },
  { match: /education|school|library/i, icon: GraduationCap, color: "#6366F1" },
  { match: /park|recreation|garden|green/i, icon: Trees, color: "#059669" },
];

function categoryMeta(name) {
  const found = CATEGORY_ICON_FALLBACKS.find((c) => c.match.test(name || ""));
  return found || { icon: CircleHelp, color: COLORS.ink500 };
}

function deriveTitle(title, categoryName) {
  return title || categoryName || "Untitled report";
}

function assigneeInfo(r, staffMap) {
  if (r.assigned_to_group_id && r.assigned_group) {
    return { type: "group", label: r.assigned_group.name };
  }
  if (r.assigned_to) {
    const staff = staffMap?.[r.assigned_to];
    if (!staff) return { type: null, label: null };
    return { type: "user", label: staffDisplayName(staff) };
  }
  return { type: null, label: null };
}

function firstReportPhoto(images) {
  if (!images || images.length === 0) return null;
  return [...images].sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at))[0].image_url;
}

function PhotoThumb({ src, color, size = 40, radius = 10 }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", border: `1px solid ${COLORS.ink200}`, flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: COLORS.ink100,
        color: color || COLORS.ink300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${COLORS.ink200}`,
      }}
    >
      <ImageOff size={size * 0.42} />
    </div>
  );
}

const STATUS_META = {
  open: { label: "Open", bg: COLORS.red100, fg: "#B91C1C" },
  in_progress: { label: "In Progress", bg: COLORS.amber100, fg: "#92400E" },
  under_review: { label: "Under Review", bg: "#EDE9FE", fg: "#6D28D9" },
  resolved: { label: "Resolved", bg: COLORS.green100, fg: COLORS.green700 },
  rejected: { label: "Rejected", bg: COLORS.red100, fg: "#991B1B" },
  closed: { label: "Closed", bg: COLORS.green100, fg: COLORS.green700 },
};
const STATUS_OPTIONS = Object.keys(STATUS_META);

const PRIORITY_META = {
  Low: { label: "Low", bg: COLORS.green100, fg: COLORS.green700 },
  Medium: { label: "Medium", bg: COLORS.amber100, fg: "#92400E" },
  High: { label: "High", bg: COLORS.orange100, fg: "#9A3412" },
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function Pill({ bg, fg, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, background: bg, color: fg }}>
      {children}
    </span>
  );
}

function Btn({ variant = "ghost", children, style, ...rest }) {
  const variants = {
    ghost: { background: "#fff", border: `1px solid ${COLORS.ink200}`, color: COLORS.ink700 },
    primary: { background: COLORS.green600, border: "1px solid transparent", color: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.05)" },
  };
  return (
    <button {...rest} style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, fontSize: 13, fontWeight: 600, padding: "10px 16px", cursor: rest.disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: ".15s ease", opacity: rest.disabled ? 0.5 : 1, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

function IconBtn({ children, ...rest }) {
  return (
    <button {...rest} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${COLORS.ink200}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: rest.disabled ? "not-allowed" : "pointer", color: COLORS.ink500, flexShrink: 0 }}>
      {children}
    </button>
  );
}

function StatCard({ card, active, onClick }) {
  const Icon = card.icon;
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        border: `2px solid ${active ? card.color : COLORS.ink200}`,
        borderRadius: 12,
        padding: "13px 13px 12px",
        flex: "1 1 160px",
        minWidth: 150,
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: active ? `0 0 0 2px ${card.color}25` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} />
        </div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.ink900, lineHeight: 1.1 }}>{card.value}</div>
      <div style={{ fontSize: 11, color: COLORS.ink500, marginTop: 2 }}>{card.label}</div>
    </div>
  );
}

function DonutChart({ segments, centerLabel, centerValue, onSegmentClick, activeCategory }) {
  const total = segments.reduce((s, x) => s + x.count, 0) || 1;
  let acc = 0;
  const stops = segments.map((s) => {
    const pct = (s.count / total) * 100;
    const start = acc;
    acc += pct;
    return { stop: `${s.color} ${start}% ${acc}%`, pct };
  });
  return (
    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: segments.length ? `conic-gradient(${stops.map((s) => s.stop).join(", ")})` : COLORS.ink100 }} />
      <div style={{ position: "absolute", inset: 16, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.ink900 }}>{centerValue}</div>
        <div style={{ fontSize: 9, color: COLORS.ink500 }}>{centerLabel}</div>
      </div>
    </div>
  );
}

function ReportViewModal({ report, onClose }) {
  if (!report) return null;
  const status = STATUS_META[report.status] || STATUS_META.open;
  const priority = PRIORITY_META[report.severity] || PRIORITY_META.Low;
  const cat = categoryMeta(report.categoryName);
  const CatIcon = cat.icon;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,.5)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}
    >
      <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px -20px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
            <PhotoThumb src={report.photoUrl} color={cat.color} size={56} radius={12} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.ink500, fontWeight: 600, marginBottom: 4 }}>#{report.id.slice(0, 8)}</div>
              <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: COLORS.ink900 }}>{report.title}</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Pill bg={status.bg} fg={status.fg}>{status.label}</Pill>
                <Pill bg={priority.bg} fg={priority.fg}>{priority.label} priority</Pill>
                <Pill bg={COLORS.blue100} fg={COLORS.blue500}>
                  <ThumbsUp size={11} style={{ marginRight: 3 }} /> {report.votes || 0} votes
                </Pill>
              </div>
            </div>
          </div>
          <IconBtn onClick={onClose}><X size={15} /></IconBtn>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 13.5, color: COLORS.ink900, lineHeight: 1.5 }}>{report.description}</div>
        </div>

        {report.additional_information && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 4 }}>Additional Information</div>
            <div style={{ fontSize: 13.5, color: COLORS.ink900, lineHeight: 1.5 }}>{report.additional_information}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
          {CatIcon && <CatIcon size={15} color={cat.color} />}
          <span style={{ fontSize: 13.5, color: COLORS.ink900 }}>{report.categoryName || "Uncategorized"}</span>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 4 }}>Location</div>
          <div style={{ fontSize: 13.5, color: COLORS.ink900 }}>{report.location || "Not specified"}</div>
        </div>

        {/* Assignee Selection Field */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 6 }}>
            Assign to Staff Member
          </div>
          <select
            value={report.assigned_to || ""}
            onChange={(e) => report.onAssigneeChange(report.id, e.target.value)}
            disabled={report.updating}
            style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, borderRadius: 10, border: `1px solid ${COLORS.ink200}`, background: "#fff", color: COLORS.ink900, boxSizing: "border-box" }}
          >
            <option value="">Unassigned</option>
            {(report.staffOptions || []).map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staffDisplayName(staff)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 4 }}>Date reported</div>
          <div style={{ fontSize: 13.5, color: COLORS.ink900 }}>{formatDate(report.created_at)}</div>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500, marginBottom: 6 }}>Change status</div>
          <select
            value={report.status}
            onChange={(e) => report.onStatusChange(report.id, e.target.value)}
            disabled={report.updating}
            style={{ width: "100%", padding: "10px 12px", fontSize: 13.5, borderRadius: 10, border: `1px solid ${COLORS.ink200}`, background: "#fff", color: COLORS.ink900, boxSizing: "border-box" }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>

        <Btn variant="primary" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={onClose}>Close</Btn>
      </div>
    </div>
  );
}

const PAGE_SIZE = 8;

export default function ReportsPage({ selectedCategory = "all", onCategoryChange }) {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(selectedCategory);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    setCategory(selectedCategory);
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    let cancelled = false;
    async function loadStaff() {
      const { data, error: staffErr } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("role", "staff")
        .order("full_name", { ascending: true });
      if (cancelled || staffErr) return;
      setStaffOptions(data || []);
    }
    loadStaff();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [{ data: reportRows, error: reportsErr }, { data: categoryRows, error: catErr }] = await Promise.all([
      supabase
        .from("reports")
        .select(`
          id, title, description, location, status, severity,
          additional_information, created_at, updated_at, votes,
          category_id, user_id, assigned_to, assigned_to_group_id,
          categories ( id, category_name ),
          assigned_group:groups!reports_assigned_to_group_id_fkey ( id, name ),
          report_images ( image_url, uploaded_at )
        `)
        .order("votes", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, category_name").order("category_name"),
    ]);

    if (reportsErr) {
      setError(reportsErr.message);
      setLoading(false);
      return;
    }
    if (catErr) {
      setError(catErr.message);
      setLoading(false);
      return;
    }

    const assignedIds = [...new Set((reportRows || []).map((r) => r.assigned_to).filter(Boolean))];
    let staffMap = {};
    if (assignedIds.length) {
      const { data: assignedProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", assignedIds);
      staffMap = Object.fromEntries((assignedProfiles || []).map((p) => [p.id, p]));
    }

    const activeReports = (reportRows || []).filter((r) =>
      ["open", "in_progress", "under_review"].includes(r.status)
    );
    const maxActiveVotes = activeReports.reduce((max, r) => Math.max(max, r.votes || 0), 0);

    const normalized = (reportRows || []).map((r) => {
      const categoryName = r.categories?.category_name || "Uncategorized";
      const votesCount = r.votes || 0;

      const isTopVoted = votesCount > 0 && votesCount === maxActiveVotes;
      const calculatedSeverity = isTopVoted ? "High" : r.severity || "Low";

      return {
        ...r,
        votes: votesCount,
        severity: calculatedSeverity,
        categoryName,
        title: deriveTitle(r.title, categoryName),
        photoUrl: firstReportPhoto(r.report_images),
        assignee: assigneeInfo(r, staffMap),
      };
    });

    setReports(normalized);
    setCategories(categoryRows || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const channel = supabase
      .channel("reports-admin-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchReports();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    setReports((list) => list.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));

    const { error: updateErr } = await supabase
      .from("reports")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    setUpdatingId(null);

    if (updateErr) {
      setError(updateErr.message);
      fetchReports();
      return;
    }
  }

  async function handleAssigneeChange(id, staffId) {
    setUpdatingId(id);
    const staff = staffOptions.find((s) => s.id === staffId);
    setReports((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              assigned_to: staffId || null,
              assignee: staffId ? { type: "user", label: staffDisplayName(staff || {}) } : { type: null, label: null },
            }
          : r
      )
    );

    const { error: updateErr } = await supabase
      .from("reports")
      .update({
        assigned_to: staffId || null,
        assigned_at: staffId ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setUpdatingId(null);

    if (updateErr) {
      setError(updateErr.message);
      fetchReports();
    }
  }

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (category !== "all") {
        const matchesId = r.category_id === category;
        const matchesName = r.categoryName?.toLowerCase() === category.toLowerCase();
        if (!matchesId && !matchesName) return false;
      }
      if (status !== "all" && r.status !== status) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.title || ""} ${r.id} ${r.location || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = useMemo(() => {
    const total = reports.length;
    const inProgress = reports.filter((r) => r.status === "in_progress").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const rejected = reports.filter((r) => r.status === "rejected").length;
    const underReview = reports.filter((r) => r.status === "under_review").length;
    return [
      { key: "all", label: "Total Reports", value: total.toLocaleString(), icon: FileText, color: COLORS.green600, bg: COLORS.green100 },
      { key: "in_progress", label: "In Progress", value: inProgress.toLocaleString(), icon: Clock, color: COLORS.amber500, bg: COLORS.amber100 },
      { key: "resolved", label: "Resolved", value: resolved.toLocaleString(), icon: CheckCircle2, color: COLORS.green600, bg: COLORS.green100 },
      { key: "rejected", label: "Rejected", value: rejected.toLocaleString(), icon: XCircle, color: "#DC2626", bg: COLORS.red100 },
      { key: "under_review", label: "Under Review", value: underReview.toLocaleString(), icon: Flag, color: "#8B5CF6", bg: "#EDE9FE" },
    ];
  }, [reports]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    reports.forEach((r) => {
      const name = r.categoryName || "Uncategorized";
      counts[name] = (counts[name] || 0) + 1;
    });
    const palette = ["#F59E0B", "#3B82F6", "#10B981", "#16A34A", "#A855F7", "#9CA3AF", "#EF4444", "#0EA5E9"];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => ({ name, count, color: palette[i % palette.length] }));
  }, [reports]);

  const viewingReport = useMemo(() => {
    const r = reports.find((x) => x.id === viewing);
    if (!r) return null;
    return {
      ...r,
      onStatusChange: handleStatusChange,
      onAssigneeChange: handleAssigneeChange,
      updating: updatingId === r.id,
      staffOptions,
    };
  }, [reports, viewing, updatingId, staffOptions]);

  function exportCsv() {
    const header = ["ID", "Title", "Category", "Votes", "Status", "Priority", "Location", "Assigned to", "Created at"];
    const rows = filtered.map((r) => [
      r.id,
      r.title,
      r.categoryName,
      r.votes || 0,
      STATUS_META[r.status]?.label || r.status,
      r.severity,
      r.location || "",
      r.assignee?.label || "",
      r.created_at,
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reports-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="home-page" style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", paddingTop: 20, paddingBottom: 0, paddingLeft: 40, paddingRight: 30 }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 3px", fontWeight: 800, letterSpacing: "-.01em", color: COLORS.ink900 }}>Reports</h1>
            <p style={{ margin: 0, color: COLORS.ink500, fontSize: 11.5 }}>View, manage and monitor all reported issues on the platform.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={exportCsv} disabled={loading || filtered.length === 0}>
              <Download size={13} /> Export Report
            </Btn>
          </div>
        </div>

        {error && (
          <div style={{ background: COLORS.red100, color: "#991B1B", borderRadius: 10, padding: "9px 12px", fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Interactive Stat cards (Clicking filters by status) */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {statCards.map((c) => (
            <StatCard
              key={c.key}
              card={c}
              active={status === c.key}
              onClick={() => {
                setStatus(c.key);
                setPage(1);
              }}
            />
          ))}
        </div>

        {/* Filters Toolbar */}
        <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 12, padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 220 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: COLORS.ink500 }} />
            <input
              type="text"
              placeholder="Search title, ID, location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: "100%", padding: "9px 12px 9px 36px", fontSize: 13, borderRadius: 10, border: `1px solid ${COLORS.ink200}`, background: "#fff", color: COLORS.ink900, outline: "none", boxSizing: "border-box" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COLORS.ink500 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
              if (onCategoryChange) onCategoryChange(e.target.value);
            }}
            style={{ padding: "9px 12px", fontSize: 13, borderRadius: 10, border: `1px solid ${COLORS.ink200}`, background: "#fff", color: COLORS.ink700, minWidth: 170 }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.category_name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "9px 12px", fontSize: 13, borderRadius: 10, border: `1px solid ${COLORS.ink200}`, background: "#fff", color: COLORS.ink700, minWidth: 160 }}
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{STATUS_META[st].label}</option>
            ))}
          </select>

          {/* Reset Filters */}
          {(search || category !== "all" || status !== "all") && (
            <Btn
              variant="ghost"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setStatus("all");
                setPage(1);
                if (onCategoryChange) onCategoryChange("all");
              }}
              style={{ padding: "9px 14px", color: COLORS.red500, borderColor: COLORS.red500 }}
            >
              <RotateCcw size={13} style={{ marginRight: 4 }} /> Reset Filters
            </Btn>
          )}
        </div>

        {/* Body: table + side panel */}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 640px", minWidth: 0 }}>
            <div style={{ fontSize: 11, color: COLORS.ink500, marginBottom: 8 }}>
              {loading ? "Loading reports…" : `Showing ${filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} reports`}
            </div>

            {/* Table */}
            <div style={{ background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: COLORS.ink100 }}>
                      {["Photo", "Report Title", "Category", "Assigned To", "Status", "Priority"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", color: COLORS.ink500, whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px 14px", textAlign: "center", color: COLORS.ink500 }}>
                          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Loading…
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px 14px", textAlign: "center", color: COLORS.ink500 }}>No reports match your filters.</td>
                      </tr>
                    ) : (
                      pageRows.map((r) => {
                        const st = STATUS_META[r.status] || STATUS_META.open;
                        const pr = PRIORITY_META[r.severity] || PRIORITY_META.Low;
                        const cat = categoryMeta(r.categoryName);
                        const CatIcon = cat.icon;
                        return (
                          <tr key={r.id} onClick={() => setViewing(r.id)} style={{ borderTop: `1px solid ${COLORS.ink100}`, cursor: "pointer" }}>
                            <td style={{ padding: "9px 12px" }}>
                              <PhotoThumb src={r.photoUrl} color={cat.color} />
                            </td>
                            <td style={{ padding: "9px 12px", maxWidth: 200 }}>
                              <div style={{ fontWeight: 700, color: COLORS.ink900 }}>{r.title}</div>
                              <div style={{ fontSize: 10.5, color: COLORS.ink500 }}>{r.location || "No location"}</div>
                            </td>
                            <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, color: cat.color, fontWeight: 600, fontSize: 11.5 }}>
                                {CatIcon && <CatIcon size={12} />} {r.categoryName}
                              </div>
                            </td>
                            <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                              {r.assignee.label ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.ink700 }}>
                                  {r.assignee.type === "group" ? <Users size={13} color={COLORS.ink500} /> : <User size={13} color={COLORS.ink500} />}
                                  {r.assignee.label}
                                </div>
                              ) : (
                                <span style={{ fontSize: 11.5, color: COLORS.ink300 }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: "9px 12px" }}>
                              <Pill bg={st.bg} fg={st.fg}>{st.label}</Pill>
                            </td>
                            <td style={{ padding: "9px 12px" }}>
                              <Pill bg={pr.bg} fg={pr.fg}>{pr.label}</Pill>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${COLORS.ink100}`, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, color: COLORS.ink500 }}>
                  Page {page} of {totalPages}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <IconBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</IconBtn>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
                    <button key={n} onClick={() => setPage(n)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${COLORS.ink200}`, background: page === n ? COLORS.green600 : "#fff", color: page === n ? "#fff" : COLORS.ink700, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {n}
                    </button>
                  ))}
                  <IconBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</IconBtn>
                </div>
              </div>
            </div>
          </div>

          {/* Side panel: donut + interactive categories breakdown */}
          <div style={{ flex: "0 0 260px", width: 260, background: "#fff", border: `1px solid ${COLORS.ink200}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink900 }}>Report Breakdown</div>
            </div>

            <DonutChart segments={categoryBreakdown} centerValue={filtered.length.toLocaleString()} centerLabel="Filtered" />

            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: COLORS.ink500 }}>Filter by Category</div>
              {categoryBreakdown.length === 0 ? (
                <div style={{ fontSize: 11, color: COLORS.ink500 }}>No data yet.</div>
              ) : (
                categoryBreakdown.map((c) => {
                  const isSelected = category.toLowerCase() === c.name.toLowerCase();
                  return (
                    <div
                      key={c.name}
                      onClick={() => {
                        setCategory(isSelected ? "all" : c.name);
                        setPage(1);
                        if (onCategoryChange) onCategoryChange(isSelected ? "all" : c.name);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 10.5,
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: 6,
                        background: isSelected ? COLORS.ink100 : "transparent",
                        transition: "background 0.1s ease",
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: COLORS.ink700, fontWeight: isSelected ? 700 : 400 }}>{c.name}</span>
                      <span style={{ fontWeight: 700, color: COLORS.ink900 }}>{c.count}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <ReportViewModal report={viewingReport} onClose={() => setViewing(null)} />
      </div>
      <Footer />
    </div>
  );
}