import React, { useState } from "react";
import DoctorNameDropdown from "./DoctorNameDropdown";
import HospitalNameDropdown from "./HospitalNameDropdown";
import "./DoctorVisitsSection.css";

// Sprint6-Story-3-AC5: Component for managing multiple doctor visits
const MultipleDoctorVisitsSection = ({ doctorVisits, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const getMinAllowedDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10);
    return date.toISOString().split("T")[0];
  };

  const minAllowedDate = getMinAllowedDate();

  const addDoctorVisit = () => {
    const newVisit = {
      doctorName: "",
      hospitalName: "",
      visitDate: "",
      prescriptionFiles: [],
      testDetails: "",
      testResultFiles: [],
      conclusion: "",
    };
    onChange([...doctorVisits, newVisit]);
  };

  const removeDoctorVisit = (index) => {
    onChange(doctorVisits.filter((_, i) => i !== index));
  };

  const updateDoctorVisit = (index, field, value) => {
    const updated = doctorVisits.map((visit, i) =>
      i === index ? { ...visit, [field]: value } : visit
    );
    onChange(updated);
  };

  const handleFileUpload = (index, e, fileType) => {
    const files = Array.from(e.target.files);
    const field =
      fileType === "prescription" ? "prescriptionFiles" : "testResultFiles";

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        alert(`File ${file.name} must be an image or PDF`);
        return false;
      }

      const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File ${file.name} exceeds ${isImage ? "5MB" : "10MB"} limit`);
        return false;
      }

      return true;
    });

    const updated = doctorVisits.map((visit, i) =>
      i === index
        ? { ...visit, [field]: [...(visit[field] || []), ...validFiles] }
        : visit
    );
    onChange(updated);
  };

  const handleRemoveFile = (visitIndex, fileIndex, fileType) => {
    const field =
      fileType === "prescription" ? "prescriptionFiles" : "testResultFiles";
    const updated = doctorVisits.map((visit, i) =>
      i === visitIndex
        ? {
          ...visit,
          [field]: (visit[field] || []).filter((_, j) => j !== fileIndex),
        }
        : visit
    );
    onChange(updated);
  };

  return (
    <div className="doctor-visits-section">
      <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h4>Doctor Visits ({doctorVisits.length})</h4>
        <span className="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="section-content">
          {doctorVisits.map((visit, visitIndex) => (
            <div key={visitIndex} className="doctor-visit-card">
              <div className="visit-header">
                <h5>Visit #{visitIndex + 1}</h5>
                {doctorVisits.length > 1 && (
                  <button
                    type="button"
                    className="remove-visit-btn"
                    onClick={() => removeDoctorVisit(visitIndex)}
                  >
                    ❌ Remove Visit
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Doctor Name</label>
                <DoctorNameDropdown
                  value={visit.doctorName || ""}
                  onChange={(value) => {
                    // 
                    updateDoctorVisit(visitIndex, "doctorName", value);
                  }}
                  placeholder="Search or add doctor name"
                />
              </div>

              <div className="form-group">
                <label>Hospital Name</label>
                <HospitalNameDropdown
                  value={visit.hospitalName || ""}
                  onChange={(value) => {
                    // 
                    updateDoctorVisit(visitIndex, "hospitalName", value);
                  }}
                  placeholder="Search or add hospital name"
                />
              </div>

              <div className="form-group">
                <label>Visit Date</label>
                <input
                  type="date"
                  value={visit.visitDate || ""}
                  min={minAllowedDate}
                  max={today}
                  onChange={(e) =>
                    updateDoctorVisit(visitIndex, "visitDate", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label className="upload-button">
                  📎 Upload Prescription Files
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) =>
                      handleFileUpload(visitIndex, e, "prescription")
                    }
                    hidden
                  />
                </label>
                {visit.prescriptionFiles &&
                  visit.prescriptionFiles.length > 0 && (
                    <div className="file-list">
                      {visit.prescriptionFiles.map((file, fileIndex) => (
                        <div key={fileIndex} className="file-item-preview">
                          {file instanceof File ? (
                            <span className="file-name">{file.name}</span>
                          ) : (
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {file.fileName}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveFile(
                                visitIndex,
                                fileIndex,
                                "prescription"
                              )
                            }
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="form-group">
                <label>Test Details</label>
                <textarea
                  value={visit.testDetails || ""}
                  onChange={(e) =>
                    updateDoctorVisit(visitIndex, "testDetails", e.target.value)
                  }
                  placeholder="Enter test details/notes"
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label className="upload-button">
                  📎 Upload Test Result Files
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) =>
                      handleFileUpload(visitIndex, e, "testResult")
                    }
                    hidden
                  />
                </label>
                {visit.testResultFiles && visit.testResultFiles.length > 0 && (
                  <div className="file-list">
                    {visit.testResultFiles.map((file, fileIndex) => (
                      <div key={fileIndex} className="file-item-preview">
                        {file instanceof File ? (
                          <span className="file-name">{file.name}</span>
                        ) : (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {file.fileName}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveFile(
                              visitIndex,
                              fileIndex,
                              "testResult"
                            )
                          }
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Doctor's Conclusion</label>
                <textarea
                  value={visit.conclusion || ""}
                  onChange={(e) =>
                    updateDoctorVisit(visitIndex, "conclusion", e.target.value)
                  }
                  placeholder="Enter doctor's conclusion"
                  rows="2"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="add-visit-btn"
            onClick={addDoctorVisit}
          >
            ➕ Add Another Doctor Visit
          </button>
        </div>
      )}
    </div>
  );
};

export default MultipleDoctorVisitsSection;
