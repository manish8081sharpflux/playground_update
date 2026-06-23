import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import WallOfFame from "./WallOfFame";
import WTFManagement from "./WTFManagement";
import StudentSubmission from "./StudentSubmission";
import { useUserRole } from "../../hooks/useUserRole";
import "./WtfDashboard.css";

const WtfDashboard = () => {
  const { isAdmin, isStudent } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("wall"); // wall, submit, management

  // Debug removed - role detection working

  // Check URL params to see which view to show
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const viewParam = urlParams.get("view");

    if (viewParam === "management" && isAdmin) {
      setActiveView("management");
    } else if (viewParam === "submit" && isStudent) {
      setActiveView("submit");
    } else {
      setActiveView("wall");
    }
  }, [location.search, isAdmin, isStudent]);

  const handleViewChange = (view) => {
    setActiveView(view);
    if (view === "management" && isAdmin) {
      navigate("/wtf?view=management");
    } else if (view === "submit" && isStudent) {
      navigate("/wtf?view=submit");
    } else {
      navigate("/wtf");
    }
  };

  // Render the appropriate component based on active view
  if (activeView === "management" && isAdmin) {
    return (
      <div className="wtf-management min-h-screen">
        <WTFManagement onToggleView={() => handleViewChange("wall")} />
      </div>
    );
  }

  if (activeView === "submit" && isStudent) {
    return (
      <div className="wtf-submit min-h-screen">
        <StudentSubmission />
      </div>
    );
  }

  return (
    <div className="wtf-dashboard min-h-screen w-full">
      <WallOfFame
        onToggleView={isAdmin ? () => handleViewChange("management") : null}
      />
    </div>
  );
};

export default WtfDashboard;
