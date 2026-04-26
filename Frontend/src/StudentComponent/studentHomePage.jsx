import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./student.module.css";
import { useTenantPhone } from "./useTenantPhone";
import { tenantAuthFetch } from "../utils/tenantAuthFetch";
import { API_BASE_URL } from "../utils/apiConfig";

const CASHFREE_SCRIPT_URL = "https://sdk.cashfree.com/js/v3/cashfree.js";

function formatDate(dateValue) {
  if (!dateValue) {
    return "N/A";
  }
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }
  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getActionEndpoint(phone, actionId) {
  const endpointMap = {
    rent: `/tenant/${phone}/rent/`,
    room: `/tenant/${phone}/room/`,
    rules: `/tenant/${phone}/rules/`,
    menu: `/tenant/${phone}/menu/`,
    complaint: `/tenant/${phone}/complaints/`,
  };
  return endpointMap[actionId];
}

function logTenantSectionData(sectionId, payload) {
  const sectionName = String(sectionId || "").toUpperCase();
 
}

function Homepage() {
  const navigate = useNavigate();
  const tenantPhone = useTenantPhone();

  const {
    Homepage: homepageClass,
    homeHero,
    homeHeroTitle,
    homeHeroSubTitle,
    homeWorkspace,
    homepagesub,
    actionButton,
    actionButtonActive,
    actionTitle,
    actionHint,
    rentButton,
    roomButton,
    rulesButton,
    menuButton,
    complaintButton,
    actionDetailPanel,
    actionDetailHeader,
    actionDetailTitle,
    actionDetailHint,
    actionDetailDescription,
    actionDetailMetaGrid,
    actionDetailMetaCard,
    actionDetailMetaLabel,
    actionDetailMetaValue,
    menuGrid,
    complaintform,
    menuDayCard,
    menuDayTitle,
    menuMeal,
    menuMealLabel,
    menuMealItem,
    rentPane,
    rentSummary,
    actionDetailPrimary,
    inputField,
    formMessage,
    formMessageError,
    formMessageSuccess,
  } = styles;

  const actions = useMemo(
    () => [
      {
        id: "rent",
        title: "Pay Rent",
        hint: "Quick UPI checkout",
        className: rentButton,
        description:
          "Pay your monthly hostel rent and track the latest due amount and status.",
      },
      {
        id: "room",
        title: "Room",
        hint: "View room details",
        className: roomButton,
        description: "Check your room allocation, occupancy, and rent amount.",
      },
      {
        id: "rules",
        title: "Rules",
        hint: "Hostel guidelines",
        className: rulesButton,
        description: "Review hostel discipline and safety guidelines.",
      },
      {
        id: "menu",
        title: "Menu",
        hint: "Today and weekly food",
        className: menuButton,
        description: "Weekly meal plan shared by hostel management.",
      },
      {
        id: "complaint",
        title: "Complaint",
        hint: "Raise a support ticket",
        className: complaintButton,
        description:
          "Raise hostel issues quickly and monitor complaint ticket status.",
      },
    ],
    [rentButton, roomButton, rulesButton, menuButton, complaintButton]
  );

  const [profile, setProfile] = useState(null);
  const [activeActionId, setActiveActionId] = useState("rent");
  const [actionData, setActionData] = useState({});
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [complaintForm, setComplaintForm] = useState({
    category: "room",
    title: "",
    description: "",
  });
  const [complaintMessage, setComplaintMessage] = useState("");
  const [isComplaintError, setIsComplaintError] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [payingRent, setPayingRent] = useState(false);
  const [cashfreeMode, setCashfreeMode] = useState("sandbox");
  const [lastOrderId, setLastOrderId] = useState("");
  const [rentError, setRentError] = useState("");
  const [rentMessage, setRentMessage] = useState("");
  const [isRentError, setIsRentError] = useState(false);

  const activeAction =
    actions.find((action) => action.id === activeActionId) || actions[0];
  const activePayload = actionData[activeActionId] || null;

  useEffect(() => {
    setActionData({});
    setActionError("");
    setComplaintMessage("");
    setIsComplaintError(false);
  }, [tenantPhone]);

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
          return;
        }
        const data = await response.json();
        setProfile(data);
       
      } catch {
        setProfile(null);
      }
    }

    fetchProfile();
  }, [tenantPhone]);

  useEffect(() => {
    if (!tenantPhone) {
      setActionError("Please Login");
      return;
    }

    if (actionData[activeActionId]) {
      return;
    }

    async function fetchActionData() {
      setLoadingAction(true);
      setActionError("");
      try {
        const endpoint = getActionEndpoint(tenantPhone, activeActionId);
        const response = await tenantAuthFetch(`${API_BASE_URL}${endpoint}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load data.");
        }

        logTenantSectionData(activeActionId, data);
        setActionData((prev) => ({
          ...prev,
          [activeActionId]: data,
        }));
      } catch (requestError) {
        setActionError(requestError.message || "Unable to load data.");
      } finally {
        setLoadingAction(false);
      }
    }

    fetchActionData();
  }, [activeActionId, actionData, tenantPhone]);

  async function submitComplaint(event) {
    event.preventDefault();
    setComplaintMessage("");
    setIsComplaintError(false);

    if (!tenantPhone) {
      setComplaintMessage("Please Login");
      setIsComplaintError(true);
      return;
    }

    if (!complaintForm.title.trim()) {
      setComplaintMessage("Complaint title is required.");
      setIsComplaintError(true);
      return;
    }

    setSubmittingComplaint(true);
    try {
      const response = await tenantAuthFetch(
        `${API_BASE_URL}/tenant/${tenantPhone}/complaints/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category: complaintForm.category,
            title: complaintForm.title.trim(),
            description: complaintForm.description.trim(),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to submit complaint.");
      }

      setComplaintMessage(data.message || "Complaint submitted successfully.");
      setIsComplaintError(false);
      setComplaintForm({
        category: "room",
        title: "",
        description: "",
      });

      const refreshResponse = await tenantAuthFetch(
        `${API_BASE_URL}/tenant/${tenantPhone}/complaints/`
      );
      const refreshedData = await refreshResponse.json();
      if (refreshResponse.ok) {
        logTenantSectionData("complaint", refreshedData);
        setActionData((prev) => ({
          ...prev,
          complaint: refreshedData,
        }));
      }
    } catch (requestError) {
      setComplaintMessage(requestError.message || "Unable to submit complaint.");
      setIsComplaintError(true);
    } finally {
      setSubmittingComplaint(false);
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
        existingScript.onerror = () =>
          reject(new Error("Cashfree SDK failed to load. Please retry."));
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
      setIsRentError(true);
      return;
    }

    try {
      const response = await tenantAuthFetch(
        `${API_BASE_URL}/tenant/${tenantPhone}/rent/verify/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Payment not completed yet.");
      }

      setActionData((prev) => ({
        ...prev,
        rent: {
          ...prev.rent,
          status: data.status || "paid",
          due_amount: data.due_amount ?? prev.rent.due_amount,
        },
      }));

      setRentMessage(data.message || "Payment successful.");
      setIsRentError(false);

      if (data.order_status) {
        setRentMessage(
          `${data.message || "Payment checked."} Status: ${data.order_status}`
        );
      }
    } catch (err) {
      setRentError(err.message || "Unable to verify payment.");
      setIsRentError(true);
    }
  }

  async function handlePayRent() {
    setRentError("");
    setRentMessage("");
    setIsRentError(false);

    if (!tenantPhone) {
      setRentError("Please login before paying rent.");
      setIsRentError(true);
      return;
    }

    if (!activePayload || Number(activePayload.due_amount || 0) <= 0) {
      setRentError("No pending rent due.");
      setIsRentError(true);
      return;
    }

    if (activePayload.status === "paid") {
      setRentError("Rent is already marked as paid.");
      setIsRentError(true);
      return;
    }

    setPayingRent(true);
    try {
      const response = await tenantAuthFetch(
        `${API_BASE_URL}/tenant/${tenantPhone}/rent/order/`,
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

      setRentMessage("Checking payment status...");
      setIsRentError(false);
      setTimeout(() => verifyPayment(orderId), 3000);
    } catch (error) {
      setRentError(error.message || "Unable to initiate payment.");
      setIsRentError(true);
    } finally {
      setPayingRent(false);
    }
  }

  function renderActionContent() {
    if (loadingAction) {
      return <p className={actionDetailDescription}>Loading action details...</p>;
    }

    if (actionError) {
      return (
        <>
          <p className={`${formMessage} ${formMessageError}`}>{actionError}</p>
          {String(actionError).toLowerCase().includes("verification") && (
            <button
              type="button"
              className={actionDetailPrimary}
              onClick={() =>
                navigate(
                  tenantPhone
                    ? `/tenant/verify/?phone=${tenantPhone}`
                    : "/tenant/verify/"
                )
              }
            >
              Open Verify
            </button>
          )}
        </>
      );
    }

    if (!activePayload) {
      return <p className={actionDetailDescription}>No data found.</p>;
    }

    if (activeAction.id === "rent") {
      const rentMeta = [
        {
          label: "Current Due",
          value: `INR ${Number(activePayload.due_amount || 0).toLocaleString("en-IN")}`,
        },
        { label: "Due Date", value: formatDate(activePayload.due_date) },
        { label: "Status", value: activePayload.status || "Pending" },
      ];

      return (
        <div className={rentPane}>
          <div className={rentSummary}>
            <p className={actionDetailDescription}>
              {activeAction.description}
            </p>
            <div className={actionDetailMetaGrid}>
              {rentMeta.map((item) => (
                <div key={item.label} className={actionDetailMetaCard}>
                  <p className={actionDetailMetaLabel}>{item.label}</p>
                  <p className={actionDetailMetaValue}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={actionDetailPrimary}
            onClick={handlePayRent}
            disabled={
              payingRent ||
              Number(activePayload.due_amount || 0) <= 0 ||
              activePayload.status === "paid"
            }
          >
            {payingRent ? "Processing..." : "Pay Now"}
          </button>

          {rentError && (
            <p className={`${formMessage} ${formMessageError}`}>
              {rentError}
            </p>
          )}
          {rentMessage && !isRentError && (
            <p className={`${formMessage} ${formMessageSuccess}`}>
              {rentMessage}
            </p>
          )}
        </div>
      );
    }

    if (activeAction.id === "menu") {
      const weeklyMenu = activePayload.weekly_menu || [];
      return (
        <>
          <p className={actionDetailDescription}>
            {activePayload.description || activeAction.description}
          </p>
          <div className={menuGrid}>
            {weeklyMenu.map((day) => (
              <div key={day.day} className={menuDayCard}>
                <p className={menuDayTitle}>{day.day}</p>
                {Object.entries(day.meals || {}).map(([mealLabel, mealItem]) => (
                  <div key={mealLabel} className={menuMeal}>
                    <span className={menuMealLabel}>{mealLabel}</span>
                    <span className={menuMealItem}>{mealItem}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      );
    }

    if (activeAction.id === "rules") {
      return (
        <>
          <p className={actionDetailDescription}>
            {activePayload.description || activeAction.description}
          </p>
          <div className={actionDetailMetaGrid}>
            {(activePayload.rules || []).map((item) => (
              <div key={item.label} className={actionDetailMetaCard}>
                <p className={actionDetailMetaLabel}>{item.label}</p>
                <p className={actionDetailMetaValue}>{item.value}</p>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (activeAction.id === "room") {
      const roomMeta = [
        { label: "Room Number", value: activePayload.room_number || "N/A" },
        { label: "Room Type", value: activePayload.room_type || "N/A" },
        { label: "Occupancy", value: activePayload.occupancy_label || "N/A" },
        {
          label: "Monthly Rent",
          value: `INR ${Number(activePayload.rent || 0).toLocaleString("en-IN")}`,
        },
      ];

      return (
        <>
          <p className={actionDetailDescription}>{activeAction.description}</p>
          <div className={actionDetailMetaGrid}>
            {roomMeta.map((item) => (
              <div key={item.label} className={actionDetailMetaCard}>
                <p className={actionDetailMetaLabel}>{item.label}</p>
                <p className={actionDetailMetaValue}>{item.value}</p>
              </div>
            ))}
          </div>
        </>
      );
    }

    const summary = activePayload.summary || {};
   
    return (
      <>
        <p className={actionDetailDescription}>{activeAction.description}</p>
        

        <form onSubmit={submitComplaint} className={complaintform}>
          <div className={actionDetailMetaGrid}>
            <div className={actionDetailMetaCard}>
              <p className={actionDetailMetaLabel}>Category</p>
              <select
                className={inputField}
                value={complaintForm.category}
                onChange={(event) =>
                  setComplaintForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
              >
                <option value="room">Room</option>
                <option value="food">Food</option>
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={actionDetailMetaCard}>
              <p className={actionDetailMetaLabel}>Title</p>
              <input
                className={inputField}
                type="text"
                placeholder="Example: Water leakage in bathroom"
                value={complaintForm.title}
                onChange={(event) =>
                  setComplaintForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className={actionDetailMetaCard}>
              <p className={actionDetailMetaLabel}>Description</p>
              <textarea
                className={inputField}
                rows={3}
                placeholder="Add details to help hostel management resolve it quickly."
                value={complaintForm.description}
                onChange={(event) =>
                  setComplaintForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {complaintMessage && (
            <p
              className={`${formMessage} ${
                isComplaintError ? formMessageError : formMessageSuccess
              }`}
            >
              {complaintMessage}
            </p>
          )}

          <button type="submit" className={actionDetailPrimary} disabled={submittingComplaint}>
            {submittingComplaint ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>

        <div className={actionDetailMetaGrid}>
          {(activePayload.complaints || []).map((item) => (
            <div key={item.id} className={actionDetailMetaCard}>
              <p className={actionDetailMetaLabel}>
                {item.category} - {formatDate(item.created_at)}
              </p>
              <p className={actionDetailMetaValue}>{item.title}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={homepageClass}>
      <div className={homeHero}>
        <h3 className={homeHeroTitle}>Hello {profile?.name || "Tenant"}</h3>
      
      </div>

      <div className={homeWorkspace}>
        <div className={homepagesub}>
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => setActiveActionId(action.id)}
              className={`${actionButton} ${action.className} ${
                activeAction.id === action.id ? actionButtonActive : ""
              }`}
            >
              <span className={actionTitle}>{action.title}</span>
              <small className={actionHint}>{action.hint}</small>
            </button>
          ))}
        </div>

        <div className={actionDetailPanel}>
          <div className={actionDetailHeader}>
            <h4 className={actionDetailTitle}>{activeAction.title}</h4>
            <p className={actionDetailHint}>{activeAction.hint}</p>
          </div>
          {renderActionContent()}
        </div>
      </div>
    </div>
  );
}

export default Homepage;
