import React, { useState } from "react";
import "./CourseManagement.css";
import CourseNavbar from "./CourseNavbar";

export default function CourseManagement() {
  const [showCreateCourse, setCreateCourse] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);

  return (
    <div className="course-container">
      <CourseNavbar />
      <div className="course-title-container">
        <div>
          <p className="course-management-p">
            {showCreateCourse && !showCreateQuiz
              ? "Create New Course"
              : !showCreateCourse && showCreateQuiz
              ? "Create New Quiz"
              : "Course Management"}
          </p>
        </div>
        <div>
          {!showCreateCourse && (
            <button
              className="course-create-btn"
              onClick={() => setShowCreateQuiz((prev) => !prev)}
            >
              {showCreateQuiz ? "❌ Cancel" : "➕ Create Quiz"}
            </button>
          )}
          {!showCreateQuiz && (
            <button
              style={{ marginLeft: "10px" }}
              className="course-create-btn"
              onClick={() => setCreateCourse((prev) => !prev)}
            >
              {showCreateCourse ? "❌ Cancel" : "➕ Create New Course"}
            </button>
          )}
        </div>
      </div>
      {/* List and forms markup trimmed for brevity - matches BU UI */}
    </div>
  );
}
