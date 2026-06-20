import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { electionApi } from "../../api/electionApi";
import "./my-elections.css";

interface Election {
  id: number;
  title: string;
  description?: string;
  status: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
}

type TabKey = "open" | "upcoming" | "ended";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "open",     label: "Đang diễn ra", icon: "🟢" },
  { key: "upcoming", label: "Sắp diễn ra",  icon: "🔵" },
  { key: "ended",    label: "Đã kết thúc",  icon: "⚫" },
];

const fmtDate = (v?: string) =>
  v ? new Date(v).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtCountdown = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút`;
};

const statusOf = (s: string): TabKey => {
  const u = (s ?? "").toUpperCase();
  if (u === "OPEN") return "open";
  if (["CLOSED", "ENDED"].includes(u)) return "ended";
  return "upcoming";
};

const maskCid = (cid: string) =>
  "*".repeat(Math.max(0, cid.length - 4)) + cid.slice(-4);

/* ── Skeleton ── */
const SkeletonGrid: React.FC = () => (
  <div className="me-skeleton-grid" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="me-skeleton-card">
        <div className="me-skeleton-img" />
        <div className="me-skeleton-body">
          <div className="me-skeleton-line" style={{ width: "80%" }} />
          <div className="me-skeleton-line" style={{ width: "55%" }} />
          <div className="me-skeleton-line" style={{ width: "65%" }} />
        </div>
      </div>
    ))}
  </div>
);

/* ── CCCD Gate ── */
const CCCDGate: React.FC<{ onVerified: (cid: string, data: Election[]) => void }> = ({ onVerified }) => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Cuộc bầu cử của tôi – SecuVote";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = value.trim();
    if (!cid) { setError("Vui lòng nhập số CCCD."); return; }
    setLoading(true); setError("");
    try {
      const res = await electionApi.getMyElections(cid);
      if (!Array.isArray(res.data)) throw new Error("Phản hồi không hợp lệ.");
      onVerified(cid, res.data);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data || err.message || "";
      if (status === 403 || (typeof msg === "string" && msg.includes("bị khóa"))) {
        setError("🔒 Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
      } else {
        setError(typeof msg === "string" && msg ? msg : "Mã CCCD không hợp lệ hoặc chưa được đăng ký.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="me-gate">
      <section className="me-gate-card" aria-labelledby="gate-title">
        <div style={{ textAlign: "center" }}>
          <div className="me-gate-icon" aria-hidden="true">🗳️</div>
          <h1 className="me-gate-title" id="gate-title">Cuộc bầu cử của tôi</h1>
          <p className="me-gate-sub">
            Nhập số CCCD để xem các cuộc bầu cử bạn đã được mời tham gia.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="cccd-input" className="me-gate-label">
            Số CCCD / CMND <span aria-hidden="true" style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            id="cccd-input"
            type="text"
            inputMode="numeric"
            value={value}
            onChange={e => { setValue(e.target.value); setError(""); }}
            placeholder="Ví dụ: 079201000998"
            autoFocus
            autoComplete="off"
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "cccd-error" : undefined}
            className={`me-gate-input${error ? " is-error" : ""}`}
          />
          {error && (
            <p id="cccd-error" className="me-gate-error" role="alert">
              <span aria-hidden="true">⚠️</span> {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="me-gate-btn" aria-busy={loading}>
            {loading ? "Đang xác minh…" : "Xác nhận"}
          </button>
        </form>

        <p className="me-gate-privacy">
          🔒 Số CCCD chỉ dùng để lọc cuộc bầu cử, không được lưu trữ thêm.
        </p>
      </section>
    </main>
  );
};

/* ── Election Card ── */
const ElectionCard: React.FC<{ election: Election; onClick: () => void; index: number }> = ({ election, onClick, index }) => {
  const tab = statusOf(election.status);
  const imgSrc = election.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(election.title)}&background=4f46e5&color=fff&size=400&bold=true`;
  const isOpen = tab === "open";
  const isEnded = tab === "ended";

  const rem = isOpen && election.endTime ? new Date(election.endTime).getTime() - Date.now() : 0;

  return (
    <article
      className="me-card"
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${election.title} – ${isOpen ? "Đang diễn ra" : isEnded ? "Đã kết thúc" : "Sắp diễn ra"}`}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="me-card-img-wrap">
        <img
          src={imgSrc}
          alt={`Ảnh cuộc bầu cử ${election.title}`}
          className="me-card-img"
          loading="lazy"
          decoding="async"
        />
        <div className="me-card-overlay" aria-hidden="true" />
        <span className={`me-badge me-badge--${tab}`} aria-hidden="true">
          {isOpen ? "Đang diễn ra" : isEnded ? "Đã kết thúc" : "Sắp diễn ra"}
        </span>
      </div>

      <div className="me-card-body">
        <h2 className="me-card-title">{election.title}</h2>
        {election.description && (
          <p className="me-card-desc">{election.description}</p>
        )}
        <p className="me-card-meta">
          <time dateTime={election.startTime}>📅 {fmtDate(election.startTime)}</time>
          {" – "}
          <time dateTime={election.endTime}>{fmtDate(election.endTime)}</time>
          {isOpen && rem > 0 && (
            <span className="me-countdown" aria-label={`Còn ${fmtCountdown(rem)}`}>
              ⏱ {fmtCountdown(rem)}
            </span>
          )}
        </p>
        <div className={`me-card-cta${isEnded ? " me-card-cta--ended" : ""}`}>
          <span>{isEnded ? "📊 Xem kết quả" : "👆 Tham gia bầu cử"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </article>
  );
};

/* ── Main Page ── */
const MyElections: React.FC = () => {
  const navigate = useNavigate();
  const [citizenId, setCitizenId] = useState<string | null>(null);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (citizenId) {
      document.title = `Cuộc bầu cử của tôi – SecuVote`;
    }
  }, [citizenId]);

  const handleVerified = (cid: string, data: Election[]) => {
    setElections(data);
    setCitizenId(cid);
  };

  const handleChangeCid = () => {
    setCitizenId(null);
    setElections([]);
    setQuery("");
    setActiveTab("open");
  };

  if (!citizenId) return <CCCDGate onVerified={handleVerified} />;

  const grouped: Record<TabKey, Election[]> = {
    open:     elections.filter(e => statusOf(e.status) === "open"),
    upcoming: elections.filter(e => statusOf(e.status) === "upcoming"),
    ended:    elections.filter(e => statusOf(e.status) === "ended"),
  };

  const q = query.trim().toLowerCase();
  const visible = q
    ? grouped[activeTab].filter(e => e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q))
    : grouped[activeTab];

  const handleClick = (e: Election) => {
    if (statusOf(e.status) === "ended") navigate(`/results?electionId=${e.id}`);
    else navigate(`/election-detail/${e.id}`);
  };

  const EMPTY: Record<TabKey, string> = {
    open:     "Bạn chưa có cuộc bầu cử nào đang diễn ra.",
    upcoming: "Bạn chưa có cuộc bầu cử nào sắp diễn ra.",
    ended:    "Bạn chưa có cuộc bầu cử nào đã kết thúc.",
  };

  return (
    <>
      {/* Hero / Header */}
      <header className="me-hero">
        <div className="me-hero-inner">
          <div>
            <p className="me-hero-eyebrow">🗳️ Hệ thống bầu cử điện tử SecuVote</p>
            <h1 className="me-hero-title">Cuộc bầu cử của tôi</h1>
            <p className="me-hero-meta">
              <span>CCCD: <strong>{maskCid(citizenId)}</strong></span>
              <button
                className="me-change-btn"
                onClick={handleChangeCid}
                aria-label="Đổi số CCCD"
              >
                Đổi CCCD
              </button>
            </p>
          </div>

          <nav className="me-tabs" aria-label="Lọc theo trạng thái">
            {TABS.map(t => (
              <button
                key={t.key}
                className={`me-tab-btn${activeTab === t.key ? " active" : ""}`}
                onClick={() => setActiveTab(t.key)}
                aria-pressed={activeTab === t.key}
                aria-label={`${t.label} (${grouped[t.key].length} cuộc bầu cử)`}
              >
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
                <span className="me-tab-count" aria-hidden="true">{grouped[t.key].length}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Toolbar */}
      <div className="me-toolbar" role="search">
        <div className="me-toolbar-inner">
          <div className="me-search-wrap">
            <svg className="me-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              className="me-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm kiếm cuộc bầu cử…"
              aria-label="Tìm kiếm cuộc bầu cử"
            />
            {query && (
              <button className="me-search-clear" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm">✕</button>
            )}
          </div>
          <p className="me-total">
            Tổng <strong>{elections.length}</strong> cuộc bầu cử
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="me-content" id="main-content" aria-label="Danh sách cuộc bầu cử">
        {loading ? (
          <SkeletonGrid />
        ) : visible.length === 0 ? (
          <section className="me-empty" aria-live="polite">
            <div className="me-empty-icon" aria-hidden="true">{q ? "🔍" : "📭"}</div>
            <p className="me-empty-text">
              {q
                ? <>Không tìm thấy kết quả cho "<strong>{query}</strong>"</>
                : EMPTY[activeTab]
              }
            </p>
          </section>
        ) : (
          <section className="me-grid" aria-live="polite">
            {visible.map((e, i) => (
              <ElectionCard key={e.id} election={e} onClick={() => handleClick(e)} index={i} />
            ))}
          </section>
        )}
      </main>
    </>
  );
};

export default MyElections;
