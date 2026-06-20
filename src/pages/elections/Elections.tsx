import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import "./elections-list.css";

interface Election {
  id: number;
  title: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  endTime?: string;
  image?: string;
  imageUrl?: string;
}

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtCountdown = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
};

const CountdownBadge: React.FC<{ endTime: string }> = ({ endTime }) => {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const rem = new Date(endTime).getTime() - Date.now();
      setText(rem > 0 ? fmtCountdown(rem) : "Đã kết thúc");
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [endTime]);
  return (
    <span className="el-countdown" aria-live="polite">⏱ {text}</span>
  );
};

interface CardProps {
  election: Election;
  voted: boolean;
  onClick: () => void;
  index: number;
}

const ElectionCard: React.FC<CardProps> = ({ election, voted, onClick, index }) => {
  const status = (election.status ?? "").toUpperCase();
  const isOpen   = status === "OPEN";
  const isClosed = ["CLOSED", "ENDED"].includes(status);
  const endTimeVal = election.endTime || election.endDate;

  const imgSrc =
    election.image || election.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(election.title)}&background=4f46e5&color=fff&size=400&bold=true`;

  return (
    <article
      className={`el-card${isClosed ? " el-card--closed" : ""}${isOpen ? " el-card--open" : ""} el-slide-up`}
      style={{ animationDelay: `${index * 55}ms` }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={election.title}
    >
      <div className="el-card-img-wrap">
        <img className="el-card-img" src={imgSrc} alt={election.title} loading="lazy" width="360" height="160" />
        <div className="el-card-img-overlay" />
        {voted && isOpen && <span className="el-voted-pill">✓ Đã bỏ phiếu</span>}
      </div>

      <div className="el-card-body">
        <h3 className="el-card-title">{election.title}</h3>
        {election.description && <p className="el-card-desc">{election.description}</p>}
        <div className="el-card-meta">
          <span className="el-card-date">📅 {fmtDate(election.startDate)} – {fmtDate(endTimeVal)}</span>
          {isOpen && endTimeVal && <CountdownBadge endTime={endTimeVal} />}
        </div>
      </div>

      <div className={`el-card-cta${isClosed ? " el-card-cta--result" : ""}`}>
        <span>{isClosed ? "📊 Xem kết quả" : "👆 Tham gia bầu cử"}</span>
        <svg className="el-cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </article>
  );
};

type TabKey = "open" | "upcoming" | "ended";

const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: "open",     label: "Đang diễn ra", icon: "🟢", color: "#10b981" },
  { key: "upcoming", label: "Sắp diễn ra",  icon: "🔵", color: "#3b82f6" },
  { key: "ended",    label: "Đã kết thúc",  icon: "⚫", color: "#94a3b8" },
];

const EMPTY: Record<TabKey, { icon: string; text: string }> = {
  open:     { icon: "🗳️", text: "Không có cuộc bầu cử nào đang diễn ra." },
  upcoming: { icon: "📅", text: "Không có cuộc bầu cử nào sắp diễn ra." },
  ended:    { icon: "✅", text: "Chưa có cuộc bầu cử nào kết thúc." },
};

const Elections: React.FC = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [query, setQuery]         = useState("");
  const [votedIds] = useState<number[]>(() =>
    JSON.parse(localStorage.getItem("votedElections") || "[]")
  );

  useEffect(() => {
    document.title = "Cuộc bầu cử – Hệ thống bầu cử điện tử";
    electionApi.getAll()
      .then((res) => setElections(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    return () => { document.title = "Hệ thống bầu cử điện tử"; };
  }, []);

  const grouped: Record<TabKey, Election[]> = {
    open:     elections.filter((e) => (e.status ?? "").toUpperCase() === "OPEN"),
    upcoming: elections.filter((e) => ["UPCOMING", "PENDING"].includes((e.status ?? "").toUpperCase())),
    ended:    elections.filter((e) => ["CLOSED", "ENDED"].includes((e.status ?? "").toUpperCase())),
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? grouped[activeTab].filter((e) => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q))
    : grouped[activeTab];

  const handleCardClick = (id: number, isClosed: boolean) =>
    isClosed ? navigate(`/results?electionId=${id}`) : navigate(`/election-detail/${id}`);

  return (
    <main className="el-page" aria-label="Danh sách cuộc bầu cử">

      {/* ── Hero ── */}
      <header className="el-hero">
        <div className="el-hero-inner">
          <div className="el-hero-text">
            <p className="el-hero-eyebrow">🗳️ Hệ thống bầu cử điện tử</p>
            <h1 className="el-hero-title">Cuộc bầu cử</h1>
            <p className="el-hero-sub">Tham gia bầu cử và theo dõi kết quả trực tiếp</p>
          </div>
          <div className="el-hero-chips">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`el-hero-chip${activeTab === t.key ? " el-hero-chip--active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                <span className="el-hero-chip-val">{grouped[t.key].length}</span>
                <span className="el-hero-chip-lbl">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Tab bar + Search ── */}
      <div className="el-toolbar">
        <div className="el-toolbar-inner">
          <nav className="el-tabs" role="tablist" aria-label="Bộ lọc cuộc bầu cử">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                className={`el-tab${activeTab === t.key ? " el-tab--active" : ""}`}
                style={{ "--tab-color": t.color } as React.CSSProperties}
                onClick={() => { setActiveTab(t.key); setQuery(""); }}
              >
                <span className="el-tab-icon">{t.icon}</span>
                {t.label}
                <span className="el-tab-count">{grouped[t.key].length}</span>
              </button>
            ))}
          </nav>

          <div className="el-search-inner">
            <svg className="el-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="el-search"
              type="search"
              placeholder="Tìm kiếm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm kiếm cuộc bầu cử"
            />
            {query && (
              <button className="el-search-clear" onClick={() => setQuery("")} aria-label="Xóa">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="el-content">
        {loading ? (
          <div className="el-loading" role="status">
            <div className="el-spinner" />
            <span>Đang tải danh sách...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="el-empty-full">
            <span className="el-empty-icon">{q ? "🔍" : EMPTY[activeTab].icon}</span>
            <p className="el-empty-text">
              {q ? <>Không tìm thấy kết quả cho "<strong>{query}</strong>"</> : EMPTY[activeTab].text}
            </p>
          </div>
        ) : (
          <div className="el-grid" role="list" key={activeTab}>
            {visible.map((e, i) => (
              <div key={e.id} role="listitem">
                <ElectionCard
                  election={e}
                  voted={votedIds.includes(e.id)}
                  index={i}
                  onClick={() => handleCardClick(e.id, ["CLOSED", "ENDED"].includes((e.status ?? "").toUpperCase()))}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Elections;
