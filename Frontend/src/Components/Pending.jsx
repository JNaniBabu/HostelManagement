import { useEffect, useState } from "react";
import Loader from "../Loader";
import { authFetch, getCookie } from "../utils/authFetch";

function Pending() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchPending() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("http://localhost:8000/pending-verifications/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || "Unable to load pending verifications");
        setPending([]);
      } else {
        setPending(data.pending || []);
      }
    } catch {
      setError("Server error");
      setPending([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div className="pendingPane">
      <div className="pendingHeader">
        <h3>Pending Verification</h3>
        <button className="availabilityButton" onClick={fetchPending} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="vacancyLoaderWrap">
          <Loader />
        </div>
      )}

      {!loading && error && <p className="newJoineeStatus error">{error}</p>}

      {!loading && !error && pending.length === 0 && (
        <p className="vacancyEmpty">No pending verifications.</p>
      )}

      {!loading && !error && pending.length > 0 && (
        <div className="pendingList">
          {pending.map((item) => {
            const initial = (item.name || "?").trim().charAt(0).toUpperCase();
            return (
              <div key={item.id} className="pendingCard">
                <div className="pendingCardTop">
                  <div className="pendingTitle">
                  
                    <div className="pendingTitleText">
                      <h4 className="pendingName">{item.name}</h4>
                      <div className="pendingSub">
                        <span className="pendingBadge">{item.room_type}</span>
                        <span className="pendingRoom">Room {item.room_number}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`pendingStatus ${item.status}`}>{item.status}</span>
                </div>

                <div className="pendingMeta">
                  <div className="pendingMetaItem">
                    <span className="pendingLabel">Phone</span>
                    <span className="pendingValue">{item.phone_number}</span>
                  </div>
                  {item.created_at && (
                    <div className="pendingMetaItem">
                      <span className="pendingLabel">Added</span>
                      <span className="pendingValue">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Pending;
