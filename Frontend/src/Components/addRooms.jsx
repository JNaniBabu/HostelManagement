import { useState } from "react";
import Messenger from "./Messenger";
import { authFetch, getCookie } from "../utils/authFetch";

function AddRooms() {

  const [Message, setMessage] = useState("");
  const [Dynamic, setDynamic] = useState(false);
  const [Save, setSave] = useState("Add Room");

  const [formData, setFormData] = useState({
    roomNumber: "",
    roomType: "",
    rent: "",
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

  async function HandleSubmit(e) {
    e.preventDefault();

    setMessage("");

    if (
      !formData.roomNumber.trim() ||
      !formData.roomType.trim() ||
      !formData.rent.trim()
    ) {
      setMessage("All Fields Are Required");
      setDynamic(true);
      return;
    }

    const roomRegex = /^(g-[1-9]\d*|[1-9]\d{2})$/i;
    if (!roomRegex.test(formData.roomNumber)) {
    setMessage("Room must be like g-1, g-2 or 101, 102");
    setDynamic(true);
    return;
    }

    if (!/^[0-9]+$/.test(formData.rent)) {
      setMessage("Rent must be a valid number");
      setDynamic(true);
      return;
    }

    const csrftoken = getCookie("csrftoken");
    setSave("Adding...");

    try {
      const Response = await authFetch("http://localhost:8000/add/room/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        body: JSON.stringify({
          room_number: formData.roomNumber,
          room_type: formData.roomType,
          rent: formData.rent,
        }),
      });

      const result = await Response.json();

      if (Response.ok) {
        setMessage("Room Added Successfully");
        setDynamic(true);
        setSave("Add Room");

       
        setFormData({
          roomNumber: "",
          roomType: "",
          rent: "",
        });
      } else {
        setMessage(result.message || "Please Login to continue");
        setDynamic(true);
        setSave("Add Room");
      }

    } catch (error) {
      setMessage("Server Error");
      setDynamic(true);
      setSave("Add Room");
    }
  }

  return (
    <>
      <Messenger
        Message={Message}
        Dynamic={Dynamic}
        DynamicValue={DynamicValue}
      />

      <>
        <h3>Add Rooms</h3>

        <form className="add-rooms-form" onSubmit={HandleSubmit} autoComplete="off">

          <div className="addroomsline">
            <div className="addroomslabel">
              <label htmlFor="roomNumber">Room Number</label> :
            </div>

            <input
              type="text"
              id="roomNumber"
              name="roomNumber"
              value={formData.roomNumber}
              onChange={HandleChanges}
              placeholder="Enter room number (g-1,101)"
            />
          </div>

          <div className="addroomsline">
            <div className="addroomslabel">
              <label htmlFor="roomType">Room Type</label> :
            </div>

            <select
              id="roomType"
              name="roomType"
              value={formData.roomType}
              onChange={HandleChanges}
            >
              <option value="">Select Room Type</option>
              <option value="Single Share">Single Share</option>
              <option value="Two Share">Two Share</option>
              <option value="Three Share">Three Share</option>
              <option value="Four Share">Four Share</option>
            </select>
          </div>

          <div className="addroomsline">
            <div className="addroomslabel">
              <label htmlFor="rent">Rent</label> :
            </div>

            <input
              type="text"
              id="rent"
              name="rent"
              value={formData.rent}
              onChange={HandleChanges}
              placeholder="Enter Rent Amount"
            />
          </div>

          <button type="submit">
            {Save}
          </button>

        </form>
      </>
    </>
  );
}

export default AddRooms;
