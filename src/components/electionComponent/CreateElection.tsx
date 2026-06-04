import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { electionApi } from '../../api/electionApi';

interface Candidate {
    id?: number;
    name: string;
    party?: string;
    avatarUrl?: string;
    base64Image?: string;
    description?: string;
    isNew?: boolean;
}

interface RoundTimeConfig {
    roundNumber: number;
    startTime: string;
    endTime: string;
    maxAdvanceCount: number;
    title?: string;
}

export const CreateElection: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [totalRounds, setTotalRounds] = useState<number>(1);
    const [electionImageBase64, setElectionImageBase64] = useState('');
    const [roundsConfig, setRoundsConfig] = useState<RoundTimeConfig[]>([
        { roundNumber: 1, startTime: '', endTime: '', maxAdvanceCount: 1 }
    ]);
    const [dbCandidates, setDbCandidates] = useState<Candidate[]>([]);
    const [localCandidates, setLocalCandidates] = useState<Candidate[]>([]);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newParty, setNewParty] = useState('');
    const [newBio, setNewBio] = useState('');
    const [newImageBase64, setNewImageBase64] = useState('');

    const fetchDbCandidates = async () => {
        try {
            const response = await electionApi.getAllCandidates();
            setDbCandidates(response || []);
        } catch (err) {
            console.error("Lỗi lấy danh sách ứng viên:", err);
        }
    };

    useEffect(() => {
        // Tự động gọi fetch ứng viên từ database để hiển thị ở lưới phía trên
        fetchDbCandidates();
    }, []);

    const handleTotalRoundsChange = (rounds: number) => {
        setTotalRounds(rounds);
        const newConfigs: RoundTimeConfig[] = [];
        for (let i = 1; i <= rounds; i++) {
            const existingConfig = roundsConfig.find(r => r.roundNumber === i);
            let maxAdvance = existingConfig ? existingConfig.maxAdvanceCount : 1;

            if (i === rounds) {
                maxAdvance = 1;
            } else if (existingConfig && existingConfig.maxAdvanceCount === 1) {
                maxAdvance = 5;
            } else if (!existingConfig) {
                maxAdvance = 5;
            }

            newConfigs.push(
                existingConfig
                    ? { ...existingConfig, maxAdvanceCount: maxAdvance }
                    : { roundNumber: i, startTime: '', endTime: '', maxAdvanceCount: maxAdvance, title: `${title} Vòng ${i}` }
            );
        }
        setRoundsConfig(newConfigs);
    };

    const handleRoundConfigChange = (roundNum: number, field: keyof RoundTimeConfig, value: any) => {
        setRoundsConfig(
            roundsConfig.map(r => r.roundNumber === roundNum ? { ...r, [field]: value } : r)
        );
    };

    const handleElectionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setElectionImageBase64(reader.result as string || '');
            reader.readAsDataURL(file);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewImageBase64(reader.result as string || '');
            reader.readAsDataURL(file);
        }
    };

    const handleAddCandidateToLocalList = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) {
            Swal.fire("Cảnh báo", "Vui lòng nhập họ và tên ứng cử viên!", "warning");
            return;
        }
        const tempCandidate: Candidate = {
            name: newName, party: newParty, description: newBio, base64Image: newImageBase64, isNew: true
        };
        setLocalCandidates([...localCandidates, tempCandidate]);
        setNewName(''); setNewParty(''); setNewBio(''); setNewImageBase64('');
        Swal.fire({
            toast: true, position: 'top-end', icon: 'success', title: `Đã thêm tạm ứng viên ${tempCandidate.name}`, showConfirmButton: false, timer: 1500
        });
    };

    const handleRemoveLocalCandidate = (index: number) => {
        setLocalCandidates(localCandidates.filter((_, i) => i !== index));
    };

    const handleToggleDbCandidate = (candidateId: number) => {
        if (selectedCandidateIds.includes(candidateId)) {
            setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== candidateId));
        } else {
            setSelectedCandidateIds([...selectedCandidateIds, candidateId]);
        }
    };

    const handleSubmitElection = async (e: React.FormEvent) => {
        e.preventDefault();

        const totalSelectedCount = selectedCandidateIds.length + localCandidates.length;
        if (totalSelectedCount < 2) {
            Swal.fire("Cảnh báo", "Tổng số ứng cử viên tham gia xuất phát phải từ 2 người trở lên!", "warning");
            return;
        }

        for (const round of roundsConfig) {
            if (!round.startTime || !round.endTime) {
                Swal.fire("Cảnh báo", `Vui lòng nhập đầy đủ thời gian cho Vòng ${round.roundNumber}!`, "warning");
                return;
            }
            if (new Date(round.startTime) >= new Date(round.endTime)) {
                Swal.fire("Cảnh báo", `Thời gian kết thúc Vòng ${round.roundNumber} phải lớn hơn thời gian bắt đầu!`, "warning");
                return;
            }
        }

        Swal.fire({
            title: "Đang khởi tạo cuộc bầu cử...",
            text: "Hệ thống đang lưu trữ cấu hình chuỗi vòng và số lượng tiêu chuẩn bộ lọc",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const payload = {
                title,
                description,
                totalRounds,
                base64Image: electionImageBase64,
                roundsTimeSettings: roundsConfig.map(r => ({
                    ...r,
                    title: totalRounds > 1 ? `${title} Vòng ${r.roundNumber}` : `${title}`,
                    maxAdvanceCount: r.roundNumber === totalRounds ? 1 : r.maxAdvanceCount,
                    startTime: r.startTime.length === 16 ? `${r.startTime}:00` : r.startTime,
                    endTime: r.endTime.length === 16 ? `${r.endTime}:00` : r.endTime
                })),
                candidateIds: selectedCandidateIds,
                newCandidates: localCandidates
            };

            await electionApi.createMultiRound(payload);
            await Swal.fire("Thành công!", `Cuộc bầu cử gồm ${totalRounds} vòng đã được tạo lập hoàn chỉnh.`, "success");

            setTitle('');
            setDescription('');
            setElectionImageBase64('');
            handleTotalRoundsChange(1);
            setSelectedCandidateIds([]);
            setLocalCandidates([]);
            fetchDbCandidates();

        } catch (err: any) {
            console.error(err);
            let errorMessage = "Không thể khởi tạo cuộc bầu cử!";
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                }
            }
            Swal.fire("Thất bại", errorMessage, "error");
        }
    };

    return (
        <div className="profile-container" style={{ maxWidth: '850px', margin: '30px auto', padding: '25px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div className="info-section">
                <h2 style={{ textAlign: 'center', marginBottom: '5px', color: '#2c3e50', fontWeight: '700' }}>THIẾT LẬP CUỘC BẦU CỬ NHIỀU VÒNG</h2>
                <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '13px', marginBottom: '30px' }}>
                    Nhập thông tin, cấu hình chuỗi thời gian độc lập và chỉ tiêu số lượng ứng viên đi tiếp cho từng vòng.
                </p>

                <form onSubmit={handleSubmitElection} className="edit-form">
                    {/* KHU VỰC 1: THÔNG TIN CHUNG */}
                    <div style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #eaedf1' }}>
                        <div className="form-group">
                            <label>Tên cuộc bầu cử <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Đại biểu Hội đồng trường nhiệm kỳ mới" />
                        </div>

                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label>Mô tả / Thể lệ cuộc bầu cử</label>
                            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Nhập quy định lọc ứng viên qua từng vòng..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '14px' }} />
                        </div>

                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label>Ảnh đại diện / Banner cuộc bầu cử</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleElectionImageChange}
                                style={{ border: 'none', padding: 0, background: 'transparent' }}
                            />
                            {electionImageBase64 && (
                                <div style={{ marginTop: '12px', textAlign: 'left' }}>
                                    <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block', marginBottom: '5px' }}>Xem trước ảnh banner:</span>
                                    <img
                                        src={electionImageBase64}
                                        alt="Election Banner Preview"
                                        style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ marginTop: '15px' }}>
                            <label>Thiết lập số vòng bầu cử (Từ 1 tới 10 vòng) <span style={{ color: 'red' }}>*</span></label>
                            <select
                                value={totalRounds}
                                onChange={e => handleTotalRoundsChange(Number(e.target.value))}
                                style={{ width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff', fontWeight: '600', color: '#2c3e50' }}
                            >
                                {[...Array(10)].map((_, index) => (
                                    <option key={index + 1} value={index + 1}>
                                        Chạy tổng cộng: {index + 1} vòng bỏ phiếu
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* KHU VỰC 2: QUẢN LÝ VÀ THÊM ỨNG VIÊN (ĐÃ CHUYỂN LÊN TRÊN) */}
                    <div style={{ marginBottom: '25px', padding: '15px', borderRadius: '8px', background: '#f0fdf4', border: '1px dashed #2ecc71' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4 style={{ color: '#166534', fontSize: '14px', margin: 0, fontWeight: '600' }}>➕ Khung thêm nhanh nhiều ứng cử viên thủ công</h4>
                            <button type="button" onClick={() => setShowAddForm(!showAddForm)} style={{ padding: '4px 10px', background: showAddForm ? '#dc2626' : '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                {showAddForm ? 'Đóng khung nhập' : 'Mở khung nhập'}
                            </button>
                        </div>
                        {showAddForm && (
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group">
                                        <label style={{ fontSize: '12px' }}>Họ và tên ứng viên <span style={{ color: 'red' }}>*</span></label>
                                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nhập tên..." style={{ padding: '8px' }} />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontSize: '12px' }}>Tổ chức / Đảng bộ đại diện</label>
                                        <input type="text" value={newParty} onChange={e => setNewParty(e.target.value)} placeholder="Ví dụ: Khoa Công nghệ thông tin" style={{ padding: '8px' }} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '12px' }}>Mô tả tiểu sử ngắn</label>
                                    <input type="text" value={newBio} onChange={e => setNewBio(e.target.value)} placeholder="Thành tích cá nhân..." style={{ padding: '8px' }} />
                                </div>
                                <div className="form-group" style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '12px' }}>Chọn ảnh đại diện</label>
                                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ border: 'none', padding: 0 }} />
                                </div>
                                <button type="button" onClick={handleAddCandidateToLocalList} style={{ marginTop: '10px', width: '100%', padding: '8px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                                    Lưu tạm ứng viên này vào danh sách bầu
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ color: '#2c3e50', fontSize: '15px', marginBottom: '10px' }}>
                            👥 Tổng số ứng viên tham gia Vòng 1 (Đã chọn: <strong style={{ color: '#2ecc71' }}>{selectedCandidateIds.length + localCandidates.length}</strong>)
                        </h4>
                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px', background: '#f8fafc' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                {localCandidates.map((candidate, index) => (
                                    <div key={`local-${index}`} style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', borderRadius: '8px', background: '#fff', border: '2px dashed #2ecc71', position: 'relative' }}>
                                        <button type="button" onClick={() => handleRemoveLocalCandidate(index)} style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                                        <div style={{ width: '55px', height: '55px', borderRadius: '50%', marginRight: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid #ddd' }}>
                                            {candidate.base64Image ? <img src={candidate.base64Image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ background: '#2ecc71', color: '#fff', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>+</span>}
                                        </div>
                                        <div>
                                            <h5 style={{ margin: '0 0 3px 0', fontSize: '14px', color: '#166534', fontWeight: '600' }}>{candidate.name}</h5>
                                            {candidate.party && <span style={{ display: 'inline-block', padding: '1px 5px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '10px', marginBottom: '5px' }}>{candidate.party}</span>}
                                            <p style={{ margin: '0', fontSize: '12px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{candidate.description || "Chưa có tiểu sử."}</p>
                                        </div>
                                    </div>
                                ))}
                                {dbCandidates.map(candidate => {
                                    const isChecked = selectedCandidateIds.includes(candidate.id!);
                                    return (
                                        <div key={`db-${candidate.id}`} onClick={() => handleToggleDbCandidate(candidate.id!)} style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', borderRadius: '8px', background: '#fff', border: isChecked ? '2px solid #3498db' : '1px solid #e2e8f0', cursor: 'pointer', position: 'relative' }}>
                                            <input type="checkbox" checked={isChecked} onChange={(e) => { e.stopPropagation(); handleToggleDbCandidate(candidate.id!); }} style={{ width: '16px', height: '16px', position: 'absolute', top: '12px', right: '12px' }} />
                                            <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: '#e2e8f0', marginRight: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                {candidate.avatarUrl ? <img src={candidate.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '16px', color: '#64748b', fontWeight: '600' }}>{candidate.name.charAt(0)}</span>}
                                            </div>
                                            <div style={{ paddingRight: '20px', flex: 1 }}>
                                                <h5 style={{ margin: '0 0 3px 0', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{candidate.name}</h5>
                                                {candidate.party && <span style={{ display: 'inline-block', padding: '1px 5px', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '10px', marginBottom: '5px' }}>{candidate.party}</span>}
                                                <p style={{ margin: '0', fontSize: '12px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{candidate.description || "Chưa cập nhật tiểu sử."}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* KHU VỰC 3: CẤU HÌNH THỜI GIAN THEO VÒNG (ĐÃ CHUYỂN XUỐNG DƯỚI) */}
                    <div style={{ marginBottom: '25px', padding: '18px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ color: '#4a90e2', fontSize: '14px', margin: '0 0 15px 0', fontWeight: '700' }}>⏱️ Thiết lập khung thời gian & Chỉ tiêu thắng cuộc từng vòng</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {roundsConfig.map((round) => (
                                <div
                                    key={round.roundNumber}
                                    style={{ padding: '15px', background: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                >
                                    <h5 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ background: '#4a90e2', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>VÒNG {round.roundNumber}</span>
                                        Cấu hình chi tiết Vòng {round.roundNumber}
                                    </h5>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '12px', color: '#475569' }}>Thời gian mở hòm phiếu vòng {round.roundNumber} <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={round.startTime}
                                                onChange={e => handleRoundConfigChange(round.roundNumber, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '12px', color: '#475569' }}>Thời gian khóa hòm phiếu vòng {round.roundNumber} <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={round.endTime}
                                                onChange={e => handleRoundConfigChange(round.roundNumber, 'endTime', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {round.roundNumber < totalRounds ? (
                                        <div className="form-group" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                            <label style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                                                🎯 Số lượng ứng viên cao phiếu nhất ở Vòng {round.roundNumber} sẽ lọt vào Vòng {round.roundNumber + 1} <span style={{ color: 'red' }}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                required
                                                value={round.maxAdvanceCount}
                                                onChange={e => handleRoundConfigChange(round.roundNumber, 'maxAdvanceCount', Math.max(1, Number(e.target.value)))}
                                                placeholder="Ví dụ: 5"
                                                style={{ marginTop: '5px', padding: '8px', width: '100%', maxWidth: '200px' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', color: '#b45309', fontSize: '12px', fontWeight: '500' }}>
                                            👑 Vòng {round.roundNumber} là Vòng Chung Kết - Người cao phiếu nhất vòng này sẽ là người chiến thắng cuối cùng.
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="action-section">
                        <button type="submit" className="change-password-btn" style={{ width: '100%', padding: '14px', borderRadius: '8px', background: '#2ecc71', color: '#fff', fontSize: '15px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                            Xác nhận khởi tạo cuộc bầu cử và cấu hình các vòng
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default CreateElection;