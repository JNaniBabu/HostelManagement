import { useEffect, useState } from "react";
import Loader from "../Loader";
import { authFetch, getCookie } from "../utils/authFetch";

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchComplaints() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("http://localhost:8000/complaints/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || "Unable to load complaints");
        setComplaints([]);
      } else {
        setComplaints(data.complaints || []);
      }
    } catch {
      setError("Server error");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaints();
  }, []);

  return (
    <div className="complaintsPane">
      <div className="pendingHeader">
        <h3>Complaints</h3>
        <button className="availabilityButton" onClick={fetchComplaints} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="vacancyLoaderWrap">
          <Loader />
        </div>
      )}

      {!loading && error && <p className="newJoineeStatus error">{error}</p>}

      {!loading && !error && complaints.length === 0 && (
        <p className="vacancyEmpty">No complaints yet.</p>
      )}

      {!loading && !error && complaints.length > 0 && (
        <div className="complaintsList">
          {complaints.map((c) => (
            <div key={c.id} className="complaintCard">
              <div className="complaintTop">
                <div className="complaintTag">{c.category || "General"}</div>
                <span className={`pendingStatus ${c.status || "pending"}`}>
                  {c.status || "pending"}
                </span>
              </div>
              <h4 className="complaintTitle">{c.title || "Complaint"}</h4>
              <p className="complaintBody">{c.description || "No description provided."}</p>
              <div className="complaintMeta">
                <span>Tenant: {c.tenant_name || "N/A"}</span>
                <span>Room: {c.room_number || "-"}</span>
                {c.created_at && (
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Complaints;
