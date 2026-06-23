import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { pinLogin } from "../../api";
import { useAuth } from "../../contexts/AuthContext"; // Import the auth context
import showToast from "../../utils/toast";
import "./PinLogin.css";

const PinLogin = ({ onToggle }) => {
  const macAddress = localStorage.getItem("macAddress");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login: authLogin } = useAuth(); // Use the login function from auth context
  const location = useLocation();
  const isStudentLogin = location.pathname === "/login";
  const headers = {
    "Content-Type": "application/json",
    "MAC-Address": `${macAddress}`,
    mode: "no-cors",
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    login();
  };

  // Handle toggle for switching login methods
  const handleToggle = (e) => {
    e.preventDefault();
    onToggle();
  };

  // Login function
  const login = async () => {
    setIsLoading(true);
    setError("");

    const data = {
      email: username,
      password: pin,
    };

    try {
      // const response = await axios.post("https://playground.initiativesewafoundation.com/server/api/auth/login", data, { headers });

      // API helper already returns response.data, not the full axios response
      const resData = await pinLogin(data);

      if (resData && resData.data) {
        const { token, user } = resData.data;

        // Format the user data to match our auth context expectations
        const userData = {
          token,
          user: {
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            balagruhaIds: user?.balagruhaIds,
          },
        };

        // Call the login function from auth context
        authLogin(userData);

        // Show success message
        showToast(`Welcome back, ${user.name}!`, "success");

        // Navigate to the dashboard
        navigate("/dashboard");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Login failed:", error);

      // Handle different error scenarios
      if (error.response) {
        // Server responded with an error
        const errorMessage =
          error.response.data.message ||
          "Login failed. Please check your credentials.";
        setError(errorMessage);
        showToast(errorMessage, "error");
      } else if (error.request) {
        // No response from server
        const errorMessage = "No response from server. Please try again later.";
        setError(errorMessage);
        showToast(errorMessage, "error");
      } else {
        // Other errors
        const errorMessage = "Login failed. Please try again.";
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pin-login-container">
      <form onSubmit={handleSubmit}>
        {/* Display error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Username input */}
        <div className="input-group">
          <label htmlFor="pin-login-email" className="sr-only">Email</label>
          <input
            type="text"
            id="pin-login-email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Email"
            disabled={isLoading}
            aria-label="Email address"
          />
        </div>

        {/* Password input */}
        <div className="input-group">
          <label htmlFor="pin-login-password" className="sr-only">Password</label>
          <input
            type="password"
            id="pin-login-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Password"
            disabled={isLoading}
            aria-label="Password"
          />
        </div>

        {/* Submit button */}
        <div className="input-group">
          <button
            type="submit"
            className={`login-button ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>

      {/* Toggle link for switching login methods */}
      <a href="#" onClick={handleToggle} className="toggle-link">
        Login with Face ID
      </a>

      {isStudentLogin ? (
        <Link to={"/admin/login"}>
          <p className="toggle-link admin-btn">Admin Login</p>
        </Link>
      ) : (
        <Link to={"/login"}>
          <p className="toggle-link admin-btn">Student Login</p>
        </Link>
      )}
    </div>
  );
};

export default PinLogin;
