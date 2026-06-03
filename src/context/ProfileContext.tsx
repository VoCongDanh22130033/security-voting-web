import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../api/userApi";
import { useAuth } from "./AuthContext";

interface ProfileContextType {
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, updateAuthUser } = useAuth(); // Lấy hàm updateAuthUser từ AuthContext
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      const data = await authService.getProfile();
      setProfile(data);
      
      // ĐỒNG BỘ: Cập nhật thông tin cơ bản sang AuthContext ngay khi Profile được làm mới
      if (data && updateAuthUser) {
        updateAuthUser({
          fullName: data.fullName || data.user?.fullName,
          // Lấy đúng url ảnh từ nhiều field khác nhau tùy theo response của Backend
          image_url: data.imageUrl || data.image_url || data.user?.imageUrl || data.user?.image_url
        });
      }

    } catch (error) {
      console.error("Lỗi khi tải profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, updateAuthUser]);


  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [isAuthenticated]);

  return (
      <ProfileContext.Provider value={{ profile, loading, refreshProfile }}>
        {children}
      </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile phải được dùng trong ProfileProvider");
  }
  return context;
};