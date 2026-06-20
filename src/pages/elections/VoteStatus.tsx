import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./vote-status.css";

const VoteStatus: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Lấy trạng thái từ URL (ví dụ: /vote-status?type=success)
    const type = searchParams.get("type") || "success";

    const isSuccess = type === "success";

    return (
        <div className="status-container">

            <main className="status-main">
                <div className={`status-card ${isSuccess ? "success" : "error"}`}>
                    <div className="status-icon">
                        {isSuccess ? "✅" : "❌"}
                    </div>

                    <h1 className="status-title">
                        {isSuccess ? "Bình chọn thành công!" : "Bình chọn thất bại"}
                    </h1>

                    <p className="status-message">
                        {isSuccess
                            ? "Cảm ơn bạn đã thực hiện quyền biểu quyết. Phiếu bầu của bạn đã được ghi lại an toàn trên hệ thống."
                            : "Đã có lỗi xảy ra trong quá trình gửi phiếu bầu. Vui lòng kiểm tra lại kết nối và thử lại sau."}
                    </p>

                    <div className="status-actions">
                        {isSuccess ? (
                            <>
                                <button className="btn-results" onClick={() => navigate("/results")}>
                                    Xem kết quả hiện tại
                                </button>
                                <button className="btn-home" onClick={() => navigate("/home")}>
                                    Về trang chủ
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn-retry" onClick={() => navigate("/candidates")}>
                                    Thử lại ngay
                                </button>
                                <button className="btn-home" onClick={() => navigate("/home")}>
                                    Về trang chủ
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VoteStatus;