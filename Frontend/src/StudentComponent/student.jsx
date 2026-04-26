import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "./student.module.css";
import { useTenantPhone } from "./useTenantPhone";
import { tenantAuthFetch } from "../utils/tenantAuthFetch";
import { API_BASE_URL } from "../utils/apiConfig";

function StudentHome() {
  const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";
  const tenantPhone = useTenantPhone();
  const [searchParams] = useSearchParams();
  const verificationToken = String(searchParams.get("token") || "").trim();
  const hasVerificationToken = Boolean(verificationToken);

  const {
    studentHome,
    studentMain,
    aadhaarCard,
    aadhaarHeader,
    aadhaarTitle,
    aadhaarSubTitle,
    aadhaarForm,
    verificationColumns,
    documentPanel,
    detailsPanel,
    documentSectionTitle,
    uploadCard,
    uploadCardHeader,
    uploadPreview,
    uploadPreviewImage,
    uploadPreviewPlaceholder,
    uploadActions,
    fieldError,
    verificationMetaGrid,
    verificationMetaCard,
    verificationMetaLabel,
    verificationMetaValue,
    formSectionTitle,
    uploadHint,
    line,
    labelPart,
    inputField,
    fieldValue,
    submitButton,
    formMessage,
    formMessageError,
    formMessageSuccess,
    tenantBack,
    tenantBakckContainer,
  } = styles;

  const [tenantData, setTenantData] = useState({
    fullName: "",
    hostel_name: "",
    phone_number: "",
    room_number: "",
    room_type: "",
    status: "",
    aadhaar_number: "",
    aadhaarImage: null,
    profileImage: null,
  });

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingRent, setLoadingRent] = useState(false);
  const [rentData, setRentData] = useState({dueAmount: 0,dueDate: "",status: "",});
  const [rentError, setRentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payingRent, setPayingRent] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [cashfreeMode, setCashfreeMode] = useState("sandbox");
  const [lastOrderId, setLastOrderId] = useState("");

  
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [aadhaarPreview, setAadhaarPreview] = useState("");
  const [profilePreview, setProfilePreview] = useState("");

  const validPhone = /^[6-9]\d{9}$/.test(tenantData.phone_number);
  const validAadhaar = /^\d{12}$/.test(tenantData.aadhaar_number);
  const dueAmountNumber = Number(rentData.dueAmount) || 0;
  const hasPendingDue = dueAmountNumber > 0 && rentData.status !== "paid";

  useEffect(() => {
    return () => {
      if (aadhaarPreview) {
        URL.revokeObjectURL(aadhaarPreview);
      }
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [aadhaarPreview, profilePreview]);

  function toDisplayPhone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");
    if (digits.length < 10) {
      return "";
    }
    return digits.slice(-10);
  }

  
  const identityLocked = true;

  useEffect(() => {
    if (hasVerificationToken) {
      return;
    }

    if (tenantPhone) {
      setTenantData((prev) => ({
        ...prev,
        phone_number: tenantPhone,
      }));
    } else {
      setTenantData((prev) => ({
        ...prev,
        phone_number: "",
      }));
    }
  }, [tenantPhone, hasVerificationToken]);

  
  useEffect(() => {
    if (!hasVerificationToken && !validPhone) {
      setTenantData((prev) => ({
        ...prev,
        fullName: "",
        hostel_name: "",
        phone_number: "",
        room_number: "",
        room_type: "",
        status: "",
        aadhaar_number: "",
      }));
      return;
    }

    async function fetchTenantDetails() {
      setLoadingDetails(true);
      setMessage("");
      setIsError(false);

      try {
        const response = hasVerificationToken
          ? await fetch(
              `${API_BASE_URL}/tenant/verify/details/?token=${encodeURIComponent(verificationToken)}`,
              {
                method: "GET",
              }
            )
          : await tenantAuthFetch(
              `${API_BASE_URL}/tenant/details/${tenantData.phone_number}/`,
              { method: "GET" }
            );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Unable to load tenant details.");
          setIsError(true);
          return;
        }

        setTenantData((prev) => ({
          ...prev,
          fullName: data.name || "",
          hostel_name: data.hostel_name || "",
          phone_number: toDisplayPhone(data.phone_number),
          room_number: data.room_number || "",
          room_type: data.room_type || "",
          status: data.status || "",
          aadhaar_number: data.aadhaar_number || "",
        }));
      } catch {
        setMessage("Server error while loading tenant details.");
        setIsError(true);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchTenantDetails();
  }, [tenantData.phone_number, validPhone, hasVerificationToken, verificationToken]);

 
  useEffect(() => {
    if (!hasVerificationToken && !validPhone) {
      setRentError("");
      setRentData((prev) => ({
        ...prev,
        status: "",
        dueAmount: 0,
      }));
      return;
    }

    async function fetchRentDetails() {
      setLoadingRent(true);
      setRentError("");

      try {
        const response = hasVerificationToken
          ? await fetch(
              `${API_BASE_URL}/tenant/verify/rent/?token=${encodeURIComponent(verificationToken)}`,
              { method: "GET" }
            )
          : await tenantAuthFetch(
              `${API_BASE_URL}/tenant/${tenantData.phone_number}/rent/`,
              { method: "GET" }
            );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load rent details.");
        }

        setRentData({
          dueAmount: data.due_amount ?? 0,
          dueDate: data.due_date ?? "",
          status: data.status ?? "",
        });
      } catch (error) {
        setRentError(error.message || "Unable to load rent details.");
      } finally {
        setLoadingRent(false);
      }
    }

    fetchRentDetails();
  }, [tenantData.phone_number, validPhone, hasVerificationToken, verificationToken]);

 
  function handleChange(event) {
    const { name, value, files } = event.target;

    setMessage("");
    setIsError(false);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    if (name === "aadhaarImage" || name === "profileImage") {
      const file = files?.[0] || null;
      const previewSetter =
        name === "aadhaarImage" ? setAadhaarPreview : setProfilePreview;
      const currentPreview =
        name === "aadhaarImage" ? aadhaarPreview : profilePreview;

      if (!file) {
        if (currentPreview) {
          URL.revokeObjectURL(currentPreview);
        }
        previewSetter("");
        setTenantData((prev) => ({
          ...prev,
          [name]: null,
        }));
        return;
      }

      if (!file.type.startsWith("image/")) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "Please upload an image file only.",
        }));
        event.target.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "Image size must be under 5 MB.",
        }));
        event.target.value = "";
        return;
      }

      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }
      previewSetter(URL.createObjectURL(file));
      setTenantData((prev) => ({
        ...prev,
        [name]: file,
      }));
      return;
    }

    if (name === "paymentMode") {
      setPaymentMode(value);
      return;
    }

    if (name === "fullName") {
      if (identityLocked) return;
      setTenantData((prev) => ({
        ...prev,
        fullName: value,
      }));
      return;
    }

    if (name === "phone_number") {
      if (identityLocked) return;
      setTenantData((prev) => ({
        ...prev,
        phone_number: value.replace(/\D/g, "").slice(0, 10),
      }));
      setLastOrderId("");
      return;
    }

    if (name === "aadhaar_number") {
      setTenantData((prev) => ({
        ...prev,
        aadhaar_number: value.replace(/\D/g, "").slice(0, 12),
      }));
      return;
    }

    setTenantData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function formReadyForPayment() {
    return (
      tenantData.fullName.trim() &&
      validPhone &&
      validAadhaar &&
      tenantData.aadhaarImage &&
      tenantData.profileImage
    );
  }

  function validateVerificationForm() {
    const nextErrors = {};

    if (!tenantData.fullName.trim()) {
      nextErrors.fullName = identityLocked
        ? "Full name is missing in hostel records."
        : "Full name is required.";
    }

    if (!validPhone) {
      nextErrors.phone_number = identityLocked
        ? "Mobile number is missing in hostel records."
        : "Enter a valid 10-digit mobile number.";
    }

    if (!validAadhaar) {
      nextErrors.aadhaar_number = "Aadhaar number must be exactly 12 digits.";
    }

    if (!tenantData.aadhaarImage) {
      nextErrors.aadhaarImage = "Please upload Aadhaar image.";
    }

    if (!tenantData.profileImage) {
      nextErrors.profileImage = "Please upload profile image.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!validateVerificationForm()) {
      setMessage("Please fix the highlighted fields and try again.");
      setIsError(true);
      return;
    }

    const payload = new FormData();
    if (hasVerificationToken) {
      payload.append("token", verificationToken);
    } else {
      payload.append("phone_number", tenantData.phone_number);
    }
    payload.append("name", tenantData.fullName.trim());
    payload.append("aadhaar_number", tenantData.aadhaar_number);
    payload.append("aadhaar_image", tenantData.aadhaarImage);
    payload.append("profile_image", tenantData.profileImage);

    setSubmitting(true);

    try {
      const response = hasVerificationToken
        ? await fetch(`${API_BASE_URL}/tenant/verify/submit/`, {
            method: "POST",
            body: payload,
          })
        : await tenantAuthFetch(`${API_BASE_URL}/tenant/verify/submit/`, {
            method: "POST",
            body: payload,
          });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Verification failed.");
        setIsError(true);
        return;
      }

      setMessage(data.message || "Verification completed successfully.");
      setIsError(false);
      setTenantData((prev) => ({ ...prev, status: "verified" }));
    } catch {
      setMessage("Server error while submitting verification.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }


 function loadCashfree() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector("script[data-cashfree-sdk]");
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = CASHFREE_SCRIPT_URL;
    script.async = true;
    script.setAttribute("data-cashfree-sdk", "true");

    script.onload = () => resolve(true);
    script.onerror = () =>
      reject(new Error("Cashfree SDK failed to load. Please retry."));

    document.body.appendChild(script);
  });
}

 function getCashfreeInstance(mode = cashfreeMode) {
  if (!window.Cashfree) {
    throw new Error("Cashfree SDK is not loaded yet.");
  }

  return window.Cashfree({
    mode: mode === "production" ? "production" : "sandbox",
  });
}

 async function startCashfreeCheckout(sessionId, mode = cashfreeMode) {
  const cashfree = getCashfreeInstance(mode);

  return cashfree.checkout({
    paymentSessionId: sessionId,
    redirectTarget: "_modal", 
  });
}


  async function verifyPayment(orderIdOverride) {
    const orderId = orderIdOverride || lastOrderId;

    if (!orderId) {
      setRentError("No order to verify yet. Start a payment first.");
      return;
    }

    try {
      const res = hasVerificationToken
        ? await fetch(`${API_BASE_URL}/tenant/verify/rent/verify/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: verificationToken,
              order_id: orderId,
            }),
          })
        : await tenantAuthFetch(
            `${API_BASE_URL}/tenant/${tenantData.phone_number}/rent/verify/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order_id: orderId }),
            }
          );

      const data = await res.json();

      if (!res.ok) {
        setRentData((prev) => ({
          ...prev,
          status: data.status || "pending",
        }));
        throw new Error(data.error || "Payment not completed yet.");
      }

      setRentError("");
      setRentData((prev) => ({
        ...prev,
        status: data.status || "paid",
      }));

      setMessage(data.message || "Payment successful.");
      setIsError(false);

      if (data.order_status) {
        setMessage(
          `${data.message || "Payment checked."} Status: ${data.order_status}`
        );
      }
    } catch (err) {
      setRentData((prev) => ({
        ...prev,
        status: "pending",
      }));
      setRentError(err.message || "Unable to verify payment.");
    }
  }


  async function handlePayRent() {
  setRentError("");
  setMessage("");
  setIsError(false);

  if (paymentMode !== "upi") {
    setRentError("Switch Payment Mode to UPI to pay online.");
    return;
  }

  if (!formReadyForPayment()) {
    setRentError("Fill all fields and upload images before paying.");
    return;
  }

  if ((Number(rentData.dueAmount) || 0) <= 0) {
    setRentError("No pending rent dues.");
    return;
  }

  setPayingRent(true);

  try {
    const response = hasVerificationToken
      ? await fetch(`${API_BASE_URL}/tenant/verify/rent/order/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: verificationToken }),
        })
      : await tenantAuthFetch(
          `${API_BASE_URL}/tenant/${tenantData.phone_number}/rent/order/`,
          {
            method: "POST",
          }
        );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to initiate payment.");
    }

    const sessionId = data.payment_session_id || data.paymentSessionId;
    const mode = data.cashfree_mode || "sandbox";
    const orderId = data.order_id || "";

    if (!sessionId) {
      throw new Error("Payment session not received from server.");
    }

    setLastOrderId(orderId);
    setCashfreeMode(mode);

    await loadCashfree();

    await startCashfreeCheckout(sessionId, mode);

    setMessage("Checking payment status...");

    setTimeout(() => {
      verifyPayment(orderId);
    }, 3000);
  } catch (error) {
    setRentError(error.message || "Unable to initiate payment.");
  } finally {
    setPayingRent(false);
  }
}

  const disableSubmit = submitting || tenantData.status === "verified";
  const showPaymentCard = paymentMode === "upi";
  const showPayment = showPaymentCard && hasPendingDue;
  const showNoDueMessage =
    showPaymentCard &&
    !loadingRent &&
    !hasPendingDue;

  return (
    <div className={studentHome}>
      <div className={studentMain}>
        <div className={tenantBakckContainer}>
          <Link
            to={tenantPhone ? `/tenant?phone=${tenantPhone}` : "/tenant"}
            className={tenantBack}
          >
            Tenant Dashboard
          </Link>
        </div>

        <div className={aadhaarCard}>
          <div className={aadhaarHeader}>
            <h3 className={aadhaarTitle}>Tenant Verification</h3>
            <p className={aadhaarSubTitle}>
              Complete your onboarding details to activate hostel access.
            </p>
            {identityLocked && (
              <p className={aadhaarSubTitle} style={{ color: "#1e3a8a" }}>
                Name, mobile, hostel and room are pre-filled from our records and cannot be changed here.
              </p>
            )}
            <div className={verificationMetaGrid}>
              <div className={verificationMetaCard}>
                <span className={verificationMetaLabel}>Hostel</span>
                <span className={verificationMetaValue}>
                  {tenantData.hostel_name || "Pending"}
                </span>
              </div>
              <div className={verificationMetaCard}>
                <span className={verificationMetaLabel}>Room</span>
                <span className={verificationMetaValue}>
                  {tenantData.room_number
                    ? `${tenantData.room_number} (${tenantData.room_type})`
                    : "Pending"}
                </span>
              </div>
              <div className={verificationMetaCard}>
                <span className={verificationMetaLabel}>Status</span>
                <span className={verificationMetaValue}>
                  {tenantData.status || "Pending"}
                </span>
              </div>
            </div>
          </div>

          {loadingDetails ? (
            <p className={formMessage}>Loading tenant details...</p>
          ) : (
            <form className={aadhaarForm} onSubmit={handleSubmit}>
              <div className={verificationColumns}>
                <div className={documentPanel}>
                  <p className={documentSectionTitle}>Document Uploads</p>

                  <div className={uploadCard}>
                    <div className={uploadCardHeader}>
                      <label htmlFor="aadhaarImage">Aadhaar Card</label>
                      <p className={uploadHint}>
                        Upload a clear image of the front side of the Aadhaar card.
                      </p>
                    </div>
                    <div className={uploadPreview}>
                      {aadhaarPreview ? (
                        <img
                          src={aadhaarPreview}
                          alt="Aadhaar preview"
                          className={uploadPreviewImage}
                        />
                      ) : (
                        <div className={uploadPreviewPlaceholder}>
                          Aadhaar preview will appear here
                        </div>
                      )}
                    </div>
                    <div className={uploadActions}>
                      <input
                        type="file"
                        id="aadhaarImage"
                        name="aadhaarImage"
                        className={inputField}
                        accept="image/*"
                        onChange={handleChange}
                        disabled={disableSubmit}
                      />
                    </div>
                    {fieldErrors.aadhaarImage && (
                      <p className={fieldError}>{fieldErrors.aadhaarImage}</p>
                    )}
                  </div>

                  <div className={uploadCard}>
                    <div className={uploadCardHeader}>
                      <label htmlFor="profileImage">Profile Photo</label>
                      <p className={uploadHint}>
                        Use a recent passport-style photo with a visible face.
                      </p>
                    </div>
                    <div className={uploadPreview}>
                      {profilePreview ? (
                        <img
                          src={profilePreview}
                          alt="Profile preview"
                          className={uploadPreviewImage}
                        />
                      ) : (
                        <div className={uploadPreviewPlaceholder}>
                          Profile preview will appear here
                        </div>
                      )}
                    </div>
                    <div className={uploadActions}>
                      <input
                        type="file"
                        id="profileImage"
                        name="profileImage"
                        className={inputField}
                        accept="image/*"
                        onChange={handleChange}
                        disabled={disableSubmit}
                      />
                    </div>
                    {fieldErrors.profileImage && (
                      <p className={fieldError}>{fieldErrors.profileImage}</p>
                    )}
                  </div>
                </div>

                <div className={detailsPanel}>
                  <p className={formSectionTitle}>Tenant Details</p>
                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="fullName">Full Name</label>
                    </div>
                    <div style={{ width: "100%" }}>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        className={inputField}
                        placeholder="Enter full name"
                        value={tenantData.fullName}
                        onChange={handleChange}
                        disabled={disableSubmit || identityLocked}
                        readOnly={identityLocked}
                      />
                      {fieldErrors.fullName && (
                        <p className={fieldError}>{fieldErrors.fullName}</p>
                      )}
                    </div>
                  </div>

                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="phone_number">Mobile Number</label>
                    </div>
                    <div style={{ width: "100%" }}>
                      <input
                        type="text"
                        id="phone_number"
                        name="phone_number"
                        className={inputField}
                        placeholder="Enter 10 digit mobile number"
                        maxLength={10}
                        value={tenantData.phone_number}
                        onChange={handleChange}
                        disabled={disableSubmit || identityLocked}
                        readOnly={identityLocked}
                      />
                      {fieldErrors.phone_number && (
                        <p className={fieldError}>{fieldErrors.phone_number}</p>
                      )}
                    </div>
                  </div>

                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="hostelName">Hostel</label>
                    </div>
                    <p id="hostelName" className={fieldValue}>
                      {tenantData.hostel_name || "N/A"}
                    </p>
                  </div>

                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="roomDetails">Room</label>
                    </div>
                    <p id="roomDetails" className={fieldValue}>
                      {tenantData.room_number
                        ? `${tenantData.room_number} (${tenantData.room_type})`
                        : "N/A"}
                    </p>
                  </div>

                  <p className={formSectionTitle}>Verification Details</p>
                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="aadhaar_number">Aadhaar Number</label>
                    </div>
                    <div style={{ width: "100%" }}>
                      <input
                        type="text"
                        id="aadhaar_number"
                        name="aadhaar_number"
                        className={inputField}
                        placeholder="Enter 12 digit Aadhaar number"
                        maxLength={12}
                        value={tenantData.aadhaar_number}
                        onChange={handleChange}
                        disabled={disableSubmit}
                      />
                      {fieldErrors.aadhaar_number && (
                        <p className={fieldError}>{fieldErrors.aadhaar_number}</p>
                      )}
                    </div>
                  </div>

                  <p className={formSectionTitle}>Payment Preference</p>
                  <div className={line}>
                    <div className={labelPart}>
                      <label htmlFor="paymentMode">Payment Mode</label>
                    </div>
                    <select
                      id="paymentMode"
                      name="paymentMode"
                      className={inputField}
                      value={paymentMode}
                      onChange={handleChange}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>

                  {showPaymentCard && (
                    <div className={`${styles.payment} ${styles.paymentCard}`}>
                      <p className={styles.paymentTitle}>Rent Payment</p>

                      <div className={styles.paymentActions}>
                        <p className={styles.paymentAmount}>
                          {loadingRent
                            ? "Loading..."
                            : hasPendingDue
                            ? `Rs. ${rentData.dueAmount ?? 0}`
                            : "No Due"}
                        </p>

                        {hasPendingDue && (
                          <button
                            type="button"
                            className={submitButton}
                            onClick={handlePayRent}
                            disabled={
                              loadingRent ||
                              payingRent ||
                              rentData.status === "paid" ||
                              !hasPendingDue ||
                              !formReadyForPayment()
                            }
                          >
                            {payingRent ? "Processing..." : "Pay Now"}
                          </button>
                        )}
                      </div>

                      <div className={styles.paymentStatusRow}>
                        <span className={styles.paymentStatusChip}>
                          Status: {loadingRent ? "Loading" : rentData.status || "Pending"}
                        </span>
                        {hasPendingDue && !formReadyForPayment() && (
                          <span className={styles.paymentStatusChip}>
                            Complete verification details to pay online
                          </span>
                        )}
                        {showNoDueMessage && (
                          <span className={styles.paymentStatusChip}>
                            There is no pending rent to pay right now.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {rentError && (
                    <p className={`${formMessage} ${formMessageError}`}>{rentError}</p>
                  )}

                  {message && (
                    <p
                      className={`${formMessage} ${
                        isError ? formMessageError : formMessageSuccess
                      }`}
                    >
                      {message}
                    </p>
                  )}

                  <button type="submit" className={submitButton} disabled={disableSubmit}>
                    {submitting
                      ? "Submitting..."
                      : tenantData.status === "verified"
                      ? "Already Verified"
                      : "Submit Verification"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentHome;
