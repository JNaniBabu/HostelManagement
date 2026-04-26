import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import Messenger from "./Components/messenger";
import { authFetch, parseResponse } from "./utils/authFetch";
import { Link } from "react-router-dom";

function LoginForms() {
  const [DemoImage, setDemoImage] = useState(0);
  const [Message, setMessage] = useState("");
  const [Dynamic, setDynamic] = useState(false);
  const [Disabled, setDisabled] = useState(false);

  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Number: "",
    password: "",
    ConfirmPassword: "",
  });

  const [formDataLog, setFormDataLog] = useState({
    Number: "",
    password: "",
  });

  useEffect(() => {
    setMessage("");
    setDisabled(false);
    setFormDataLog({ Number: "", password: "" });
    setFormData({
      Name: "",
      Email: "",
      Number: "",
      password: "",
      ConfirmPassword: "",
    });
  }, [DemoImage]);

  function HandleChanges(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  function HandleChangesLog(e) {
    setMessage("");
    setFormDataLog({
      ...formDataLog,
      [e.target.name]: e.target.value,
    });
  }


  async function HandleRegistration(e) {
    e.preventDefault();
    setMessage("");

    if (
      !formData.Name ||
      !formData.Email ||
      !formData.password ||
      !formData.ConfirmPassword ||
      !formData.Number
    ) {
      setMessage("All fields are Required");
      setDynamic(true);
      return;
    }

    if (formData.password !== formData.ConfirmPassword) {
      setMessage("Passwords should match");
      setDynamic(true);
      return;
    }

    setDisabled(true);

    const data = {
      username: formData.Name,
      email: formData.Email,
      password: formData.password,
      Number: formData.Number,
      Address: "",
    };
    let result=""
    try {
      const response = await authFetch("/register/", {
        method: "POST",
        body: JSON.stringify(data),
      });

      result = await parseResponse(response);

      setMessage(result.message || "Registered successfully");
    } catch (err) {
      setMessage(result.message );
      console.error(err);
    }

    setDynamic(true);
    setDisabled(false);
  }

  
  async function HandleLogin(e) {
    e.preventDefault();

    if (!formDataLog.Number || !formDataLog.password) {
      setMessage("All fields are Required");
      setDynamic(true);
      return;
    }

    setDisabled(true);

    try {
      const response = await authFetch("/login/", {
        method: "POST",
        body: JSON.stringify(formDataLog),
      });

      const result = await parseResponse(response);

      setMessage(result.message || "Login successful");
    } catch (err) {
      setMessage("Login failed");
      console.error(err);
    }

    setFormDataLog({ Number: "", password: "" });
    setDynamic(true);
    setDisabled(false);
  }

  function DynamicValue() {
    setDynamic(false);
  }

  return (
    <div className="LoginForms">
      <Messenger
        Message={Message}
        Dynamic={Dynamic}
        DynamicValue={DynamicValue}
      />

      <Link className="back" to="/">
        <FaArrowLeft />
      </Link>

      <div className="loginImage">
        {DemoImage === 0 ? (
          <div className="loginForm authCard">
            <h3>Sign In</h3>
            <form className="form" onSubmit={HandleLogin}>
              <input
                type="text"
                name="Number"
                placeholder="Enter Mobile Number"
                onChange={HandleChangesLog}
                value={formDataLog.Number}
              />

              <input
                type="password"
                name="password"
                placeholder="Enter password"
                onChange={HandleChangesLog}
                value={formDataLog.password}
              />

              <button disabled={Disabled}>Sign In</button>
            </form>

            <p>
              Don't have an account?{" "}
              <span className="switchLink" onClick={() => setDemoImage(1)}>Sign Up</span>
            </p>
          </div>
        ) : (
          <div className="registerform authCard">
            <h3>Sign Up</h3>
            <form className="form" onSubmit={HandleRegistration}>
              <input
                type="text"
                name="Name"
                placeholder="Name"
                onChange={HandleChanges}
                value={formData.Name}
              />

              <input
                type="text"
                name="Email"
                placeholder="Email"
                onChange={HandleChanges}
                value={formData.Email}
              />

              <input
                type="text"
                name="Number"
                placeholder="Mobile"
                onChange={HandleChanges}
                value={formData.Number}
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={HandleChanges}
                value={formData.password}
              />

              <input
                type="password"
                name="ConfirmPassword"
                placeholder="Confirm Password"
                onChange={HandleChanges}
                value={formData.ConfirmPassword}
              />

              <button disabled={Disabled}>Sign Up</button>
            </form>

            <p>
              Already have an account?{" "}
              <span className="switchLink" onClick={() => setDemoImage(0)}>Sign In</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginForms;