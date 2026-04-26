import { useEffect, useState } from "react";
import Loader from "../Loader";
import { authFetch, getCookie } from "../utils/authFetch";

function Upcoming() {
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchUpcoming() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("http://localhost:8000/upcoming-fees/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || "Unable to load upcoming fees");
        setUpcoming([]);
      } else {
        setUpcoming(data.upcoming || []);
      }
    } catch {
      setError("Server error");
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUpcoming();
  }, []);

  return (
    <div className="upcomingPane">
      <div className="pendingHeader">
        <h3>Upcoming Fees (next 7 days)</h3>
        <button className="availabilityButton" onClick={fetchUpcoming} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="vacancyLoaderWrap">
          <Loader />
        </div>
      )}

      {!loading && error && <p className="newJoineeStatus error">{error}</p>}

      {!loading && !error && upcoming.length === 0 && (
        <p className="vacancyEmpty">No fees due in the next week.</p>
      )}

      {!loading && !error && upcoming.length > 0 && (
        <div className="upcomingList">
          {upcoming.map((fee) => {
            const dueDate = new Date(fee.due_date);
            const daysLeft = Math.max(
              0,
              Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
            );
            return (
              <div key={fee.id} className="upcomingCard">
                <div className="upcomingTop">
                  <div>
                    <h4 className="upcomingName">{fee["tenant__name"]}</h4>
                    <p className="upcomingSub">
                      Room {fee["tenant__room_number"]} · {fee["tenant__room_type"]}
                    </p>
                  </div>
                  <div className="upcomingTopRight">
                    <span className="upcomingAmount">₹ {Number(fee.amount).toLocaleString()}</span>
                    <span className="upcomingDue">Due in {daysLeft} day{daysLeft === 1 ? "" : "s"}</span>
                  </div>
                </div>

                <div className="upcomingMeta">
                  <div className="pendingMetaItem">
                    <span className="pendingLabel">Due Date</span>
                    <span className="pendingValue">{dueDate.toLocaleDateString()}</span>
                  </div>
                  <div className="pendingMetaItem">
                    <span className="pendingLabel">Phone</span>
                    <span className="pendingValue">{fee["tenant__phone_number"]}</span>
                  </div>
                  <div className="pendingMetaItem">
                    <span className="pendingLabel">Status</span>
                    <span className={`pendingStatus ${fee.status}`}>{fee.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Upcoming;
