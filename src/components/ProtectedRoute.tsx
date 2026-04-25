import type {ReactNode} from 'react';
import { Navigate } from 'react-router-dom';
import {useAuth} from "../context/AuthContext.tsx";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
export default ProtectedRoute;