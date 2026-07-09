// LoginCard.jsx
import React, { useEffect, useState } from "react";
import "./logincard.css";
import PinLogin from "../pinlogin/PinLogin";
import FaceIdLogin from "../faceidlogin/FaceIdLogin";

const LoginCard = () => {
  const [loginMethod, setLoginMethod] = useState("pin");
  const [macAddress, setMacAddress] = useState("");
  const [mac, setMac] = useState("");
  const toggleLoginMethod = () => {
    // First stop any existing camera stream
    if (loginMethod === "faceId") {
      const tracks =
        document.querySelector("video")?.srcObject?.getTracks() || [];
      tracks.forEach((track) => track.stop());
    }
    setLoginMethod(loginMethod === "faceId" ? "pin" : "faceId");
  };
  const isElectron = navigator.userAgent.toLowerCase().includes("electron");

  useEffect(() => {
    if (isElectron) {
      window.macAPI.getMacAddress().then((mac) => {
        localStorage.setItem("macAddress", mac);
      });
    } else {
      localStorage.setItem("macAddress", "00:1a:2b:3c:4d:5e");
      fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then((data) => {

        });
    }
  }, []);

  return (
    <div className="login-container">
      <div className="login-card">
        <h3>Welcome Back</h3>
        {loginMethod === "faceId" ? (
          <FaceIdLogin onToggle={toggleLoginMethod} />
        ) : (
          <PinLogin onToggle={toggleLoginMethod} />
        )}
      </div>
    </div>
  );
};

export default LoginCard;
