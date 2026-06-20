import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { electionApi } from "../../api/electionApi";
import "./election-status-manager.css";

const ElectionStatusManager: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isActive, setIsActive] = useState<boolean>(true);

    useEffect(() => {
        const fetchElectionStatus = async () => {
            if (id) {
                try {
                    const res = await electionApi.getById(id);
                    setIsActive(res.data.status === 'OPEN');
                } catch (error) {
                    console.error("Failed to fetch election status:", error);
                }
            }
        };
        fetchElectionStatus();
    }, [id]);

    const handleToggle = async () => {
        const confirmMsg = isActive
            ? "Bạn có chắc chắn muốn ĐÓNG cuộc bầu cử này? Cử tri sẽ không thể bỏ phiếu nữa."
            : "Bạn có muốn MỞ lại cuộc bầu cử này không?";

        if (window.confirm(confirmMsg)) {
            if (id) {
                try {
                    if (isActive) {
                        await electionApi.determineWinner(parseInt(id, 10));
                    }
                    // You might want to add an API call here to update the election status
                    setIsActive(!isActive);
                } catch (error) {
                    console.error("Failed to update election status:", error);
                }
            }
        }
    };

    return (
        <div className="status-manager-container">
            <div className="status-info">
                <div className="status-text">
                    <h4>Trạng thái cuộc bầu cử</h4>
                    <p>Điều khiển việc cử tri có thể truy cập và bỏ phiếu hay không.</p>
                </div>
                <div className="status-control">
                    <span className={`status-label ${isActive ? "active" : "inactive"}`}>
                        {isActive ? "ĐANG MỞ" : "ĐÃ ĐÓNG"}
                    </span>
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={handleToggle}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            {!isActive && (
                <div className="status-warning">
                    <p>⚠️ <strong>Lưu ý:</strong> Khi trạng thái là ĐÃ ĐÓNG, hệ thống vẫn lưu trữ dữ liệu nhưng ngăn chặn mọi hành động bỏ phiếu mới.</p>
                </div>
            )}
        </div>
    );
};

export default ElectionStatusManager;