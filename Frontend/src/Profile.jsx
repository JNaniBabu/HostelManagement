import { FaArrowLeft } from "react-icons/fa";
import { FaBuilding, FaDoorOpen, FaMoneyBillWave, FaPalette, FaSignOutAlt, FaUser } from "react-icons/fa";
import { Link, NavLink, Outlet } from "react-router-dom";

const profileNavItems = [
  { to: "personal", label: "Personal Info", icon: <FaUser /> },
  { to: "hostel", label: "Hostel Data", icon: <FaBuilding /> },
  { to: "upi", label: "UPI Settings", icon: <FaMoneyBillWave /> },
  { to: "rooms", label: "Add Rooms", icon: <FaDoorOpen /> },
  { to: "theme", label: "Theme", icon: <FaPalette /> },
  { to: "logout", label: "Logout", icon: <FaSignOutAlt /> },
];

function Profile() {
  return (
    <div className="profile">
      <div className="profileTopBar">
        <Link className="profileBack" to="/">
          <FaArrowLeft />
          <span>Back</span>
        </Link>

        <h3>Profile Settings</h3>
      </div>

      <div className="profileBio">
        <div className="ProfileSideBar">
          {profileNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `profileNavLink ${isActive ? "profileNavLinkActive" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      
        <div className="ProfileSideBarData">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Profile;
