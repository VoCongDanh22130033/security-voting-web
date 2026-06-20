import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/Login.tsx";
import Home from "./pages/home/Home.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import Profile from "./pages/profile/Profile.tsx";
import VoteStatus from "./pages/elections/VoteStatus.tsx";
import HostDashboard from "./pages/host/HostDashboard.tsx";
import CreateElection from "./components/election/CreateElection.tsx";
import EditElection from "./components/election/EditElection.tsx";
import ElectionStatusManager from "./components/election/ElectionStatusManager.tsx";
import Admin from "./pages/admin/Admin.tsx";
import UserLayout from "./layouts/UserLayout.tsx";
import ProtectedRoute from "./components/common/ProtectedRoute.tsx";
import { ProfileProvider } from "./context/ProfileContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import ElectionDetail from "./components/election/ElectionDetail.tsx";
import Candidates from "./pages/candidates/Candidates.tsx";
import Results from "./pages/results/Results.tsx";
import VerifyEmail from "./pages/auth/VerifyEmail.tsx";
import RealtimeNotifications from "./components/common/RealtimeNotifications.tsx";
import ElectionInvite from "./pages/elections/ElectionInvite.tsx";
import Elections from "./pages/elections/Elections.tsx";
import MyElections from "./pages/elections/MyElections.tsx";
import VoterDashboard from "./pages/voter/VoterDashboard.tsx";

function App() {
    return (
        <AuthProvider>
            <ProfileProvider>
                <BrowserRouter>
                    <RealtimeNotifications />
                    <Routes>
                        <Route element={<UserLayout />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/home" element={<Home />} />
                        </Route>
                        <Route element={<UserLayout/>}>
                            <Route path="/login" element={<Login/>}/>
                            <Route path="/forgot-password" element={<ForgotPassword/>}/>
                            <Route path="/verifi-email" element={<VerifyEmail/>}/>
                            <Route path="/election-invite" element={<ElectionInvite/>}/>
                        </Route>

                        {/* Route công khai — không cần đăng nhập */}
                        <Route element={<UserLayout/>}>
                            <Route path="/results" element={<Results />} />
                        </Route>

                        {/* Route bầu cử qua link mời — không cần đăng nhập */}
                        <Route element={<UserLayout/>}>
                            <Route path="/candidates" element={<Candidates />} />
                            <Route path="/candidates/:id" element={<Candidates />} />
                        </Route>

                        {/* Trang cuộc bầu cử của tôi — không cần đăng nhập, chỉ cần CCCD */}
                        <Route element={<UserLayout/>}>
                            <Route path="/my-elections" element={<MyElections />} />
                        </Route>

                        {/* Voter dashboard — đăng nhập bắt buộc */}
                        <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
                            <Route path="/voter" element={<VoterDashboard />} />
                        </Route>

                        {/* 1. Nhóm Route chung cho tất cả người dùng đã đăng nhập */}
                        <Route element={<ProtectedRoute><UserLayout/></ProtectedRoute>}>
                            <Route path="/profile" element={<Profile/>}/>
                            <Route path="/elections" element={<Elections/>}/>
                            <Route path="/votestatus" element={<VoteStatus/>}/>
                            <Route path="/election-detail/:id" element={<ElectionDetail />} />
                        </Route>

                        {/* 2. Nhóm Route CHỈ dành cho ROLE_ORGANIZER */}
                        <Route element={
                            <ProtectedRoute requiredRole="ROLE_ORGANIZER">
                                <UserLayout/>
                            </ProtectedRoute>
                        }>
                            <Route path="/host-dashboard" element={<HostDashboard/>}/>
                            <Route path="/create-election" element={<CreateElection/>}/>
                            <Route path="/edit-election/:id" element={<EditElection />} />
                            <Route path="/election-status-manager" element={<ElectionStatusManager/>}/>
                        </Route>

                        <Route path="/admin" element={
                            <ProtectedRoute requiredRole="ROLE_ADMIN">
                                <Admin/>
                            </ProtectedRoute>
                        }/>
                    </Routes>
                </BrowserRouter>
            </ProfileProvider>
        </AuthProvider>
    );
}
export default App;
