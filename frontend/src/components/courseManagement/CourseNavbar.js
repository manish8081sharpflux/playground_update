import React from "react";
import "./CourseNavbar.css";

export default function CourseNavbar() {
  return (
    <div className="course-navbar-container">
      <div className="course-navbar-hat">🎓</div>
      <div className="course-navbar-menu">
        <p className="course-navbar-p">Home</p>
        <p className="course-navbar-p">Students</p>
        <p className="course-navbar-p">Tasks</p>
        <p className="course-navbar-p">Course Management</p>
        <p className="course-navbar-p">Reports</p>
        <p className="course-navbar-p">Settings</p>
      </div>
    </div>
  );
}
