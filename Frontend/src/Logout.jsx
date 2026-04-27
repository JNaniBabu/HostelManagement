import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./utils/authFetch";

function LogOut() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "You are about to end your session. Click the button below when you are ready to logout."
  );

  async function handleLogout() {
    setLoading(true);
    setMessage("Logging out... Please wait.");

    try {
      const response = await authFetch("/tenant/logout/", {
        method: "POST",
      });
      if (response.ok) {
        setMessage("You have been logged out successfully. Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 500);
      } else {
        setMessage("Logout failed. Please try again.");
      }
    } catch (error) {
      setMessage("Server error while logging out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="Personal">
      <h1>Logout</h1>
      <p className="logoutInstruction">
        {message}
      </p>
      <button
        className="logoutButton"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? "Logging out..." : "Confirm Logout"}
      </button>
    </div>
  );
}

export default LogOut