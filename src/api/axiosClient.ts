import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:8080", // API Gateway
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const userEmail = localStorage.getItem("userEmail");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (userEmail) {
    config.headers["X-User-Email"] = userEmail;
  }
  return config;
});

export default axiosClient;