import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { userApi } from "../../api/userApi";
import { electionApi } from "../../api/electionApi";

type FilterTab = "open" | "upcoming" | "ended";

interface Profile { citizenId?: string; }

interface Election {
  id: number;
  title: string;
  description?: string;
  status: string;
  imageUrl?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const statusOf = (s: string): FilterTab => {
  const u = (s ?? "").toUpperCase();
  if (u === "OPEN") return "open";
  if (["CLOSED", "ENDED"].includes(u)) return "ended";
  return "upcoming";
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang diễn ra", UPCOMING: "Sắp diễn ra",
  CLOSED: "Đã kết thúc", ENDED: "Đã kết thúc",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "#10b981", UPCOMING: "#3b82f6",
  CLOSED: "#6b7280", ENDED: "#6b7280",
};

const ElectionCard: React.FC<{ e: Election; onClick: () => void }> = ({ e, onClick }) => {
  const img = e.imageUrl || e.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(e.title)}&background=4f46e5&color=fff&size=400&bold=true`;
  const start   = e.startDate || e.startTime;
  const end     = e.endDate   || e.endTime;
  const sc      = STATUS_COLOR[(e.status ?? "").toUpperCase()] ?? "#6b7280";
  const sl      = STATUS_LABEL[(e.status ?? "").toUpperCase()] ?? e.status;
  const isEnded = statusOf(e.status) === "ended";

  return (
    <article onClick={onClick}
      style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "box-shadow 0.15s" }}
      onMouseEnter={ev => (ev.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,.09)")}
      onMouseLeave={ev => (ev.currentTarget.style.boxShadow = "none")}>
      <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
        <img src={img} alt={e.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
        <span style={{ position: "absolute", top: 10, left: 10, background: sc, color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "3px 10px" }}>{sl}</span>
      </div>
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", lineHeight: 1.4 }}>{e.title}</div>
        {e.description && (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {e.description}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: "auto", paddingTop: 6 }}>📅 {fmtDate(start)} – {fmtDate(end)}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: isEnded ? "#6b7280" : "#4f46e5", marginTop: 4 }}>
          {isEnded ? "📊 Xem kết quả →" : "👆 Xem chi tiết →"}
        </div>
      </div>
    </article>
  );
};

const VoterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [elections, setElections] = useState<Election[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState<FilterTab>("open");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    document.title = "Cuộc bầu cử – SecuVote";
    if (!user) { navigate("/login"); return; }

    userApi.getProfile()
      .then((res: any) => {
        const cid = res?.citizenId;
        if (cid) {
          return electionApi.getMyElections(cid)
            .then(r => { if (Array.isArray(r.data)) setElections(r.data); });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byF = (list: Election[], f: FilterTab) => list.filter(e => statusOf(e.status) === f);
  const visible = (() => {
    const q = search.trim().toLowerCase();
    const base = byF(elections, filter);
    return q ? base.filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q)) : base;
  })();

  const counts: Record<FilterTab, number> = {
    open:     byF(elections, "open").length,
    upcoming: byF(elections, "upcoming").length,
    ended:    byF(elections, "ended").length,
  };

  const FILTERS: { key: FilterTab; label: string; color: string }[] = [
    { key: "open",     label: "Đang diễn ra", color: "#10b981" },
    { key: "upcoming", label: "Sắp diễn ra",  color: "#3b82f6" },
    { key: "ended",    label: "Đã kết thúc",  color: "#6b7280" },
  ];

  const goElection = (e: Election) => {
    if (statusOf(e.status) === "ended") navigate(`/results?electionId=${e.id}`);
    else navigate(`/candidates/${e.id}`);
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e293b", flex: 1 }}>Cuộc bầu cử của tôi</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm kiếm..."
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, width: 220, outline: "none", background: "#fff" }} />
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {FILTERS.map(f => {
            const on = filter === f.key;
            return (
              <button key={f.key} onClick={() => { setFilter(f.key); setSearch(""); }}
                style={{ padding: "7px 18px", borderRadius: 99, border: `1.5px solid ${on ? f.color : "#e5e7eb"}`, background: on ? f.color : "#fff", color: on ? "#fff" : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                {f.label} <span style={{ opacity: 0.75, fontSize: 11 }}>({counts[f.key]})</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>⏳ Đang tải...</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
            Không có cuộc bầu cử nào.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 18 }}>
            {visible.map(e => <ElectionCard key={e.id} e={e} onClick={() => goElection(e)} />)}
          </div>
        )}

      </div>
    </div>
  );
};

export default VoterDashboard;
