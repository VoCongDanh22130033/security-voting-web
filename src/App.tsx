import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Profile from "./pages/Profile.tsx";
import VoteStatus from "./pages/VoteStatus.tsx";
import HostDashboard from "./pages/hostDashboard/HostDashboard.tsx";
import CreateElection from "./components/electionComponent/CreateElection.tsx";
import ElectionStatusManager from "./components/electionComponent/ElectionStatusManager.tsx";
import Admin from "./pages/admin/Admin.tsx";
import UserLayout from "./layouts/UserLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { ProfileProvider } from "./context/ProfileContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import Elections from "./pages/Elections.tsx";
import ElectionDetail from "./components/electionComponent/ElectionDetail.tsx";
import Candidates from "./pages/Candidates.tsx";
import Results from "./pages/Results.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
function App() {
    return (
        <AuthProvider>
            <ProfileProvider>
                <BrowserRouter>
                    <Routes>
                        <Route element={<UserLayout />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/home" element={<Home />} />
                        </Route>
                        <Route path="/login" element={<Login/>}/>

                        <Route path="/register" element={<Register/>}/>
                        <Route path="/forgot-password" element={<ForgotPassword/>}/>
                        <Route path="/verifi-email" element={<VerifyEmail/>}/>

                        {/* 1. Nhóm Route chung cho tất cả người dùng đã đăng nhập */}
                        <Route element={<ProtectedRoute><UserLayout/></ProtectedRoute>}>
                            <Route path="/profile" element={<Profile/>}/>
                            <Route path="/votestatus" element={<VoteStatus/>}/>
                            <Route path="/elections" element={<Elections/>}/>
                            <Route path="/election-detail/:id" element={<ElectionDetail />} />
                            <Route path="/candidates" element={<Candidates />} />
                            <Route path="/results" element={<Results />} />
                        </Route>

                        {/* 2. Nhóm Route CHỈ dành cho ROLE_ORGANIZER */}
                        <Route element={
                            <ProtectedRoute requiredRole="ROLE_ORGANIZER">
                                <UserLayout/>
                            </ProtectedRoute>
                        }>
                            <Route path="/host-dashboard" element={<HostDashboard/>}/>
                            <Route path="/create-election" element={<CreateElection/>}/>
                            <Route path="/election-status-manager" element={<ElectionStatusManager/>}/>
                        </Route>

                        <Route element={
                            <ProtectedRoute requiredRole="ROLE_ADMIN">
                                <UserLayout/>
                            </ProtectedRoute>
                        }>
                            <Route path="/admin" element={<Admin/>}/>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ProfileProvider>
        </AuthProvider>
    );
}
export default App;