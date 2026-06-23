// src/pages/NotFound.js
import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="error-container">
        <div className="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for doesn't exist or has been moved.</p>
        <div className="action-buttons">
          <Link to="/dashboard" className="primary-button">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
