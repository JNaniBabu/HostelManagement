import styles from "./student.module.css";
import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { persistTenantPhone, useTenantPhone } from "./useTenantPhone";
import { tenantAuthFetch } from "../utils/tenantAuthFetch";
import { API_BASE_URL } from "../utils/apiConfig";

function TenantNabar() {
  const {
    studentNavBar,
    studentNavIdentity,
    studentNavTitle,
    studentNavSubtitle,
    tenantNavActions,
    tenantLoginButton,
    tenantLoginButtonActive,
    tenantLoginOverlay,
    tenantLoginModal,
    tenantLoginHeader,
    tenantLoginTitle,
    tenantLoginSubTitle,
    tenantLoginForm,
    tenantLoginActions,
    imagesBlock,
    avatarText,
    inputField,
    submitButton,
    formMessage,
    formMessageError,
    formMessageSuccess,
  } = styles;

  const tenantPhone = useTenantPhone();
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authForm, setAuthForm] = useState({
    phone: "",
    password: "",
    oldPassword: "1234567",
    newPassword: "",
  });

  function normalizePhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.slice(0, 10);
  }

  useEffect(() => {
    if (tenantPhone && !authForm.phone) {
      setAuthForm((prev) => ({
        ...prev,
        phone: tenantPhone,
      }));
    }
  }, [tenantPhone, authForm.phone]);

  useEffect(() => {
    if (!tenantPhone) {
      setProfile(null);
      return;
    }

    async function fetchProfile() {
      try {
        const response = await tenantAuthFetch(
          `${API_BASE_URL}/tenant/${tenantPhone}/profile/`
        );
        if (!response.ok) {
          if (response.status === 401) {
            setIsAuthenticated(false);
          }
          setProfile(null);
          return;
        }
        const data = await response.json();
        setProfile(data);
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
        setProfile(null);
      }
    }

    fetchProfile();
  }, [tenantPhone]);

  const avatar = (profile?.name || "Tenant").trim().charAt(0).toUpperCase();

  function onFormChange(event) {
    const { name, value } = event.target;
    setAuthMessage("");
    setAuthError(false);
    setAuthForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? normalizePhone(value) : value,
    }));
  }

  async function handleTenantLogin(event) {
    event.preventDefault();
    setAuthMessage("");
    setAuthError(false);

    const phoneValue = normalizePhone(authForm.phone || tenantPhone);
    if (!phoneValue) {
      setAuthMessage("Valid tenant mobile number is required.");
      setAuthError(true);
      return;
    }

    if (requiresPasswordChange) {
      if (!authForm.newPassword.trim()) {
        setAuthMessage("New password is required.");
        setAuthError(true);
        return;
      }
    } else if (!authForm.password.trim()) {
      setAuthMessage("Password is required.");
      setAuthError(true);
      return;
    }

    const payload = requiresPasswordChange
      ? {
          phone_number: phoneValue,
          old_password: authForm.oldPassword,
          new_password: authForm.newPassword,
        }
      : {
          phone_number: phoneValue,
          password: authForm.password,
        };

    setAuthLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tenant/login/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to login.");
      }

      if (data.requires_password_change) {
        persistTenantPhone(phoneValue);
        setRequiresPasswordChange(true);
        setAuthMessage(
          data.message ||
            "First login detected. Use old password 1234567 and set new password."
        );
        setAuthError(false);
        setAuthForm((prev) => ({
          ...prev,
          oldPassword: data.default_old_password || "1234567",
          password: "",
        }));
        return;
      }

      setIsAuthenticated(true);
      setRequiresPasswordChange(false);
      persistTenantPhone(phoneValue);
      if (data.tenant) {
        setProfile(data.tenant);
      }
      setAuthForm((prev) => ({
        ...prev,
        password: "",
        oldPassword: "1234567",
        newPassword: "",
      }));
      setAuthMessage(data.message || "Login successful.");
      setAuthError(false);
      setTimeout(() => {
        setShowLogin(false);
      }, 800);
    } catch (requestError) {
      setAuthMessage(requestError.message || "Unable to login.");
      setAuthError(true);
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <>
      <div className={studentNavBar}>
        <div className={studentNavIdentity}>
          <h3 className={studentNavTitle}>Tenant Portal</h3>
          <p className={studentNavSubtitle}>
            {profile?.name
              ? `${profile.name} - ${profile.room_number || "Room N/A"}`
              : "Manage profile, rent, and updates"}
          </p>
        </div>

        <div className={tenantNavActions}>
          <button
            type="button"
            className={`${tenantLoginButton} ${
              isAuthenticated ? tenantLoginButtonActive : ""
            }`}
            onClick={() => {
              setShowLogin(true);
              setAuthMessage("");
              setAuthError(false);
            }}
          >
            {isAuthenticated ? "Logged In" : "Tenant Login"}
          </button>

          <Link
            className={imagesBlock}
            to={tenantPhone ? `/tenant/profile?phone=${tenantPhone}` : "/tenant/profile"}
          >
            <span className={avatarText}>{avatar}</span>
          </Link>
        </div>
      </div>

      {showLogin && (
        <div className={tenantLoginOverlay}>
          <div className={tenantLoginModal}>
            <div className={tenantLoginHeader}>
              <h4 className={tenantLoginTitle}>Tenant Authentication</h4>
              <p className={tenantLoginSubTitle}>
                First login uses default password <strong>1234567</strong>.
              </p>
            </div>

            <form className={tenantLoginForm} onSubmit={handleTenantLogin}>
              <input
                type="text"
                name="phone"
                className={inputField}
                maxLength={10}
                placeholder="Mobile Number"
                value={authForm.phone}
                onChange={onFormChange}
              />

              {!requiresPasswordChange ? (
                <input
                  type="password"
                  name="password"
                  className={inputField}
                  placeholder="Password"
                  value={authForm.password}
                  onChange={onFormChange}
                />
              ) : (
                <>
                  <input
                    type="text"
                    name="oldPassword"
                    className={inputField}
                    value={authForm.oldPassword}
                    readOnly
                  />
                  <input
                    type="password"
                    name="newPassword"
                    className={inputField}
                    placeholder="New Password"
                    value={authForm.newPassword}
                    onChange={onFormChange}
                  />
                </>
              )}

              {authMessage && (
                <p
                  className={`${formMessage} ${
                    authError ? formMessageError : formMessageSuccess
                  }`}
                >
                  {authMessage}
                </p>
              )}

              <div className={tenantLoginActions}>
                <button
                  type="button"
                  className={tenantLoginButton}
                  onClick={() => {
                    setShowLogin(false);
                    setAuthMessage("");
                    setAuthError(false);
                  }}
                >
                  Close
                </button>
                <button type="submit" className={submitButton} disabled={authLoading}>
                  {authLoading
                    ? "Please wait..."
                    : requiresPasswordChange
                    ? "Update Password"
                    : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
export default TenantNabar
