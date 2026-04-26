import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import authService from "../services/authService";
import { useAuth } from "./AuthContext";

interface ProfileContextType {
  profile: any;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
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
    } catch (error) {
      console.error("Lỗi khi tải profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);


  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile(); // Chỉ gọi khi đã đăng nhập
    } else {
      setProfile(null); // Xóa profile khi logout
    }
    // CHỈ theo dõi isAuthenticated để tránh vòng lặp vô tận
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