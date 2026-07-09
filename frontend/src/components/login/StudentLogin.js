import React, { useEffect, useState } from "react";
import "./StudentLogin.css";
import UserIdLogin from "../pinlogin/UserIdLogin";
import FaceIdLogin from "../faceidlogin/FaceIdLogin";

export default function StudentLogin() {
  const [loginMethod, setLoginMethod] = useState("pin");

  const toggleLoginMethod = () => {
    if (loginMethod === "faceId") {
      const tracks =
        document.querySelector("video")?.srcObject?.getTracks() || [];
      tracks.forEach((track) => track.stop());
    }
    setLoginMethod(loginMethod === "faceId" ? "pin" : "faceId");
  };

  const isElectron = navigator.userAgent.toLowerCase().includes("electron");

  useEffect(() => {
    if (isElectron && window.macAPI?.getMacAddress) {
      window.macAPI.getMacAddress().then((mac) => {
        localStorage.setItem("macAddress", mac);
      });
    } else {
      localStorage.setItem("macAddress", "00:1a:2b:3c:4d:5e");
      fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then((data) => {

        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="student-login-container">
      <div className="student-login-card">
        <h3>Welcome Back</h3>
        {loginMethod === "faceId" ? (
          <FaceIdLogin onToggle={toggleLoginMethod} />
        ) : (
          <UserIdLogin onToggle={toggleLoginMethod} />
        )}
      </div>
    </div>
  );
}
