import { useState } from "react";
import Loader from "../Loader";
import { API_BASE_URL } from "../utils/apiConfig";
import { authFetch, getCookie, parseResponse } from "../utils/authFetch";

function NewJoinee() {
  const [Message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [showRooms, setShowRooms] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [RoomsNumber, setRoomsNumber] = useState("");

  const [checkAvailability, setcheckAvailability] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    number: "",
    roomType: "Single Share",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setMessage("");
    setFormData((prev) => ({
      ...prev,
      [name]: name === "number" ? value.replace(/\D/g, "") : value,
    }));
    
    setShowRooms(false);
    setRoomsNumber("");
    setcheckAvailability([]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const { name, number, roomType } = formData;

    const ownerReady = await ensureOwnerOnboarding();
    if (!ownerReady) {
      setLoading(false);
      return;
    }

    if (!name || !number) {
      setMessage("All fields are required");
      setLoading(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      setMessage("Invalid phone number");
      setLoading(false);
      return;
    }

    if (!RoomsNumber) {
      setMessage("Please choose a room using Check Availability");
      setLoading(false);
      return;
    }

    try {
      const response = await authFetch("https://hostelmanagement-8jtu.onrender.com/add-tenant/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        credentials: "include",
        body: JSON.stringify({
          name: name,
          phone_number: number,
          room_number: RoomsNumber,
          room_type: roomType,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage("Tenant failed to add");
        return;
      }

      setMessage("Tenant successfully added");

      setFormData({
        name: "",
        number: "",
        roomType: "Single Share",
      });
      setRoomsNumber("");
    } catch {
      setMessage("Something went wrong");
    } finally {
      setLoading(false);
    }
  }


  async function ensureOwnerOnboarding() {
    try {
      const [personal, hostel, upi] = await Promise.all([
        authFetch(`${API_BASE_URL}/user/data/`, {
          credentials: "include",
        }),
        authFetch(`${API_BASE_URL}/hostel/data/`  , {
          credentials: "include",
        }),
        authFetch(`${API_BASE_URL}/upi/data/`, {
          credentials: "include",
        }),
      ]);

      const personalData = personal.ok ? await personal.json() : {};
      const hostelData = hostel.ok ? await hostel.json() : {};
      const upiData = upi.ok ? await upi.json() : {};

      const missing = [];

      if (!personalData.username || !personalData.Number || !personalData.Address) {
        missing.push("personal details");
      }
      if (!hostelData.hostel_name || !hostelData.city || !hostelData.state || !hostelData.pincode) {
        missing.push("hostel details");
      }
      if (!upiData.account_holder || !upiData.upi_id || !upiData.mobile) {
        missing.push("UPI details");
      }

      if (missing.length) {
        const missingText = missing.join(", ");
        setMessage(`Please complete onboarding (${missingText}) before sending tenant verification.`);
        return false;
      }
      return true;
    } catch {
      setMessage("Unable to verify owner onboarding. Please try again.");
      return false;
    }
  }

  async function CheckAvailability() {
    const { name, number, roomType } = formData;

    if (!name || !number || !roomType) {
      setMessage("All fields are required");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(number)) {
      setMessage("Invalid phone number");
      return;
    }

    setShowRooms(true);
    setLoadingRooms(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const Request = await authFetch(`${API_BASE_URL}/checkavailability/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        credentials: "include",
        body: JSON.stringify({
          room_type: formData.roomType,
        }),
      });

      const Response = await Request.json();

      if (Request.ok) {
        setcheckAvailability(Response["message"] || []);
      } else {
        setcheckAvailability([]);
        setMessage(Response.message || "Failed to check availability");
        setShowRooms(false);
      }
    } catch {
      setMessage("Server error");
      setShowRooms(false);
    }

    setLoadingRooms(false);
  }

  const normalizedMessage = Message.toLowerCase();
  const isSuccessMessage =
    normalizedMessage.includes("success") ||
    ((normalizedMessage.includes("tenant created") ||
      normalizedMessage.includes("tenant added")) &&
      !normalizedMessage.includes("failed"));

  return (
    <>
      <div className="Newjoinee">
        <h3 className="newJoineeTitle">New Tenant</h3>

        <form className="newJoineeForm" onSubmit={handleSubmit}>
          <div className="newextra">
            <div className="newlabel">
              <label>Name</label>:
            </div>
            <input
              type="text"
              name="name"
              placeholder="Enter Aadhaar Name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="newextra">
            <div className="newlabel">
              <label>Number</label>:
            </div>
            <input
              type="text"
              name="number"
              placeholder="Enter Mobile Number"
              value={formData.number}
              onChange={handleChange}
            />
          </div>

          <div className="newextra">
            <div className="newlabel">
              <label>Room Type</label>:
            </div>
            <select
              name="roomType"
              value={formData.roomType}
              onChange={handleChange}
            >
              <option value="Single Share">Single Share</option>
              <option value="Two Share">Two Share</option>
              <option value="Three Share">Three Share</option>
              <option value="Four Share">Four Share</option>
            </select>
          </div>

          <div className="newextra availabilityRow">
            <div className="newextrasub ">
              <div className="newextralabel">
                <label>Room No</label>:
              </div>
              <input
                type="text"
                readOnly
                placeholder="Here Room Number"
                value={RoomsNumber}
              />
            </div>
            <button
              type="button"
              className="availabilityButton"
              onClick={CheckAvailability}
              disabled={loadingRooms}
            >
              {loadingRooms ? "Checking..." : "Check Availability"}
            </button>
          </div>
           {showRooms && (
        <div className="Messengerpart">
          {loadingRooms && <Loader />}
          {!loadingRooms && (
            <div className="messengersub">
              <div className="messengersubheads">
                <h5>Room Number </h5>
                <h5 style={{ color: "green" }}>Available Beds</h5>
              </div>
              {Array.isArray(checkAvailability) &&
                checkAvailability.length !== 0 &&
                checkAvailability.map((room) => (
                  <div
                    key={room.id}
                    className="roomsCheck"
                    onClick={() => {
                      setShowRooms(false);
                      setRoomsNumber(room.room_number);
                    }}
                  >
                    <h5>{room.room_number}</h5>
                    <h5>{room.total_capacity - room.occupied}</h5>
                  </div>
                ))}
              {Array.isArray(checkAvailability) &&
                checkAvailability.length == 0 && <p>No Available Beds</p>}
            </div>
          )}
        </div>
      )}

          <button type="submit" className="newJoineeSubmit" disabled={loading}>
            {loading ? "Saving..." : "Save Tenant"}
          </button>

          <p
            className={`newJoineeStatus ${
              !Message
                ? ""
                : isSuccessMessage
                ? "success"
                : "error"
            }`}
          >
            {Message}
          </p>
        </form>
      </div>

     
    </>
  );
}

export default NewJoinee;
