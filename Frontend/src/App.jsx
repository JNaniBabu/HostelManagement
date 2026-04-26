import "./App.css";
import { Routes, Route } from "react-router-dom";

// Layouts
import AdminLayout from "./LayoutsHostel/admin";

// Pages
import MainPortion from "./Components/MainPortion";
import Profile from "./Profile";
import LoginForms from "./Login";

// Profile Components
import Personal from "./Components/Personal";
import Hostel from "./Components/hostel";
import Upisettings from "./Components/Upi";
import AddRooms from "./Components/addRooms";
import ThemeSelector from "./Components/theme";
import LogOut from "./Logout";

// Student
import StudentHome from "./StudentComponent/student";
import StudentProfile from "./StudentComponent/studentProfile";
import TenantLayout from "./LayoutsHostel/tenant";
import Homepage from "./StudentComponent/studentHomePage";

function App() {
  return (
    <div className="parent">
      <Routes>
        <Route path="/login" element={<LoginForms />} />

        <Route element={<AdminLayout />}>
          <Route path="/" element={<MainPortion />} />
          <Route path="/profile" element={<Profile />}>
            <Route path="personal" element={<Personal />} />
            <Route path="hostel" element={<Hostel />} />
            <Route path="upi" element={<Upisettings />} />
            <Route path="rooms" element={<AddRooms />} />
            <Route path="theme" element={<ThemeSelector />} />
            <Route path="logout" element={<LogOut />} />
          </Route>
        </Route>

        <Route element={<TenantLayout />}>
          <Route path="/tenant" element={<Homepage></Homepage>}></Route>
        </Route>
    
        <Route path="/tenant/verify/" element={<StudentHome />} />
        <Route path="/tenant/profile"element={<StudentProfile></StudentProfile>}/>
      </Routes>
    </div>
  );
}

export default App;
