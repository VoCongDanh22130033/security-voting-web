import React from "react";
import "../assets/css/home.css";

const Home: React.FC = () => {
    return (
        <div className="home-container">
            <main className="home-main">
                <div className="home-content">
                    <div className="text-section">
                        <h1 className="hero-title">Your Voice, <br /><span>Your Power.</span></h1>
                        <p className="hero-desc">
                            Hệ thống bỏ phiếu trực tuyến an toàn, minh bạch và tiện lợi.
                            Tham gia bầu cử ngay hôm nay để góp phần xây dựng cộng đồng của bạn.
                        </p>
                        <div className="hero-actions">
                            <button className="btn-primary">Get Started</button>
                            <button className="btn-secondary">View Elections</button>
                        </div>
                    </div>

                    <div className="image-section">
                        <div className="stats-card">
                            <div className="stats-item">
                                <h3>1,200+</h3>
                                <p>Active Voters</p>
                            </div>
                            <div className="stats-item">
                                <h3>50+</h3>
                                <p>Elections Held</p>
                            </div>
                            <div className="stats-item">
                                <h3>100%</h3>
                                <p>Secure & Encrypted</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
};

export default Home;