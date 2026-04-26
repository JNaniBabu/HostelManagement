
import { useState, useRef, useEffect } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";
import Messenger from "./messenger";
import { authFetch, getCookie } from "../utils/authFetch";
import { API_BASE_URL } from "../utils/apiConfig";

function Hostel() {

  const [Edit, setEdit] = useState(false);
  const ImageRef = useRef(null);
  const [Image, setImage] = useState(null);

  const [Message, setMessage] = useState("");
  const [Dynamic, setDynamic] = useState(false);

  const [Save, setSave] = useState("Save");

  const [formData, setFormData] = useState({
    hostel_name: "",
    city: "",
    state: "",
    pincode: "",
    image1: null
  });


  function DynamicValue() {
    setDynamic(false);
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
        image1: file
      });
    }
  };

  function HandleChangesLog(e) {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  async function HandleSubmission(e) {

    e.preventDefault();

    if (!Edit) return;

    const csrftoken = getCookie("csrftoken");

    setMessage("");

    if (
      !formData.hostel_name.trim() ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.pincode.trim() ||
      !formData.image1
    ) {
      setMessage("All fields Are Required");
      setDynamic(true);
      return;
    }

    if (formData.pincode) {
      if (!/^[0-9]{6}$/.test(formData.pincode)) {
        setMessage("Invalid Pincode");
        setDynamic(true);
        return;
      }
    }

    const formDataToSend = new FormData();

    Object.keys(formData).forEach((key) => {
      if (formData[key] !== "" && formData[key] !== null) {
        formDataToSend.append(key, formData[key]);
      }
    });

    setSave("Saving...");

    try {

      const Response = await authFetch(`${API_BASE_URL}/hostel/update/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
        },
        body: formDataToSend,
      });

      const result = await Response.json();

      if (Response.ok) {

        setMessage("Hostel Updated Successfully");
        setDynamic(true);
        setEdit(false);
        setSave("Save");

      } else {

        setMessage("Update failed");
        setDynamic(true);
        setSave("Save");

      }

    } catch (error) {

      setMessage("Server Error");
      setDynamic(true);
      setSave("Save");

    }
  }



  async function FetchHostelData() {

  try {

    const Response = await authFetch(`${API_BASE_URL}/hostel/data/`, {
      method: "GET",
      credentials: "include",
      
        
    });

    const data = await Response.json();

    if (Response.ok) {
      console.log(data);
      
      setFormData({
        hostel_name: data.hostel_name || "",
        city: data.city || "",
        state: data.state || "",
        pincode: data.pincode || "",
        image1: data.image1 || null
      });

      if (data.image1) {
        setImage(data.image1);
      }

    }

  } catch (error) {
    console.error(error);
  }

}


useEffect(() => {
  FetchHostelData();
}, []);

  return (
    <>
      <Messenger
        Message={Message}
        Dynamic={Dynamic}
        DynamicValue={DynamicValue}
      />

      <>

        <h3>Hostel Data</h3>

        <div className="Hostel">

            <div className="ImageBlock">

              {Image === null && (
                <FaCloudUploadAlt size={20} onClick={handleImageClick} />
              )}

              {Image !== null && (
                <img
                  src={Image}
                  onClick={handleImageClick}
              
                />
              )}

              <input
                type="file"
                ref={ImageRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
                accept="image/*"
              />

           

          </div>

          <form
            className="ProfileForm"
            onSubmit={HandleSubmission}
            autoComplete="off"
          >

            <div className="hostelsub">

              <div className="labelparthostel">
                <label>Hostel Name </label>:
              </div>

              <input
                type="text"
                readOnly={!Edit}
                name="hostel_name"
                value={formData.hostel_name}
                onChange={HandleChangesLog}
                autoComplete="off"
              />

            </div>

            <div className="hostelsub">

              <div className="labelparthostel">
                <label>City </label>:
              </div>

              <input
                type="text"
                readOnly={!Edit}
                name="city"
                value={formData.city}
                onChange={HandleChangesLog}
                autoComplete="off"
              />

            </div>

            <div className="hostelsub">

              <div className="labelparthostel">
                <label>State </label>:
              </div>

              <input
                type="text"
                readOnly={!Edit}
                name="state"
                value={formData.state}
                onChange={HandleChangesLog}
                autoComplete="off"
              />

            </div>

            <div className="hostelsub">

              <div className="labelparthostel">
                <label>Pincode </label>:
              </div>

              <input
                type="text"
                readOnly={!Edit}
                name="pincode"
                value={formData.pincode}
                onChange={HandleChangesLog}
                autoComplete="off"
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

export default Hostel;
