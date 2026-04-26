import React from "react";
import "../assets/css/home.css";

const Home: React.FC = () => {
    return (
        <div className="home-container">
            <main className="home-main">
                <div className="home-content">
                    <div className="text-section">
                        <h1 className="hero-title">
                            Tiếng nói của bạn, <br />
                            <span>Sức mạnh của cộng đồng</span>
                        </h1>

                        <p className="hero-desc">
                            Hệ thống bỏ phiếu trực tuyến hiện đại, an toàn và minh bạch.
                            Hãy tham gia bầu cử ngay hôm nay để đóng góp ý kiến và xây dựng cộng đồng tốt đẹp hơn.
                        </p>

                        <div className="hero-actions">
                            <button className="btn-primary">Bắt đầu ngay</button>
                            <button className="btn-secondary">Xem cuộc bầu cử</button>
                        </div>
                    </div>

                    <div className="image-section">
                        <div className="stats-card">
                            <div className="stats-item">
                                <h3>1,200+</h3>
                                <p>Cử tri đang hoạt động</p>
                            </div>
                            <div className="stats-item">
                                <h3>50+</h3>
                                <p>Cuộc bầu cử đã tổ chức</p>
                            </div>
                            <div className="stats-item">
                                <h3>100%</h3>
                                <p>Bảo mật & mã hóa</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Home;