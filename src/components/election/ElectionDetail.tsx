import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import { useAuth } from "../../context/AuthContext";
import "./election-detail.css";
import Swal from "sweetalert2";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?q=80&w=2070";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/147/147144.png";

interface Candidate { id: number; name: string; description: string; imageUrl: string; voteCount?: number; }
interface Election  { id: number; title: string; description: string; image: string; status: string; startDate: string; endDate: string; totalRounds?: number; candidates: Candidate[]; }
interface RoundStat { roundNumber: number; title: string; invited: number; verified: number; voted: number; }
interface Round { id: number; roundNumber: number; title: string; status: string; maxAdvanceCount: number; startTime: string; endTime: string; }

const fmt = (v?: string) => v ? new Date(v).toLocaleString("vi-VN") : "—";

const StatCard: React.FC<{ label: string; value: number | string; icon: string; color: string; sub?: string }> = ({ label, value, icon, color, sub }) => (
  <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
    <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const ProgressBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
};

const ElectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOrganizer = user?.roles?.some((r: any) => ["ROLE_ORGANIZER", "ROLE_ADMIN"].includes(typeof r === "string" ? r : r.name));
  const [election, setElection] = useState<Election | null>(null);
  const [winner, setWinner] = useState<Candidate | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundCandidates, setRoundCandidates] = useState<Map<number, Candidate[]>>(new Map());
  const [activeTab, setActiveTab] = useState<"overview" | "stats" | "candidates" | "participants" | "control">("overview");
  const [roundActionLoading, setRoundActionLoading] = useState<number | null>(null);
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitePage, setInvitePage] = useState(1);
  const [filterRound, setFilterRound] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "voted" | "not_voted" | "not_verified">("all");
  const [importingFile, setImportingFile] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const INVITE_PAGE_SIZE = 10;

  const handleImportParticipants = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    e.target.value = "";
    setImportingFile(true);
    try {
      await electionApi.importParticipants(id, file);
      const inv = await electionApi.getParticipantInvites(id).catch(() => ({ data: [] }));
      setInvites(inv.data || []);
      Swal.fire({ icon: "success", title: "Import thành công!", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Import thất bại", text: err.response?.data?.message || err.message || "Lỗi không xác định", toast: true, position: "top-end", timer: 3500, showConfirmButton: false });
    } finally {
      setImportingFile(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await electionApi.getById(id);
        const data = res.data;
        setElection(data);

        if (["CLOSED", "ENDED"].includes(data.status?.toUpperCase())) {
          try {
            const r = await electionApi.getResults(id);
            setElection({ ...data, candidates: r.data });
            if (r.data.length > 0) setWinner(r.data[0]);
          } catch (e) {
            console.warn("Could not load results:", e);
          }
        }

        const [db, inv, roundsRes] = await Promise.all([
          electionApi.getParticipantDashboard(id).catch(() => ({ data: null })),
          electionApi.getParticipantInvites(id).catch(() => ({ data: [] })),
          electionApi.getElectionRounds(Number(id)).catch(() => ({ data: [] })),
        ]);
        setDashboard(db.data);
        setInvites(inv.data || []);

        const roundList: Round[] = (roundsRes.data || []).sort((a: Round, b: Round) => a.roundNumber - b.roundNumber);
        setRounds(roundList);

        // Load candidates per round
        const cMap = new Map<number, Candidate[]>();
        await Promise.all(
          roundList.map(async (r: Round) => {
            const cr = await electionApi.getCandidatesByRound(r.id).catch(() => ({ data: [] }));
            cMap.set(r.id, (cr.data || []).sort((a: Candidate, b: Candidate) => (b.voteCount ?? 0) - (a.voteCount ?? 0)));
          })
        );
        setRoundCandidates(new Map(cMap));
      } catch (e) { console.error(e); }
    };
    load();

    // Auto-refresh every 15s while election is open
    pollRef.current = setInterval(load, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  // Stop polling once election is no longer OPEN
  useEffect(() => {
    if (election && election.status !== "OPEN") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [election?.status]);

  const reloadRounds = async () => {
    if (!id) return;
    // Reload election status + rounds together
    const [electionRes, roundsRes] = await Promise.all([
      electionApi.getById(id).catch(() => null),
      electionApi.getElectionRounds(Number(id)).catch(() => ({ data: [] })),
    ]);
    if (electionRes?.data) setElection(electionRes.data);
    const roundList: Round[] = (roundsRes.data || []).sort((a: Round, b: Round) => a.roundNumber - b.roundNumber);
    setRounds(roundList);
    const cMap = new Map<number, Candidate[]>();
    await Promise.all(roundList.map(async (r: Round) => {
      const cr = await electionApi.getCandidatesByRound(r.id).catch(() => ({ data: [] }));
      cMap.set(r.id, (cr.data || []).sort((a: Candidate, b: Candidate) => (b.voteCount ?? 0) - (a.voteCount ?? 0)));
    }));
    setRoundCandidates(new Map(cMap));
  };

  const handleRoundAction = async (roundId: number, action: "start" | "close" | "advance", label: string) => {
    if (election?.status === "CLOSED") {
      Swal.fire({ icon: "warning", title: "Cuộc bầu cử đã kết thúc", text: "Không thể thực hiện thao tác này vì cuộc bầu cử đã kết thúc.", toast: true, position: "top-end", timer: 3000, showConfirmButton: false });
      return;
    }
    const confirmed = await Swal.fire({
      title: `Xác nhận ${label}?`,
      text: `Bạn có chắc chắn muốn "${label}" vòng này không?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: action === "close" ? "#ef4444" : "#3b82f6",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });
    if (!confirmed.isConfirmed) return;
    setRoundActionLoading(roundId);
    try {
      if (action === "start")   await electionApi.startRound(roundId);
      if (action === "close")   await electionApi.closeRound(roundId);
      if (action === "advance") await electionApi.advanceRound(roundId);
      await reloadRounds();
      Swal.fire({ icon: "success", title: `${label} thành công!`, timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Thất bại", text: err.response?.data?.message || err.response?.data || err.message || "Lỗi không xác định", toast: true, position: "top-end", timer: 3500, showConfirmButton: false });
    } finally {
      setRoundActionLoading(null);
    }
  };

  const resendInvite = async (inviteId: number) => {
    if (!id) return;
    try {
      await electionApi.resendParticipantInvite(id, inviteId);
      const inv = await electionApi.getParticipantInvites(id).catch(() => ({ data: [] }));
      setInvites(inv.data || []);
      Swal.fire({ icon: "success", title: "Đã gửi!", text: "Email/QR đã được gửi lại cho cử tri.", timer: 2000, showConfirmButton: false, toast: true, position: "top-end" });
    } catch {
      Swal.fire({ icon: "error", title: "Thất bại", text: "Không thể gửi lại email/QR.", toast: true, position: "top-end", timer: 2500, showConfirmButton: false });
    }
  };

  const [bulkResending, setBulkResending] = useState(false);
  const resendAllNotVoted = async () => {
    if (!id) return;
    const confirm = await Swal.fire({
      title: "Gửi lại QR hàng loạt?",
      text: "Hệ thống sẽ gửi email cho tất cả cử tri chưa bỏ phiếu trong các vòng đang diễn ra.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Gửi ngay",
      cancelButtonText: "Hủy",
    });
    if (!confirm.isConfirmed) return;
    setBulkResending(true);
    Swal.fire({ title: "Đang gửi...", text: "Vui lòng chờ trong giây lát.", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await electionApi.resendAllNotVoted(id);
      Swal.fire({
        icon: "success",
        title: "Gửi thành công!",
        html: `<b>${res.data.sent}</b> email đã được gửi.<br/><span style="color:#94a3b8;font-size:13px">Bỏ qua ${res.data.skipped} (đã bỏ phiếu hoặc vòng đã kết thúc)</span>`,
        confirmButtonColor: "#f59e0b",
      });
    } catch {
      Swal.fire({ icon: "error", title: "Lỗi", text: "Không thể gửi hàng loạt. Vui lòng thử lại.", confirmButtonColor: "#ef4444" });
    } finally {
      setBulkResending(false);
    }
  };

  if (!election) return (
    <div className="loading-container"><div className="loader" /><p>Đang tải dữ liệu...</p></div>
  );

  const renderStatus = (s: string) => {
    const u = s?.toUpperCase();
    if (u === "OPEN")     return <span className="status-badge st-open">Đang diễn ra</span>;
    if (u === "UPCOMING") return <span className="status-badge st-upcoming">Sắp diễn ra</span>;
    return <span className="status-badge st-closed">Đã kết thúc</span>;
  };

  // ── Tính thống kê từ invites ──
  const roundMap = new Map<number, RoundStat>();
  invites.forEach(inv => {
    const rn = inv.roundNumber;
    if (!roundMap.has(rn)) roundMap.set(rn, { roundNumber: rn, title: inv.roundTitle || `Vòng ${rn}`, invited: 0, verified: 0, voted: 0 });
    const r = roundMap.get(rn)!;
    r.invited++;
    if (inv.verifiedAt || inv.status === "VERIFIED" || inv.status === "USED") r.verified++;
    if (inv.voted) r.voted++;
  });
  const roundStats = Array.from(roundMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);

  const totalInvited  = dashboard?.totalInvited  ?? invites.length;
  const totalVerified = dashboard?.totalVerified ?? invites.filter((i: any) => i.verifiedAt || i.status === "VERIFIED" || i.status === "USED").length;
  const totalVoted    = dashboard?.totalVoted    ?? invites.filter((i: any) => i.voted).length;
  const totalCandidates = election.candidates?.length ?? 0;
  const maxVote = Math.max(...(election.candidates?.map(c => c.voteCount ?? 0) ?? [1]), 1);

  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "10px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
    border: "none", background: active ? "#6366f1" : "#f1f5f9", color: active ? "#fff" : "#64748b", transition: "all 0.2s"
  });

  return (
    <div className="election-detail-container">
      <div className="detail-max-width">

        {/* Navigation */}
        <div className="detail-navigation">
          <button className="btn-back-link" onClick={() => navigate(-1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Quay lại danh sách
          </button>
        </div>

        {/* Hero banner */}
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <div style={{ position: "relative", height: 220 }}>
            <img src={election.image || DEFAULT_BANNER} alt="Banner" style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).src = DEFAULT_BANNER; }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6))" }} />
            <div style={{ position: "absolute", bottom: 24, left: 28, right: 28 }}>
              <div style={{ marginBottom: 8 }}>{renderStatus(election.status)}</div>
              <h1 style={{ margin: 0, color: "#fff", fontSize: 26, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{election.title}</h1>
            </div>
          </div>
          <div style={{ padding: "16px 28px 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 24 }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>🗓 Bắt đầu: <strong>{fmt(election.startDate)}</strong></span>
              <span style={{ fontSize: 13, color: "#64748b" }}>🏁 Kết thúc: <strong>{fmt(election.endDate)}</strong></span>
              <span style={{ fontSize: 13, color: "#64748b" }}>🔄 Số vòng: <strong>{election.totalRounds ?? roundStats.length}</strong></span>
            </div>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 8 }}>
              <button style={TAB_STYLE(activeTab === "overview")}     onClick={() => setActiveTab("overview")}>Tổng quan</button>
              <button style={TAB_STYLE(activeTab === "stats")}        onClick={() => setActiveTab("stats")}>Thống kê</button>
              <button style={TAB_STYLE(activeTab === "candidates")}   onClick={() => setActiveTab("candidates")}>Ứng viên</button>
              <button style={TAB_STYLE(activeTab === "participants")} onClick={() => { setActiveTab("participants"); setInviteSearch(""); setInvitePage(1); setFilterRound("all"); setFilterStatus("all"); }}>Người tham gia</button>
              {isOrganizer && (
                <button style={TAB_STYLE(activeTab === "control")} onClick={() => setActiveTab("control")}>⚙️ Điều khiển</button>
              )}
            </div>
          </div>
        </div>

        {/* ── TAB: TỔNG QUAN ── */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Tổng thể */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
              <StatCard label="Tổng số lời mời" value={totalInvited}    icon="✉️" color="#6366f1" />
              <StatCard label="Tổng số đã xác thực CCCD "     value={totalVerified}   icon="✅" color="#10b981"
                sub={totalInvited > 0 ? `${Math.round(totalVerified/totalInvited*100)}% tham gia` : undefined} />
              <StatCard label="Tổng phiếu"          value={totalVoted}      icon="🗳️" color="#f59e0b"
                sub={totalVerified > 0 ? `${Math.round(totalVoted/totalVerified*100)}% trong số đã xác thực` : undefined} />
              <StatCard label="Số vòng bầu cử"       value={rounds.length || (election.totalRounds ?? roundStats.length)} icon="🔄" color="#8b5cf6" />
            </div>

            {/* Chi tiết từng vòng */}
            {roundStats.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {roundStats.map(r => {
                  const roundObj = rounds.find(rd => rd.roundNumber === r.roundNumber);
                  const rCands = roundObj ? (roundCandidates.get(roundObj.id) ?? []) : [];
                  const roundStatus = roundObj?.status ?? "";
                  const statusColor = roundStatus === "OPEN" ? "#10b981" : roundStatus === "CLOSED" ? "#6366f1" : "#94a3b8";
                  const statusLabel = roundStatus === "OPEN" ? "Đang diễn ra" : roundStatus === "CLOSED" ? "Đã kết thúc" : roundStatus === "UPCOMING" ? "Chưa bắt đầu" : roundStatus;
                  return (
                    <div key={r.roundNumber} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{r.title}</h3>
                        {statusLabel && (
                          <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 99, background: statusColor + "18", color: statusColor }}>
                            {statusLabel}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                        <StatCard label="Cử tri được mời"   value={r.invited}       icon="✉️" color="#6366f1" />
                        <StatCard label="Đã xác thực CCCD"  value={r.verified}      icon="✅" color="#10b981"
                          sub={r.invited > 0 ? `${Math.round(r.verified/r.invited*100)}%` : undefined} />
                        <StatCard label="Đã bỏ phiếu"       value={r.voted}         icon="🗳️" color="#f59e0b"
                          sub={r.invited > 0 ? `${Math.round(r.voted/r.invited*100)}%` : undefined} />
                        <StatCard label="Ứng viên"           value={rCands.length || "—"} icon="👤" color="#ec4899" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: THỐNG KÊ ── */}
        {activeTab === "stats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Winner banner */}
            {winner && (
              <div style={{ background: "linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)", borderRadius: 16, padding: 24, border: "2px solid #fbbf24", display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: 48 }}>🏆</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                  <img src={winner.imageUrl || DEFAULT_AVATAR} alt={winner.name}
                    style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid #f59e0b", flexShrink: 0 }}
                    onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 1 }}>Người chiến thắng</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#78350f", marginTop: 2 }}>{winner.name}</div>
                    <div style={{ fontSize: 14, color: "#92400e", marginTop: 4 }}>🗳️ {winner.voteCount?.toLocaleString()} phiếu bầu</div>
                  </div>
                </div>
              </div>
            )}

            {/* Thống kê tổng */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>📊 Tỷ lệ tham gia tổng thể</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Tỷ lệ xác thực", value: totalVerified, max: totalInvited, color: "#10b981", desc: `${totalVerified} / ${totalInvited} cử tri` },
                  { label: "Tỷ lệ bỏ phiếu / đã xác thực", value: totalVoted, max: totalVerified, color: "#6366f1", desc: `${totalVoted} / ${totalVerified} cử tri` },
                  { label: "Tỷ lệ bỏ phiếu / tổng mời",   value: totalVoted, max: totalInvited,  color: "#f59e0b", desc: `${totalVoted} / ${totalInvited} cử tri` },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{row.label}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{row.desc}</span>
                    </div>
                    <ProgressBar value={row.value} max={row.max} color={row.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Thống kê từng vòng */}
            {roundStats.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>🔄 Chi tiết từng vòng bầu cử</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Vòng", "Cử tri mời", "Đã xác thực", "Tỷ lệ xác thực", "Đã bỏ phiếu", "Tỷ lệ bỏ phiếu", "Ứng viên"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roundStats.map(r => {
                        const roundObj = rounds.find(rd => rd.roundNumber === r.roundNumber);
                        const rCands = roundObj ? (roundCandidates.get(roundObj.id) ?? []) : [];
                        return (
                          <tr key={r.roundNumber} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "14px 16px", fontWeight: 700, color: "#334155" }}>
                              <span style={{ background: "#6366f118", color: "#6366f1", padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{r.title}</span>
                            </td>
                            <td style={{ padding: "14px 16px", color: "#475569" }}>{r.invited}</td>
                            <td style={{ padding: "14px 16px", color: "#10b981", fontWeight: 600 }}>{r.verified}</td>
                            <td style={{ padding: "14px 16px", minWidth: 140 }}><ProgressBar value={r.verified} max={r.invited} color="#10b981" /></td>
                            <td style={{ padding: "14px 16px", color: "#6366f1", fontWeight: 600 }}>{r.voted}</td>
                            <td style={{ padding: "14px 16px", minWidth: 140 }}><ProgressBar value={r.voted} max={r.invited} color="#6366f1" /></td>
                            <td style={{ padding: "14px 16px", color: "#ec4899", fontWeight: 600 }}>{rCands.length || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kết quả phiếu từng vòng */}
            {rounds.filter(r => r.status === "CLOSED").map(r => {
              const rCands = roundCandidates.get(r.id) ?? [];
              if (rCands.length === 0) return null;
              const maxV = rCands[0]?.voteCount ?? 1;
              const roundWinner = rCands[0];
              return (
                <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                      🗳️ Kết quả {r.title || `Vòng ${r.roundNumber}`}
                    </h3>
                    {roundWinner && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef9c3", borderRadius: 10, padding: "6px 14px", border: "1px solid #fbbf24" }}>
                        <img src={roundWinner.imageUrl || DEFAULT_AVATAR} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                          onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>🏆 {roundWinner.name}</span>
                        <span style={{ fontSize: 12, color: "#92400e" }}>{roundWinner.voteCount} phiếu</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {rCands.map((c, i) => (
                      <div key={c.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {i === 0 && <span style={{ fontSize: 16 }}>🥇</span>}
                            {i === 1 && <span style={{ fontSize: 16 }}>🥈</span>}
                            {i === 2 && <span style={{ fontSize: 16 }}>🥉</span>}
                            {i > 2  && <span style={{ width: 24, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>{i+1}</span>}
                            <img src={c.imageUrl || DEFAULT_AVATAR} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                              onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                            <span style={{ fontWeight: 600, color: "#334155", fontSize: 13 }}>{c.name}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: "#6366f1", fontSize: 14 }}>{(c.voteCount ?? 0).toLocaleString()} phiếu</span>
                        </div>
                        <ProgressBar value={c.voteCount ?? 0} max={maxV} color={i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "#6366f1"} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: ỨNG VIÊN ── */}
        {activeTab === "candidates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {rounds.length > 0 ? rounds.map(r => {
              const rCands = roundCandidates.get(r.id) ?? [];
              const roundStatusColor = r.status === "OPEN" ? "#10b981" : r.status === "CLOSED" ? "#6366f1" : "#94a3b8";
              const roundStatusLabel = r.status === "OPEN" ? "Đang diễn ra" : r.status === "CLOSED" ? "Đã kết thúc" : r.status === "UPCOMING" ? "Chưa bắt đầu" : r.status;
              const isClosed = ["CLOSED", "ENDED"].includes(r.status?.toUpperCase());
              const maxVote = Math.max(...rCands.map(c => c.voteCount ?? 0), 1);
              return (
                <div key={r.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {/* Header vòng */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{r.title || `Vòng ${r.roundNumber}`}</h3>
                      <span style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "block" }}>
                        {new Date(r.startTime).toLocaleString("vi-VN")} — {new Date(r.endTime).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 14px", borderRadius: 99, background: roundStatusColor + "18", color: roundStatusColor, border: `1px solid ${roundStatusColor}40` }}>
                        {roundStatusLabel}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{rCands.length} ứng viên</span>
                    </div>
                  </div>

                  {/* Danh sách ứng viên */}
                  {rCands.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Chưa có ứng viên trong vòng này.</div>
                  ) : (
                    <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
                      {rCands.map((c, i) => (
                        <div key={c.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          {/* Ảnh */}
                          <div style={{ position: "relative", height: 160, background: "linear-gradient(135deg,#e0e7ff,#f0fdf4)" }}>
                            <img
                              src={c.imageUrl || DEFAULT_AVATAR}
                              alt={c.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
                              onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                            />
                            {isClosed && (
                              <div style={{ position: "absolute", top: 8, left: 8, background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "#6366f1cc", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
                                {i === 0 ? "🥇 #1" : i === 1 ? "🥈 #2" : i === 2 ? "🥉 #3" : `#${i + 1}`}
                              </div>
                            )}
                          </div>
                          {/* Thông tin */}
                          <div style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>ID #{c.id}</div>
                            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 12px", lineHeight: 1.5, minHeight: 38 }}>
                              {c.description || "Chưa có mô tả."}
                            </p>
                            {isClosed && (
                              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <span style={{ fontSize: 12, color: "#64748b" }}>Số phiếu bầu</span>
                                  <span style={{ fontSize: 16, fontWeight: 800, color: "#6366f1" }}>{(c.voteCount ?? 0).toLocaleString()}</span>
                                </div>
                                <ProgressBar value={c.voteCount ?? 0} max={maxVote} color={i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "#6366f1"} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="candidate-modern-grid">
                {election.candidates?.map((c: Candidate) => (
                  <div className="candidate-profile-card" key={c.id}>
                    <div className="profile-card-header">
                      <div className="candidate-avatar-frame">
                        <img src={c.imageUrl || DEFAULT_AVATAR} alt={c.name}
                          onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                      </div>
                      <div className="candidate-meta-name">
                        <h4>{c.name}</h4>
                        <span className="candidate-id-tag">ID: #{c.id}</span>
                      </div>
                    </div>
                    <div className="profile-card-body">
                      <p>{c.description || "Chưa có mô tả."}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: NGƯỜI THAM GIA ── */}
        {activeTab === "participants" && (() => {
          // Tính thống kê + gộp rows
          const rMap = new Map<number, { title: string; invited: number; verified: number; voted: number }>();
          invites.forEach((inv: any) => {
            const rn = inv.roundNumber;
            if (!rMap.has(rn)) rMap.set(rn, { title: inv.roundTitle || `Vòng ${rn}`, invited: 0, verified: 0, voted: 0 });
            const r = rMap.get(rn)!;
            r.invited++;
            if (inv.verifiedAt || inv.status === "VERIFIED" || inv.status === "USED") r.verified++;
            if (inv.voted) r.voted++;
          });
          const allRoundNumbers = Array.from(rMap.keys()).sort((a, b) => a - b);

          type MergedRow = {
            key: string; email: string; fullName: string;
            rounds: { roundNumber: number; roundTitle: string; verified: boolean; voted: boolean; status: string; id: number }[];
            anyVerified: boolean; anyVoted: boolean; latestStatus: string; singleInviteId: number;
          };
          const rank: Record<string, number> = { USED: 3, VERIFIED: 2, ACTIVE: 1, EXPIRED: 0 };

          // Gộp invites theo email (không phân biệt filterRound ở đây — lọc sau)
          const byEmail = new Map<string, MergedRow>();
          invites.forEach((inv: any) => {
            const key = inv.email.toLowerCase();
            if (!byEmail.has(key)) byEmail.set(key, { key, email: inv.email, fullName: inv.fullName, rounds: [], anyVerified: false, anyVoted: false, latestStatus: inv.status, singleInviteId: inv.id });
            const row = byEmail.get(key)!;
            const verified = !!(inv.verifiedAt || inv.status === "VERIFIED" || inv.status === "USED");
            row.rounds.push({ roundNumber: inv.roundNumber, roundTitle: inv.roundTitle || `Vòng ${inv.roundNumber}`, verified, voted: inv.voted, status: inv.status, id: inv.id });
            if (verified) row.anyVerified = true;
            if (inv.voted) row.anyVoted = true;
            if ((rank[inv.status] ?? 0) > (rank[row.latestStatus] ?? 0)) row.latestStatus = inv.status;
          });
          let displayRows: MergedRow[] = Array.from(byEmail.values());

          // Lọc theo vòng
          if (filterRound !== "all") {
            displayRows = displayRows.filter(row => row.rounds.some(r => r.roundNumber === filterRound));
          }

          // Lọc theo trạng thái
          if (filterStatus === "voted") {
            if (filterRound === "all") {
              displayRows = displayRows.filter(row => row.anyVoted);
            } else {
              displayRows = displayRows.filter(row => row.rounds.some(r => r.roundNumber === filterRound && r.voted));
            }
          } else if (filterStatus === "not_voted") {
            if (filterRound === "all") {
              displayRows = displayRows.filter(row => !row.anyVoted);
            } else {
              displayRows = displayRows.filter(row => row.rounds.some(r => r.roundNumber === filterRound && !r.voted));
            }
          } else if (filterStatus === "not_verified") {
            if (filterRound === "all") {
              displayRows = displayRows.filter(row => !row.anyVerified);
            } else {
              displayRows = displayRows.filter(row => row.rounds.some(r => r.roundNumber === filterRound && !r.verified));
            }
          }

          const filtered = displayRows.filter(row => !inviteSearch || row.email.toLowerCase().includes(inviteSearch.toLowerCase()) || row.fullName.toLowerCase().includes(inviteSearch.toLowerCase()));
          const totalPages = Math.max(1, Math.ceil(filtered.length / INVITE_PAGE_SIZE));
          const safePage = Math.min(invitePage, totalPages);
          const paged = filtered.slice((safePage - 1) * INVITE_PAGE_SIZE, safePage * INVITE_PAGE_SIZE);

          const statusLabel: Record<string, string> = { ACTIVE: "Còn hạn", VERIFIED: "Đã xác thực", USED: "Đã dùng", EXPIRED: "Hết hạn" };
          const statusColor: Record<string, string> = { ACTIVE: "#3b82f6", VERIFIED: "#10b981", USED: "#6366f1", EXPIRED: "#94a3b8" };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Thống kê tổng */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <StatCard label="Tổng số lời mời"        value={totalInvited}              icon="✉️" color="#6366f1" />
                <StatCard label="Đã xác thực CCCD"   value={totalVerified}             icon="✅" color="#10b981" />
                <StatCard label="Đã bỏ phiếu"        value={totalVoted}                icon="🗳️" color="#f59e0b" />
                <StatCard label="Chưa bỏ phiếu"      value={totalInvited - totalVoted} icon="⏳" color="#94a3b8" />
              </div>

              {/* Bảng danh sách */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20 }}>
                {/* Thanh lọc */}
                <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 12px" }}>
                    <span>🔍</span>
                    <input
                      type="text"
                      placeholder="Tìm theo email hoặc họ tên..."
                      value={inviteSearch}
                      onChange={e => { setInviteSearch(e.target.value); setInvitePage(1); }}
                      style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, flex: 1 }}
                    />
                    {inviteSearch && <button onClick={() => { setInviteSearch(""); setInvitePage(1); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>×</button>}
                  </div>
                  <select value={filterRound} onChange={e => { setFilterRound(e.target.value === "all" ? "all" : Number(e.target.value)); setInvitePage(1); }}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
                    <option value="all">Tất cả vòng</option>
                    {allRoundNumbers.map(rn => <option key={rn} value={rn}>{rMap.get(rn)?.title ?? `Vòng ${rn}`}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setInvitePage(1); }}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="voted">✅ Đã bỏ phiếu</option>
                    <option value="not_voted">⏳ Chưa bỏ phiếu</option>
                    <option value="not_verified">❌ Chưa xác thực CCCD</option>
                  </select>
                  <button
                    onClick={resendAllNotVoted}
                    disabled={bulkResending}
                    style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #f59e0b", background: bulkResending ? "#fef9c3" : "#fffbeb", color: "#b45309", fontSize: 13, fontWeight: 600, cursor: bulkResending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                  >
                    {bulkResending ? "⏳ Đang gửi..." : "📨 Gửi lại tất cả chưa bỏ phiếu"}
                  </button>
                  <span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>{filtered.length} người · trang {safePage}/{totalPages}</span>
                </div>

                {/* Bảng */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["STT", "Họ tên", "Email", "Tham gia vòng", "Xác thực CCCD", "Đã bỏ phiếu", "Trạng thái", "Thao tác"].map(h => (
                          <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((row, idx) => (
                        <tr key={row.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{(safePage - 1) * INVITE_PAGE_SIZE + idx + 1}</td>
                          <td style={{ padding: "12px 14px", fontWeight: 600, color: "#334155" }}>{row.fullName}</td>
                          <td style={{ padding: "12px 14px", color: "#475569" }}>{row.email}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {row.rounds.sort((a, b) => a.roundNumber - b.roundNumber).map(r => (
                                <span key={r.roundNumber} title={`${r.roundTitle} · ${r.verified ? "✓ Đã xác thực" : "✗ Chưa xác thực"} · ${r.voted ? "✓ Đã bỏ phiếu" : "✗ Chưa bỏ phiếu"}`}
                                  style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, fontWeight: 700, background: r.voted ? "#dbeafe" : r.verified ? "#dcfce7" : "#f1f5f9", color: r.voted ? "#1d4ed8" : r.verified ? "#15803d" : "#64748b", border: `1px solid ${r.voted ? "#93c5fd" : r.verified ? "#86efac" : "#e2e8f0"}`, cursor: "default" }}>
                                  V{r.roundNumber}{r.voted ? " 🗳" : r.verified ? " ✓" : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            {row.anyVerified ? <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Đã xác thực</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            {row.anyVoted ? <span style={{ color: "#2563eb", fontWeight: 600 }}>✓ Đã bỏ</span> : <span style={{ color: "#f59e0b" }}>Chưa</span>}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, fontWeight: 600, background: statusColor[row.latestStatus] + "18", color: statusColor[row.latestStatus] }}>
                              {statusLabel[row.latestStatus] ?? row.latestStatus}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <button
                              disabled={row.latestStatus === "USED" || row.latestStatus === "EXPIRED"}
                              onClick={() => resendInvite(row.singleInviteId)}
                              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: row.latestStatus === "USED" || row.latestStatus === "EXPIRED" ? "#f1f5f9" : "#fff", color: row.latestStatus === "USED" || row.latestStatus === "EXPIRED" ? "#94a3b8" : "#475569", cursor: row.latestStatus === "USED" || row.latestStatus === "EXPIRED" ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>
                              Gửi lại QR
                            </button>
                          </td>
                        </tr>
                      ))}
                      {paged.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>Không tìm thấy người tham gia nào.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16 }}>
                    <button disabled={safePage === 1} onClick={() => setInvitePage(1)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: safePage === 1 ? "not-allowed" : "pointer" }}>«</button>
                    <button disabled={safePage === 1} onClick={() => setInvitePage(p => p - 1)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: safePage === 1 ? "not-allowed" : "pointer" }}>‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                      .reduce<(number | "…")[]>((acc, p, i, arr) => { if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push("…"); acc.push(p); return acc; }, [])
                      .map((p, i) => p === "…"
                        ? <span key={`e${i}`} style={{ color: "#94a3b8", padding: "0 4px" }}>…</span>
                        : <button key={p} onClick={() => setInvitePage(p as number)} style={{ padding: "4px 10px", borderRadius: 8, border: "none", background: safePage === p ? "#6366f1" : "#f1f5f9", color: safePage === p ? "#fff" : "#374151", fontWeight: safePage === p ? 700 : 400, cursor: "pointer" }}>{p}</button>
                      )}
                    <button disabled={safePage === totalPages} onClick={() => setInvitePage(p => p + 1)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: safePage === totalPages ? "not-allowed" : "pointer" }}>›</button>
                    <button disabled={safePage === totalPages} onClick={() => setInvitePage(totalPages)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: safePage === totalPages ? "not-allowed" : "pointer" }}>»</button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── TAB: ĐIỀU KHIỂN VÒNG ── */}
        {activeTab === "control" && isOrganizer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>⚙️ Quản lý trạng thái vòng bầu cử</h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748b" }}>Mở sớm, đóng sớm hoặc chuyển sang vòng tiếp theo theo ý muốn.</p>

              {rounds.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Chưa có vòng nào được tạo.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {rounds.map(r => {
                    const isLoading = roundActionLoading === r.id;
                    const statusColor = r.status === "OPEN" ? "#10b981" : r.status === "CLOSED" ? "#6366f1" : "#94a3b8";
                    const statusLabel = r.status === "OPEN" ? "Đang diễn ra" : r.status === "CLOSED" ? "Đã kết thúc" : r.status === "UPCOMING" ? "Chưa bắt đầu" : r.status;
                    const btnBase: React.CSSProperties = { padding: "7px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: isLoading ? "not-allowed" : "pointer", transition: "opacity 0.2s", opacity: isLoading ? 0.6 : 1 };
                    return (
                      <div key={r.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "#fafafa" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{r.title || `Vòng ${r.roundNumber}`}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                            {fmt(r.startTime)} — {fmt(r.endTime)}
                          </div>
                          <span style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 99, background: statusColor + "18", color: statusColor }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {r.status === "UPCOMING" && (
                            <button disabled={isLoading} style={{ ...btnBase, background: "#10b981", color: "#fff" }}
                              onClick={() => handleRoundAction(r.id, "start", "Mở vòng sớm")}>
                              {isLoading ? "Đang xử lý..." : "▶ Mở vòng sớm"}
                            </button>
                          )}
                          {r.status === "OPEN" && (
                            <button disabled={isLoading} style={{ ...btnBase, background: "#ef4444", color: "#fff" }}
                              onClick={() => handleRoundAction(r.id, "close", "Kết thúc sớm")}>
                              {isLoading ? "Đang xử lý..." : "⏹ Kết thúc sớm"}
                            </button>
                          )}
                          {r.status === "CLOSED" && r.roundNumber < rounds.length && (
                            <button disabled={isLoading} style={{ ...btnBase, background: "#6366f1", color: "#fff" }}
                              onClick={() => handleRoundAction(r.id, "advance", "Chuyển vòng tiếp")}>
                              {isLoading ? "Đang xử lý..." : "⏭ Chuyển vòng tiếp"}
                            </button>
                          )}
                          {(r.status === "OPEN" || r.status === "CLOSED") && (
                            <button
                              style={{ ...btnBase, background: "#0ea5e9", color: "#fff" }}
                              onClick={() => navigate(`/results?electionId=${election?.id}`)}>
                              📊 Xem kết quả
                            </button>
                          )}
                          {r.status === "CLOSED" && (
                            <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>Vòng đã kết thúc</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ElectionDetail;
