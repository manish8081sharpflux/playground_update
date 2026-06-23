// src/pages/AccessDenied.js
import React from "react";
import { Link } from "react-router-dom";
import "./AccessDenied.css";

const AccessDenied = () => {
  return (
    <div className="access-denied">
      <div className="error-container">
        <div className="error-icon">🔒</div>
        <h1>Access Denied</h1>
        <p>Sorry, you don't have permission to access this page.</p>
        <p className="error-description">
          This area requires specific permissions that are not assigned to your
          role. Please contact an administrator if you believe you should have
          access.
        </p>
        <div className="action-buttons">
          <Link to="/dashboard" className="primary-button">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
