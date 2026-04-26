import { useEffect, useState } from "react";
import styles from "./student.module.css";
import { FaArrowLeft } from "react-icons/fa";
import { Link } from "react-router-dom";
import { FaBuilding, FaIdCard, FaMapMarkerAlt, FaPhoneAlt, FaUserGraduate } from "react-icons/fa";
import { useTenantPhone } from "./useTenantPhone";
import { tenantAuthFetch } from "../utils/tenantAuthFetch";
import { API_BASE_URL } from "../utils/apiConfig";

function StudentProfile() {
  const tenantPhone = useTenantPhone();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenantPhone) {
      setError("Please Login");
      setProfile(null);
      return;
    }

    async function fetchProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await tenantAuthFetch(
          `${API_BASE_URL}/tenant/${tenantPhone}/profile/`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load profile details.");
        }

        setProfile(data);
      } catch (requestError) {
        setError(requestError.message || "Unable to load profile details.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [tenantPhone]);

  const {
    profile: profileClass,
    back,
    backText,
    profileShell,
    profileHero,
    profileHeroTitle,
    profileHeroSubTitle,
    profileGrid,
    profileCard,
    profileCardTitle,
    profileDataRow,
    profileDataLabel,
    profileDataValue,
    formMessage,
    formMessageError,
  } = styles;

  return (
    <div className={profileClass}>
      <Link className={back} to={tenantPhone ? `/tenant?phone=${tenantPhone}` : "/tenant"}>
        <FaArrowLeft />
        <span className={backText}>Back</span>
      </Link>

      <div className={profileShell}>
        <div className={profileHero}>
          <h3 className={profileHeroTitle}>Tenant Profile</h3>
          <p className={profileHeroSubTitle}>
            Keep your details up to date for smooth hostel communication.
          </p>
        </div>

        {loading && <p className={profileDataValue}>Loading profile...</p>}

        {error && <p className={`${formMessage} ${formMessageError}`}>{error}</p>}

        {!loading && !error && profile && (
        <div className={profileGrid}>
          <div className={profileCard}>
            <h4 className={profileCardTitle}>
              <FaUserGraduate /> Basic Details
            </h4>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Name</p>
              <p className={profileDataValue}>{profile.name || "N/A"}</p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Student ID</p>
              <p className={profileDataValue}>{profile.student_id || "N/A"}</p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Aadhaar Status</p>
              <p className={profileDataValue}>{profile.aadhaar_status || "Pending"}</p>
            </div>
          </div>

          <div className={profileCard}>
            <h4 className={profileCardTitle}>
              <FaBuilding /> Hostel Details
            </h4>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Hostel</p>
              <p className={profileDataValue}>{profile.hostel_name || "N/A"}</p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Room</p>
              <p className={profileDataValue}>
                {profile.room_number
                  ? `${profile.room_number} (${profile.room_type || "N/A"})`
                  : "N/A"}
              </p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Rent Plan</p>
              <p className={profileDataValue}>{profile.rent_plan || "N/A"}</p>
            </div>
          </div>

          <div className={profileCard}>
            <h4 className={profileCardTitle}>
              <FaIdCard /> Contact Details
            </h4>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>
                <FaPhoneAlt /> Mobile
              </p>
              <p className={profileDataValue}>
                {profile.display_phone ? `+91 ${profile.display_phone}` : "N/A"}
              </p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>
                <FaMapMarkerAlt /> City
              </p>
              <p className={profileDataValue}>{profile.city || "N/A"}</p>
            </div>
            <div className={profileDataRow}>
              <p className={profileDataLabel}>Emergency Contact</p>
              <p className={profileDataValue}>
                {profile.emergency_contact || "Not Provided"}
              </p>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default StudentProfile;
