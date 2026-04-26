import { useState, useEffect } from "react";
import Messenger from "./messenger";
import { API_BASE_URL } from "../utils/apiConfig";

function Upisettings() {
  const [Edit, setEdit] = useState(false);

  const [Message, setMessage] = useState("");
  const [Dynamic, setDynamic] = useState(false);

  const [Save, setSave] = useState("Save");

  const [formData, setFormData] = useState({
    account_holder: "",
    upi_id: "",
    confirm_upi: "",
    mobile: "",
  });

  function DynamicValue() {
    setDynamic(false);
  }

  function HandleChanges(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();

        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }

    return cookieValue;
  }

  async function HandleSubmission(e) {
    e.preventDefault();

    if (!Edit) return;

    setMessage("");

    if (
      !formData.account_holder.trim() ||
      !formData.upi_id.trim() ||
      !formData.confirm_upi.trim() ||
      !formData.mobile.trim()
    ) {
      setMessage("All Fields Are Required");
      setDynamic(true);
      return;
    }

    if (formData.upi_id !== formData.confirm_upi) {
      setMessage("UPI ID does not match");
      setDynamic(true);
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      setMessage("Invalid Mobile Number");
      setDynamic(true);
      return;
    }

    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

    if (!upiRegex.test(formData.upi_id)) {
      setMessage("Invalid UPI format (example: name@okaxis)");
      setDynamic(true);
      return;
    }

    const csrftoken = getCookie("csrftoken");

    setSave("Saving...");

    try {
      const Response = await fetch(`${API_BASE_URL}/upi/update/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({
          account_holder: formData.account_holder,
          upi_id: formData.upi_id,
          mobile: formData.mobile,
        }),
      });

      const result = await Response.json();

      if (Response.ok) {
        setMessage("UPI Details Saved Successfully");
        setDynamic(true);
        setEdit(false);
        setSave("Save");
      } else {
        setMessage("Update Failed");
        setDynamic(true);
        setSave("Save");
      }
    } catch (error) {
      setMessage("Server Error");
      setDynamic(true);
      setSave("Save");
    }
  }

  async function FetchUpiData() {
    try {
      const Response = await fetch(`${API_BASE_URL}/upi/data/`, {
        method: "GET",
        credentials: "include",
      });

      const data = await Response.json();

      if (Response.ok) {
        setFormData({
          account_holder: data.account_holder || "",
          upi_id: data.upi_id || "",
          confirm_upi: data.upi_id || "",
          mobile: data.mobile || "",
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    FetchUpiData();
  }, []);

  return (
    <>
      <Messenger
        Message={Message}
        Dynamic={Dynamic}
        DynamicValue={DynamicValue}
      />

      <>
        <h3>UPI Settings</h3>

        <form
          className="upiform"
          onSubmit={HandleSubmission}
          autoComplete="off"
        >
          <div className="upisub">
            <div className="upilabelpart">
              <label>Account Holder Name </label>:
            </div>

            <input
              type="text"
              name="account_holder"
              value={formData.account_holder}
              readOnly={!Edit}
              onChange={HandleChanges}
              autoComplete="off"
              placeholder="Enter Account Holder Name"
            />
          </div>

          <div className="upisub">
            <div className="upilabelpart">
              <label>UPI Id </label>:
            </div>

            <input
              type="text"
              name="upi_id"
              value={formData.upi_id}
              readOnly={!Edit}
              onChange={HandleChanges}
              autoComplete="off"
              placeholder="Enter Upi Id"
            />
          </div>

          <div className="upisub">
            <div className="upilabelpart">
              <label>Confirm UPI Id </label>:
            </div>

            <input
              type="text"
              name="confirm_upi"
              value={formData.confirm_upi}
              readOnly={!Edit}
              onChange={HandleChanges}
              autoComplete="off"
              placeholder="Enter Confirm Upi Id"
            />
          </div>

          <div className="upisub">
            <div className="upilabelpart">
              <label>Mobile Number </label>:
            </div>

            <input
              type="text"
              name="mobile"
              value={formData.mobile}
              readOnly={!Edit}
              onChange={HandleChanges}
              autoComplete="off"
              placeholder="Enter Mobile Number"
            />
          </div>

          <button
            type="button"
            onClick={() => setEdit(true)}
            style={!Edit ? {} : { display: "none" }}
            className="personalbutton"
          >
            Edit
          </button>

          <button
            type="submit"
            style={Edit ? { background: "green" } : { display: "none" }}
            className="personalbutton"
          >
            {Save}
          </button>
        </form>
      </>
    </>
  );
}

export default Upisettings;
