import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.tsx";
import Home from "./pages/Home.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Profile from "./pages/Profile.tsx";
import Elections from "./pages/Elections.tsx";
import Candidates from "./pages/Candidates.tsx";
import Results from "./pages/Results.tsx";
import VoteStatus from "./pages/VoteStatus.tsx";
import HostDashboard from "./pages/hostDashboard/HostDashboard.tsx";
import ElectionTimeline from "./components/electionComponent/ElectionTimeline.tsx";
import CreateElection from "./components/electionComponent/CreateElection.tsx";
import ElectionStatusManager from "./components/electionComponent/ElectionStatusManager.tsx";
import Admin from "./pages/admin/Admin.tsx";
import UserLayout from "./layouts/UserLayout.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";


function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>

                {/* Protected Routes with Layout */}
                <Route element={<ProtectedRoute><UserLayout/></ProtectedRoute>}>
                    <Route path="/home" element={<Home/>}/>
                    <Route path="/profile" element={<Profile/>}/>
                    <Route path="/elections" element={<Elections/>}/>
                    <Route path="/candidates" element={<Candidates/>}/>
                    <Route path="/results" element={<Results/>}/>
                    <Route path="/votestatus" element={<VoteStatus/>}/>
                    <Route path="/host-dashboard" element={<HostDashboard/>}/>
                    <Route path="/election-timeline" element={<ElectionTimeline/>}/>
                    <Route path="/create-election" element={<CreateElection/>}/>
                    <Route path="/election-status-manager" element={<ElectionStatusManager/>}/>
                    <Route path="/admin" element={<Admin/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    );

}
export default App;