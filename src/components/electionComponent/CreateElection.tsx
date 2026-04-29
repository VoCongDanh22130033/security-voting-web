import React, { useState, useEffect } from "react";
import "../../assets/css/create-election.css";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext.tsx"; // 1. Import useAuth để lấy thông tin người dùng

interface CandidateInput {
    name: string;
    description: string;
}

interface CreateElectionProps {
    editData?: any;
    onComplete?: () => void;
}

const CreateElection: React.FC<CreateElectionProps> = ({ editData, onComplete }) => {
    const { user } = useAuth(); // 2. Lấy đối tượng user hiện tại
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
            console.error("Lỗi lấy danh sách ứng viên:", error);
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

        const isOrganizer = user?.roles?.includes("ROLE_ORGANIZER");

        const payload = {
            title,
            description,
            startTime: startTime.includes(":") && startTime.split(":").length === 2 ? `${startTime}:00` : startTime,
            endTime: endTime.includes(":") && endTime.split(":").length === 2 ? `${endTime}:00` : endTime,
            candidates,

            roleId: isOrganizer ? 2 : 3
        };

        console.log("Payload gửi đi:", payload);
        try {
            if (editData) {
                await api.put(`/api/elections/${editData.id}`, payload);
            } else {
                await api.post("/api/elections/create", payload);
            }
            if (onComplete) onComplete();
        } catch (error) {
            console.error("Lỗi API:", error);
        } finally {
            setIsLoading(false);
        }
    };   return (
        <div className="create-election-container">
            <h3>{editData ? "Chỉnh sửa cuộc bầu cử" : "Tạo cuộc bầu cử mới"}</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Tiêu đề:</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isLoading} />
                </div>
                <div className="form-group">
                    <label>Mô tả:</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isLoading} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Thời gian bắt đầu:</label>
                        <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="form-group">
                        <label>Thời gian kết thúc:</label>
                        <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={isLoading} />
                    </div>
                </div>

                <div className="candidates-management">
                    <h4>Danh sách ứng viên</h4>
                    {candidates.map((cand, index) => (
                        <div key={index} className="candidate-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <input type="text" placeholder="Tên ứng viên" value={cand.name} onChange={(e) => handleCandidateChange(index, "name", e.target.value)} required disabled={isLoading} />
                            <input type="text" placeholder="Mô tả" value={cand.description} onChange={(e) => handleCandidateChange(index, "description", e.target.value)} disabled={isLoading} />
                            {candidates.length > 1 && (
                                <button type="button" onClick={() => removeCandidate(index)} style={{background: 'red', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}>Xóa</button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="btn-add-candidate" onClick={addCandidate} disabled={isLoading}>+ Thêm ứng viên</button>
                </div>

                <div className="form-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
                    <button type="button" onClick={onComplete} className="btn-cancel" disabled={isLoading}>Hủy bỏ</button>
                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? "Đang xử lý..." : (editData ? "Cập nhật Database" : "Khởi tạo & Lưu Database")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateElection;