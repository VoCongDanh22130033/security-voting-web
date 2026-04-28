import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext.tsx";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string; // Thêm prop để kiểm tra quyền cụ thể
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Nếu route yêu cầu quyền cụ thể (ví dụ: ROLE_ORGANIZER)
  // user.roles là mảng string được trả về từ Backend
  if (requiredRole && !user?.roles?.includes(requiredRole)) {
    // Nếu không có quyền, đẩy về trang chủ hoặc trang báo lỗi
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;