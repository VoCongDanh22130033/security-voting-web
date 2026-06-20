import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { electionApi } from "../../api/electionApi";
import "./results.css";

interface ElectionRound {
  id: number;
  roundNumber: number;
  title: string;
  status: string;
  maxAdvanceCount: number;
  startTime: string;
  endTime: string;
}

interface CandidateResult {
  id: number;
  name: string;
  imageUrl: string;
  description: string;
  voteCount: number;
}

const fmt = (v?: string) =>
  v ? new Date(v).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const Results = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const electionId = searchParams.get("electionId");

  const [election, setElection] = useState<any>(null);
  const [rounds, setRounds] = useState<ElectionRound[]>([]);
  const [activeRound, setActiveRound] = useState<ElectionRound | null>(null);
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [isWaitingForStart, setIsWaitingForStart] = useState(false);
  const [barReady, setBarReady] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalBallotsReceived, setTotalBallotsReceived] = useState<number | null>(null);
  const activeRoundRef = useRef<ElectionRound | null>(null);

  const isEffectivelyClosed = (status: string) =>
    ["CLOSED", "ENDED"].includes((status || "").toUpperCase());

  const loadElection = (showLoader = false) => {
    if (!electionId) return;
    if (showLoader) setLoading(true);
    Promise.all([
      electionApi.getById(electionId),
      electionApi.getElectionRounds(Number(electionId)),
    ])
      .then(([electionRes, roundsRes]) => {
        const electionData = electionRes.data;
        setElection(electionData);

        const sorted = [...roundsRes.data].sort(
          (a: ElectionRound, b: ElectionRound) => a.roundNumber - b.roundNumber
        );

        const openRound = sorted.find((r: ElectionRound) => r.status === "OPEN");
        const hasAnyClosedRound = sorted.some((r: ElectionRound) => isEffectivelyClosed(r.status));

        if (!openRound && !hasAnyClosedRound) {
          setIsWaitingForStart(true);
          setLoading(false);
          return;
        }

        setIsWaitingForStart(false);
        setRounds(sorted);

        // Ưu tiên vòng đang OPEN, nếu không có thì lấy vòng CLOSED gần nhất
        const preferred = openRound || [...sorted].reverse().find((r: ElectionRound) => isEffectivelyClosed(r.status));
        if (preferred && preferred.id !== activeRoundRef.current?.id) {
          setActiveRound(preferred);
          activeRoundRef.current = preferred;
        }

        setIsLive(!!openRound);
      })
      .catch((err) => {
        console.error("Lỗi tải kết quả:", err);
        if (showLoader)
          Swal.fire("Lỗi kết nối", "Không thể tải dữ liệu kết quả bầu cử.", "error");
      })
      .finally(() => { if (showLoader) setLoading(false); });
  };

  const loadCandidates = (round: ElectionRound) => {
    setCandidatesLoading(true);
    setBarReady(false);
    electionApi.getCandidatesByRound(round.id)
      .then((res) => {
        setCandidates([...res.data].sort((a: CandidateResult, b: CandidateResult) => b.voteCount - a.voteCount));
        setLastUpdated(new Date());
        setTimeout(() => setBarReady(true), 120);
      })
      .catch(() => {
        setCandidates([]);
        Swal.fire("Lỗi", "Không thể tải danh sách ứng viên. Vui lòng thử lại.", "error");
      })
      .finally(() => setCandidatesLoading(false));
  };

  useEffect(() => {
    loadElection(true);
  }, [electionId]);

  // Poll every 5s while a round is OPEN — chỉ lấy tổng phiếu đã nhận (không theo ứng viên)
  useEffect(() => {
    if (!isLive || !activeRound || !electionId) return;
    const fetchCount = () => {
      electionApi.countVotesByRound(Number(electionId), activeRound.id)
        .then((res) => {
          setTotalBallotsReceived(res.data.totalVotes ?? 0);
          setLastUpdated(new Date());
        })
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 5_000);
    return () => clearInterval(timer);
  }, [isLive, activeRound, electionId]);

  // Poll election state every 10s while waiting for round to start
  useEffect(() => {
    if (!isWaitingForStart || !electionId) return;
    const timer = setInterval(() => loadElection(false), 10_000);
    return () => clearInterval(timer);
  }, [isWaitingForStart, electionId]);

  // WebSocket realtime handler
  useEffect(() => {
    if (!electionId) return;
    const handleRealtime = (event: Event) => {
      const n = (event as CustomEvent).detail;
      if (!n?.electionId || String(n.electionId) !== String(electionId)) return;

      if (n.type === "VOTE_COUNT_UPDATE" && n.voteData) {
        setCandidates((prev) =>
          [...prev.map((c) => ({
            ...c,
            voteCount: n.voteData[String(c.id)] ?? n.voteData[c.id] ?? c.voteCount,
          }))].sort((a, b) => b.voteCount - a.voteCount)
        );
        setLastUpdated(new Date());
        return;
      }

      if (["ROUND_CLOSED", "ROUND_OPENED", "ELECTION_CLOSED"].includes(n.type)) {
        loadElection(false);
      }
    };
    window.addEventListener("election-realtime-notification", handleRealtime);
    return () => window.removeEventListener("election-realtime-notification", handleRealtime);
  }, [electionId]);

  useEffect(() => {
    if (!activeRound) return;
    activeRoundRef.current = activeRound;
    setTotalBallotsReceived(null);
    loadCandidates(activeRound);
  }, [activeRound?.id]);

  useEffect(() => {
    if (election?.title) document.title = `Kết quả: ${election.title} – Hệ thống bầu cử điện tử`;
    return () => { document.title = "Hệ thống bầu cử điện tử"; };
  }, [election?.title]);

  const totalVotes = candidates.reduce((s, c) => s + c.voteCount, 0);
  const maxVotes = candidates[0]?.voteCount ?? 0;
  const lastClosedRound = [...rounds].reverse().find((r) => r.status === "CLOSED");
  const isFinalRound = !!(activeRound && lastClosedRound && activeRound.id === lastClosedRound.id && isEffectivelyClosed(election?.status ?? ""));

  const hasNextRoundOpen = activeRound != null && rounds.some(
    (r) => r.roundNumber > activeRound.roundNumber && (r.status === "OPEN" || r.status === "UPCOMING")
  );
  const hideVoteCounts = isEffectivelyClosed(activeRound?.status ?? "") && !isFinalRound && hasNextRoundOpen;

  let thresholdVoteCount = -1;
  if (candidates.length > 0 && activeRound?.maxAdvanceCount > 0) {
    thresholdVoteCount = candidates[Math.min(activeRound.maxAdvanceCount - 1, candidates.length - 1)].voteCount;
  }

  if (!electionId)
    return (
      <div className="rs-state" role="alert">
        <span className="rs-state-icon">⚠️</span>
        <p>Không tìm thấy mã cuộc bầu cử hợp lệ.</p>
        <button className="rs-btn-back" onClick={() => navigate("/host-dashboard")}>Quay lại danh sách</button>
      </div>
    );

  if (loading)
    return (
      <div className="rs-state" role="status">
        <span className="rs-spinner" aria-hidden="true" />
        <p>Đang tải kết quả...</p>
      </div>
    );

  if (isWaitingForStart) {
    return (
      <div className="rs-state" role="status" aria-live="polite">
        <div className="rs-waiting-icon" aria-hidden="true">🗳️</div>
        <p>Cuộc bầu cử chưa bắt đầu</p>
        {election?.title && <strong className="rs-waiting-title">{election.title}</strong>}
        <p className="rs-waiting-sub">Kết quả sẽ hiển thị ngay khi vòng bầu cử bắt đầu.</p>
        <span className="rs-spinner" aria-hidden="true" />
      </div>
    );
  }

  // All winners in final round = top maxAdvanceCount candidates with votes
  const winners = isFinalRound
    ? candidates
        .slice(0, activeRound?.maxAdvanceCount > 0 ? activeRound.maxAdvanceCount : 1)
        .filter((c) => c.voteCount > 0)
    : [];
  const winner = winners[0] ?? null;

  return (
    <div className="rs-page rs-fade-in">

      {/* ── Page header ── */}
      <header className="rs-header">
        <div className="rs-header-inner">
          <button className="rs-back-btn" onClick={() => navigate("/host-dashboard")} aria-label="Quay lại danh sách cuộc bầu cử" />
          <div className="rs-header-text">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="rs-title">{election?.title}</h1>
              {isLive && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700,
                  padding: "3px 10px", borderRadius: 99, letterSpacing: 1,
                  animation: "rs-live-pulse 2s ease-in-out infinite"
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
                  LIVE
                </span>
              )}
            </div>
            {lastUpdated && (
              <p className="rs-subtitle" style={{ color: isLive ? "#10b981" : undefined }}>
                {isLive ? "🔄 Cập nhật lúc: " : "🕐 Cập nhật lúc: "}
                {lastUpdated.toLocaleTimeString("vi-VN")}
              </p>
            )}
          </div>
          {/* Stats row */}
          <div className="rs-header-stats">
            <div className="rs-stat-chip">
              <span className="rs-stat-val">
                {isLive && totalBallotsReceived !== null ? totalBallotsReceived.toLocaleString() : totalVotes.toLocaleString()}
              </span>
              <span className="rs-stat-lbl">{isLive ? "Phiếu đã nhận" : "Tổng phiếu"}</span>
            </div>
            <div className="rs-stat-chip">
              <span className="rs-stat-val">{candidates.length}</span>
              <span className="rs-stat-lbl">Ứng viên</span>
            </div>
            <div className="rs-stat-chip">
              <span className="rs-stat-val">{rounds.filter(r => r.status !== "CANCELLED").length}</span>
              <span className="rs-stat-lbl">Vòng bầu</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Winner banner (only final round) ── */}
      {winners.length > 0 && isFinalRound && (
        <section className="rs-winner-section rs-slide-down" aria-label="Người trúng cử">
          <div className="rs-winner-confetti" aria-hidden="true">
            {["🎊","✨","🎉","⭐","🎊","✨","🌟","🎉"].map((e, i) => (
              <span key={i} className="rs-confetti-piece" style={{"--i": i} as React.CSSProperties}>{e}</span>
            ))}
          </div>
          {winners.length === 1 ? (
            /* Single winner — big card */
            <div className="rs-winner-card">
              <div className="rs-winner-avatar-wrap">
                <div className="rs-winner-crown" aria-hidden="true">👑</div>
                <img
                  className="rs-winner-avatar"
                  src={winner!.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(winner!.name)}&background=f59e0b&color=fff&bold=true&size=160`}
                  alt={winner!.name}
                  width="120" height="120"
                />
                <div className="rs-winner-ring" aria-hidden="true" />
              </div>
              <div className="rs-winner-info">
                <p className="rs-winner-label">🏆 Trúng cử chung cuộc</p>
                <h2 className="rs-winner-name">{winner!.name}</h2>
                <p className="rs-winner-votes">
                  <strong>{winner!.voteCount.toLocaleString()}</strong> phiếu bầu
                  {totalVotes > 0 && (
                    <span className="rs-winner-pct-badge">
                      {((winner!.voteCount / totalVotes) * 100).toFixed(1)}%
                    </span>
                  )}
                </p>
                {winner!.description && <p className="rs-winner-desc">{winner!.description}</p>}
              </div>
            </div>
          ) : (
            /* Multiple winners — grid */
            <div style={{ width: "100%" }}>
              <p style={{ textAlign: "center", fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#92400e" }}>
                🏆 Danh sách trúng cử ({winners.length} người)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
                {winners.map((w, idx) => (
                  <div key={w.id} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: "#fffbeb", border: "2px solid #f59e0b", borderRadius: 14,
                    padding: "16px 20px", minWidth: 140, maxWidth: 180,
                  }}>
                    <div style={{ position: "relative" }}>
                      {idx === 0 && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 20 }}>👑</div>}
                      <img
                        src={w.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=f59e0b&color=fff&bold=true&size=96`}
                        alt={w.name} width="72" height="72"
                        style={{ borderRadius: "50%", border: "2px solid #f59e0b", marginTop: idx === 0 ? 8 : 0 }}
                      />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, textAlign: "center", color: "#1e293b" }}>{w.name}</span>
                    <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                      {w.voteCount.toLocaleString()} phiếu
                      {totalVotes > 0 && ` · ${((w.voteCount / totalVotes) * 100).toFixed(1)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="rs-body">

        {/* ── Round tabs ── */}
        {rounds.filter((r) => r.status !== "CANCELLED").length > 1 && (
          <nav className="rs-tabs-wrap" aria-label="Chọn vòng bầu cử">
            <div className="rs-tabs" role="tablist">
              {rounds.filter((r) => r.status !== "CANCELLED").map((round) => (
                <button
                  key={round.id}
                  role="tab"
                  aria-selected={activeRound?.id === round.id}
                  className={`rs-tab${activeRound?.id === round.id ? " rs-tab--active" : ""}`}
                  onClick={() => setActiveRound(round)}
                >
                  {round.title || `Vòng ${round.roundNumber}`}
                  {round.status === "OPEN" && (
                    <span style={{ marginLeft: 4, width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "rs-live-pulse 1.5s ease-in-out infinite" }} />
                  )}
                  {round.status === "CLOSED" && <span className="rs-tab-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* ── Round meta ── */}
        {activeRound && (
          <div className="rs-round-meta" aria-live="polite">
            <div className="rs-round-meta-left">
              <h2 className="rs-round-title">{activeRound.title || `Vòng ${activeRound.roundNumber}`}</h2>
              <p className="rs-round-time">
                <time dateTime={activeRound.startTime}>{fmt(activeRound.startTime)}</time>
                {" – "}
                <time dateTime={activeRound.endTime}>{fmt(activeRound.endTime)}</time>
              </p>
            </div>
            <div className="rs-round-meta-right">
              {activeRound.status === "OPEN" ? (
                <span className="rs-pill" style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}>🔴 Đang diễn ra</span>
              ) : isFinalRound ? (
                <span className="rs-pill rs-pill--gold">🏆 Vòng chung cuộc</span>
              ) : (
                <span className="rs-pill rs-pill--blue">Top {activeRound.maxAdvanceCount} đi tiếp</span>
              )}
              <span className="rs-pill rs-pill--gray">
                {isLive && totalBallotsReceived !== null
                  ? `${totalBallotsReceived.toLocaleString()} phiếu đã nhận`
                  : `${totalVotes.toLocaleString()} phiếu`}
              </span>
            </div>
          </div>
        )}

        {/* ── Charts ── */}
        {!candidatesLoading && candidates.length > 0 && !hideVoteCounts && (() => {
          const PIE_COLORS = ["#f59e0b","#3b82f6","#10b981","#8b5cf6","#ef4444","#06b6d4","#f97316","#6366f1","#84cc16","#ec4899"];
          const cx = 95, cy = 95, R = 78;
          // Pie slices
          let cumAngle = -Math.PI / 2;
          const slices = candidates.map((c, i) => {
            const pct = totalVotes > 0 ? c.voteCount / totalVotes : 0;
            const angle = pct * 2 * Math.PI;
            const start = cumAngle;
            cumAngle += angle;
            const x1 = cx + R * Math.cos(start);
            const y1 = cy + R * Math.sin(start);
            const x2 = cx + R * Math.cos(cumAngle);
            const y2 = cy + R * Math.sin(cumAngle);
            const lx = cx + (R * 0.65) * Math.cos(start + angle / 2);
            const ly = cy + (R * 0.65) * Math.sin(start + angle / 2);
            return { c, i, x1, y1, x2, y2, angle, pct, lx, ly, color: PIE_COLORS[i % PIE_COLORS.length] };
          });
          const barW = Math.max(candidates.length * 90, 320);
          return (
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px 24px", marginBottom: 20, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 16 }}>
                📊 Biểu đồ phiếu bầu {isLive && <span style={{ color: "#ef4444", fontWeight: 700 }}>• LIVE</span>}
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Pie chart */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textAlign: "center" }}>Tỷ lệ phiếu</div>
                  <svg width={190} height={190}>
                    {totalVotes === 0 ? (
                      <circle cx={cx} cy={cy} r={R} fill="#e2e8f0" />
                    ) : (
                      slices.map(({ c, x1, y1, x2, y2, angle, pct, lx, ly, color }) => (
                        <g key={c.id}>
                          <path
                            d={angle >= 2 * Math.PI - 0.001
                              ? `M ${cx} ${cy} m -${R} 0 a ${R} ${R} 0 1 1 ${R * 2} 0 a ${R} ${R} 0 1 1 -${R * 2} 0`
                              : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`}
                            fill={color}
                            stroke="#fff"
                            strokeWidth={1.5}
                            opacity={0.9}
                          />
                          {pct >= 0.07 && (
                            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="#fff">
                              {(pct * 100).toFixed(0)}%
                            </text>
                          )}
                        </g>
                      ))
                    )}
                    <circle cx={cx} cy={cy} r={28} fill="white" />
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#475569">{totalVotes}</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#94a3b8">phiếu</text>
                  </svg>
                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, maxWidth: 190 }}>
                    {candidates.map((c, i) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>
                          {c.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Số phiếu theo ứng viên</div>
                  <div style={{ overflowX: "auto" }}>
                    <svg width={barW} height={200} style={{ display: "block" }}>
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = 10 + (1 - ratio) * 150;
                        const val = Math.round(ratio * maxVotes);
                        return (
                          <g key={ratio}>
                            <line x1={36} y1={y} x2={barW - 10} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={ratio === 0 ? "0" : "4 3"} />
                            <text x={32} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{val}</text>
                          </g>
                        );
                      })}
                      {candidates.map((c, i) => {
                        const bw = 52, gap = 90;
                        const x = 40 + i * gap + (gap - bw) / 2;
                        const pct = maxVotes > 0 ? c.voteCount / maxVotes : 0;
                        const bh = Math.max(pct * 150, pct > 0 ? 4 : 0);
                        const y = 160 - bh;
                        const isTop = i < (isFinalRound ? (activeRound?.maxAdvanceCount || 1) : 1) && c.voteCount > 0;
                        const fill = isTop
                          ? (isFinalRound ? "#f59e0b" : "#10b981")
                          : activeRound?.status === "OPEN" ? "#3b82f6" : "#94a3b8";
                        return (
                          <g key={c.id}>
                            <rect x={x} y={y} width={bw} height={bh} rx={6} ry={6} fill={fill} opacity={0.88}
                              style={{ transition: "y 0.5s ease, height 0.5s ease" }} />
                            {c.voteCount > 0 && (
                              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={fill}>{c.voteCount}</text>
                            )}
                            <text x={x + bw / 2} y={178} textAnchor="middle" fontSize={11} fill="#475569"
                              style={{ fontWeight: isTop ? 700 : 400 }}>
                              {c.name.length > 8 ? c.name.slice(0, 7) + "…" : c.name}
                            </text>
                            <text x={x + bw / 2} y={192} textAnchor="middle" fontSize={10} fill="#94a3b8">
                              {totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) + "%" : "0%"}
                            </text>
                          </g>
                        );
                      })}
                      <line x1={36} y1={160} x2={barW - 10} y2={160} stroke="#cbd5e1" strokeWidth={1.5} />
                    </svg>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Candidates ── */}
        <main aria-label={`Kết quả ${activeRound?.title || ""}`}>
          {candidatesLoading ? (
            <div className="rs-skeleton-list">
              {[1,2,3].map(n => <div key={n} className="rs-skeleton-item" />)}
            </div>
          ) : candidates.length === 0 ? (
            <p className="rs-empty">Chưa có dữ liệu ứng viên cho vòng này.</p>
          ) : (
            <ol className="rs-candidates" aria-label="Danh sách ứng viên theo thứ hạng">
              {candidates.map((c, i) => {
                const pct = totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0;
                const isWinner = activeRound?.status === "CLOSED"
                  ? c.voteCount > 0 && c.voteCount >= thresholdVoteCount
                  : false;
                const isChampion = isFinalRound && isWinner;
                const qualified = hideVoteCounts && i < (activeRound?.maxAdvanceCount ?? 0);
                const isOpenRound = activeRound?.status === "OPEN";

                return (
                  <li
                    key={c.id}
                    className={`rs-candidate rs-slide-up${isChampion ? " rs-candidate--champion" : isWinner ? " rs-candidate--qualified" : ""}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* Rank */}
                    <span className={`rs-rank rs-rank--${Math.min(i + 1, 4)}`} aria-label={`Hạng ${i + 1}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>

                    {/* Avatar */}
                    <div className="rs-avatar-wrap">
                      <img
                        className="rs-candidate-avatar"
                        src={c.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=e2e8f0&color=475569&bold=true&size=96`}
                        alt={c.name}
                        width="64" height="64"
                        loading="lazy"
                      />
                      {isChampion && <div className="rs-avatar-glow rs-avatar-glow--gold" />}
                      {isWinner && !isChampion && <div className="rs-avatar-glow rs-avatar-glow--green" />}
                    </div>

                    {/* Info + bar */}
                    <div className="rs-candidate-body">
                      <div className="rs-candidate-row">
                        <h3 className="rs-candidate-name">{c.name}</h3>
                        <div className="rs-candidate-stats">
                          {hideVoteCounts ? (
                            <span className="rs-pct-badge" style={{ background: "#f1f5f9", color: "#94a3b8" }}>Chưa công bố</span>
                          ) : (
                            <>
                              <span className="rs-votes">{c.voteCount.toLocaleString()} phiếu</span>
                              <span className="rs-pct-badge">{pct.toFixed(1)}%</span>
                            </>
                          )}
                        </div>
                      </div>
                      {!hideVoteCounts && (
                        <div
                          className="rs-bar-track"
                          role="meter"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${c.name} ${pct.toFixed(1)}%`}
                        >
                          <div
                            className={`rs-bar-fill${isChampion ? " rs-bar-fill--gold" : isWinner ? " rs-bar-fill--green" : isOpenRound ? " rs-bar-fill--live" : ""}`}
                            style={{ width: barReady ? `${pct}%` : "0%", transition: "width 0.6s ease" }}
                          />
                        </div>
                      )}
                      {!isOpenRound && activeRound?.status === "CLOSED" && (
                        <p className="rs-candidate-status">
                          {hideVoteCounts
                            ? (qualified ? "✅ Vào vòng tiếp theo" : "❌ Bị loại")
                            : (isChampion ? "🏆 Trúng cử" : isWinner ? "✅ Vào vòng tiếp" : "❌ Bị loại")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </main>
      </div>

      <footer className="rs-footer">
        <button className="rs-btn-back" onClick={() => navigate("/host-dashboard")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Quay lại danh sách
        </button>
      </footer>
    </div>
  );
};

export default Results;
