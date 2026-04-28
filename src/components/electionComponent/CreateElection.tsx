import React, { useState, useEffect } from "react";
import "../../assets/css/create-election.css";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext.tsx"; // Import useAuth

interface CandidateInput {
    name: string;
    description: string;
}

interface CreateElectionProps {
    editData?: any;
    onComplete?: () => void;
}

const CreateElection: React.FC<CreateElectionProps> = ({ editData, onComplete }) => {
    const { user } = useAuth(); // Lấy user hiện tại
    const [title, setTitle] = useState(editData?.title || "");
    const [description, setDescription] = useState(editData?.description || "");
    const [startTime, setStartTime] = useState(editData?.startDate?.substring(0, 16) || "");
    const [endTime, setEndTime] = useState(editData?.endDate?.substring(0, 16) || "");
    const [candidates, setCandidates] = useState<CandidateInput[]>([{ name: "", description: "" }]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (editData?.id) {
            fetchCandidates(editData.id);
        }
    }, [editData]);

    const fetchCandidates = async (id: number) => {
        try {
            const res = await api.get(`/api/elections/${id}/candidates`);
            setCandidates(res.data.map((c: any) => ({ name: c.name, description: c.description })));
        } catch (error) {
            console.error("Lỗi lấy ứng viên:", error);
        }
    };

    const addCandidate = () => setCandidates([...candidates, { name: "", description: "" }]);
    const removeCandidate = (index: number) => setCandidates(candidates.filter((_, i) => i !== index));
    const handleCandidateChange = (index: number, field: keyof CandidateInput, value: string) => {
        const newCandidates = [...candidates];
        newCandidates[index][field] = value;
        setCandidates(newCandidates);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Gửi kèm hostId để phân quyền
        const payload = {
            title,
            description,
            startTime,
            endTime,
            candidates,
            hostId: user?.id
        };

        try {
            if (editData) {
                await api.put(`/api/elections/${editData.id}`, payload);
                alert("Cập nhật thành công!");
            } else {
                await api.post("/api/elections/create", payload);
                alert("Tạo mới thành công!");
            }
            if (onComplete) onComplete();
        } catch (error: any) {
            alert(error.response?.data?.message || "Lỗi thao tác Database.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="create-election-container">
            <h3>{editData ? "Chỉnh sửa cuộc bầu cử" : "Tạo Cuộc Bầu Cử Mới"}</h3>
            <form className="create-election-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-left">
                        <div className="form-group">
                            <label>Tên cuộc bầu cử</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
                        </div>
                        <div className="form-group">
                            <label>Mô tả</label>
                            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isLoading} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Bắt đầu</label>
                                <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isLoading} />
                            </div>
                            <div className="form-group">
                                <label>Kết thúc</label>
                                <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isLoading} />
                            </div>
                        </div>
                    </div>
                    <div className="form-right">
                        <label>Hình ảnh đại diện</label>
                        <div className="image-upload-box" style={{ height: '150px', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p>📸 Tải banner</p>
                        </div>
                    </div>
                </div>

                <hr />
                <div className="candidates-management">
                    <h4>Danh sách ứng viên</h4>
                    {candidates.map((cand, index) => (
                        <div key={index} className="candidate-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input type="text" placeholder="Tên" value={cand.name} onChange={(e) => handleCandidateChange(index, "name", e.target.value)} required disabled={isLoading} />
                            <input type="text" placeholder="Mô tả" value={cand.description} onChange={(e) => handleCandidateChange(index, "description", e.target.value)} disabled={isLoading} />
                            {candidates.length > 1 && (
                                <button type="button" onClick={() => removeCandidate(index)} style={{background: 'red', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}>Xóa</button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="btn-add-candidate" onClick={addCandidate} disabled={isLoading}>+ Thêm ứng viên</button>
                </div>

                <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                    <button type="button" onClick={onComplete} className="btn-cancel">Hủy bỏ</button>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : (editData ? "Cập nhật Database" : "Khởi tạo & Lưu Database")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;