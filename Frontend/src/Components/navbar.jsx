import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../utils/apiConfig";

function NavBar() {
  const [hostelName, setHostelName] = useState("Your Hostel");
  const [ownerImage, setOwnerImage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [hostelRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/hostel/data/`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/user/data/`, { credentials: "include" }),
        ]);

        const hostelData = hostelRes.ok ? await hostelRes.json().catch(() => ({})) : {};
        const userData = userRes.ok ? await userRes.json().catch(() => ({})) : {};

        if (hostelData.hostel_name) {
          setHostelName(hostelData.hostel_name);
        }
        if (userData.ProfileImage) {
          setOwnerImage(userData.ProfileImage);
        }
      } catch (e) {
        // silent fail, keep defaults
      }
    }

    loadData();
  }, []);

  const initial = (hostelName || "H").trim().charAt(0).toUpperCase();

  return (
    <div className="navbar">
      <Link to="/" className="home">
        <h3>{(hostelName || "Your Hostel").toUpperCase()}</h3>
      </Link>

      <div className="navbarportion">
        <Link to="/login" className="loginButton">
          Login
        </Link>

        <Link to="/profile/personal" className="ProfilePhoto">
          <div
            className="image"
            style={
              ownerImage
                ? {
                    backgroundImage: `url(${ownerImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!ownerImage && <span className="avatarInitial">{initial}</span>}
          </div>
        </Link>
      </div>
    </div>
  );
}

export default NavBar;
