import { useState, useRef, useEffect } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import Messenger from "./messenger";
import { API_BASE_URL } from "../utils/apiConfig";

function Personal() {
  const [Edit, setEdit] = useState(false);
  const ImageRef = useRef(null);
  const [Image, setImage] = useState(null);

  const [Message, setMessage] = useState('');
  const [Dynamic, setDynamic] = useState(false);
  const [Save, setSave] = useState("Save");

  const [formData, setFormData] = useState({
    username: "",
    useremail: "",
    Number: "",
    Address: "",
    ProfileImage: null
  });

  function DynamicValue() {
    setDynamic(false);
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

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch(`${API_BASE_URL}/user/data/`, {
          method: "GET",
          credentials: "include", 
        });
        if (!response.ok) throw new Error("Failed to fetch user data");
        const data = await response.json();

        setFormData({
          username: data.username || "",
          useremail: data.email || "",
          Number: data.Number || "",
          Address: data.Address || "",
          ProfileImage: null
        });

        if (data.ProfileImage) setImage(data.ProfileImage);

      } catch (error) {
        console.error(error);
      }
    }

    fetchUserData();
  }, []);

  
  function HandleChangesLog(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

 
  const handleImageClick = () => {
    if (!Edit) return;
    ImageRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setFormData({
        ...formData,
        ProfileImage: file
      });
    }
  };

 
  async function HandleSubmission(e) {
    e.preventDefault();
    if (!Edit) return;

    const csrftoken = getCookie("csrftoken");
    setMessage("");

    
    if (!formData.username || !formData.useremail || !formData.Address || !formData.ProfileImage) {
      setMessage("All fields are required");
      setDynamic(true);
      return;
    }

    
    if (formData.useremail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.useremail)) {
        setMessage("Invalid email pattern");
        setDynamic(true);
        return;
      }
    }

    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== "" && formData[key] !== null) {
        if (key === "useremail") {
          formDataToSend.append("email", formData[key]);
        } else {
          formDataToSend.append(key, formData[key]);
        }
      }
    });

    setSave("Saving...");

    try {
      const Response = await fetch(`${API_BASE_URL}/profile/update/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formDataToSend,
      });

      const result = await Response.json();

      if (Response.ok) {
        setMessage("Profile Updated Successfully");
        setDynamic(true);
        setEdit(false);
        setSave("Save");
      } else {
        setMessage("Update failed");
        setDynamic(true);
        setSave("Save");
      }
    } catch (error) {
      console.error(error);
      setSave("Save");
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
        <h3>Personal Information</h3>
        <div className="Hostel">
          <div className="hostelsub">
            <div className="PersonalImageBlock">
              {Image === null ? (
                <FaCloudUploadAlt size={20} onClick={handleImageClick} />
              ) : (
                <img
                  src={Image}
                  onClick={handleImageClick}
                  style={{ cursor: "pointer", width: 100, height: 100 }}
                />
              )}
              <input
                type="file"
                ref={ImageRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <form className="ProfileForm" onSubmit={HandleSubmission} autoComplete="off">

            <div className="hostelsub">
              <div className="labelparthostel">
                <label>Full Name </label>:
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={HandleChangesLog}
                readOnly={!Edit}
              />
            </div>

            <div className="hostelsub">
              <div className="labelparthostel">
                <label>Email </label>:
              </div>
              <input
                type="text"
                name="useremail"
                value={formData.useremail}
                onChange={HandleChangesLog}
                readOnly={!Edit}
              />
            </div>

            <div className="hostelsub">
              <div className="labelparthostel">
                <label>Number </label>:
              </div>
              <input
                type="text"
                name="Number"
                value={formData.Number}
                onChange={HandleChangesLog}
                readOnly={!Edit}
              />
            </div>

            <div className="hostelsub">
              <div className="labelparthostel">
                <label>Address </label>:
              </div>
              <input
                type="text"
                name="Address"
                value={formData.Address}
                onChange={HandleChangesLog}
                readOnly={!Edit}
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
        </div>
      </>
    </>
  );
}

export default Personal;