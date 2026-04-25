import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/HeaderAndFooterComponent/Header";
import Footer from "../components/HeaderAndFooterComponent/Footer";

const UserLayout: React.FC = () => {
  return (
      <div className="user-app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main className="content-area" style={{ flex: 1 }}>
          {/* Outlet sẽ là nơi nội dung các trang con hiển thị */}
          <Outlet />
        </main>
        <Footer />
      </div>
  );
};

export default UserLayout;