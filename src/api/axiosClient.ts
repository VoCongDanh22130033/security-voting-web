import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("userEmail");
  const inviteEmail = sessionStorage.getItem("electionInviteEmail");

  // Luôn đính kèm token nếu có (để các API cần quyền Host/Admin vẫn hoạt động)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ưu tiên dùng email từ link mời nếu có (cho luồng bỏ phiếu nặc danh)
  if (inviteEmail) {
    config.headers["X-User-Email"] = inviteEmail;
  } else if (userEmail) {
    config.headers["X-User-Email"] = userEmail;
  }

  // Gửi role để backend phân quyền filter
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u?.roles?.length) {
        config.headers["X-User-Role"] = u.roles.join(",");
      }
    } catch (_) {}
  }

  return config;
});

export default axiosClient;
