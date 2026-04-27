import { useEffect, useState } from "react";
import Loader from "../Loader";
import { authFetch } from "../utils/authFetch";

function TotalTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingTenantId, setDeletingTenantId] = useState(null);
  const [error, setError] = useState("");

  async function fetchTenants() {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/tenants/", {
        method: "GET",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.message || "Unable to load tenants");
        setTenants([]);
      } else {
        setTenants(data.tenants || []);
      }
    } catch {
      setError("Server error");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTenant(tenantId) {
    if (!window.confirm("Delete this tenant permanently?")) {
      return;
    }

    setDeletingTenantId(tenantId);
    setError("");

    try {
      const response = await authFetch(`/tenant/${tenantId}/`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = data.error || data.message || response.statusText || "Unable to delete tenant";
        console.error("Tenant delete failed", response.status, errorMessage, data);
        setError(`Delete failed (${response.status}): ${errorMessage}`);
      } else {
        setTenants((current) => current.filter((tenant) => tenant.id !== tenantId));
      }
    } catch (error) {
      console.error("Tenant delete error", error);
      setError("Server error while deleting tenant");
    } finally {
      setDeletingTenantId(null);
    }
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  return (
    <div className="tenantsPane">
      <div className="pendingHeader">
        <h3>Total Tenants</h3>
        <button className="availabilityButton" onClick={fetchTenants} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="vacancyLoaderWrap">
          <Loader />
        </div>
      )}

      {!loading && error && <p className="newJoineeStatus error">{error}</p>}

      {!loading && !error && tenants.length === 0 && (
        <p className="vacancyEmpty">No tenants yet.</p>
      )}

      {!loading && !error && tenants.length > 0 && (
        <div className="tenantsGrid">
          {tenants.map((t) => {
            const initial = (t.name || "?").trim().charAt(0).toUpperCase();
            const imgSrc = t.profile_image || "";
            return (
              <div key={t.id} className="tenantCard">
                <div className="tenantTop">
                  {imgSrc ? (
                    <img src={imgSrc} alt={t.name} className="tenantAvatar" />
                  ) : (
                    <div className="tenantAvatar fallback">{initial}</div>
                  )}
                  <div className="tenantTitle">
                    <h4 className="tenantName">{t.name}</h4>
                    <p className="tenantSub">
                      Room {t.room_number} · {t.room_type}
                    </p>
                  </div>
                  <span className={`pendingStatus ${t.status}`}>{t.status}</span>
                   <button
                    type="button"
                    className="deleteTenantButton"
                    onClick={() => deleteTenant(t.id)}
                    disabled={deletingTenantId === t.id}
                  >
                    {deletingTenantId === t.id ? "Deleting..." : "Delete"}
                  </button>
                </div>

                <div className="tenantMeta">
                  <div className="pendingMetaItem">
                    <span className="pendingLabel">Phone</span>
                    <span className="pendingValue">{t.phone_number}</span>
                  </div>
                  {t.aadhaar_number && (
                    <div className="pendingMetaItem">
                      <span className="pendingLabel">Aadhaar</span>
                      <span className="pendingValue">{t.aadhaar_number}</span>
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

export default TotalTenants;
