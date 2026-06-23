import React, { useState, useEffect } from "react";
import { getAnyUserBasedonRoleandBalagruha } from "../../api";
import DoctorNameDropdown from "./DoctorNameDropdown";
import HospitalNameDropdown from "./HospitalNameDropdown";
import "./FollowUpSection.css";

// Sprint6-Story-3-AC6-AC7: Component for managing multiple follow-ups with file uploads
const MultipleFollowUpsSection = ({ followUps, balagruhaId, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    if (balagruhaId) {
      fetchCoaches(balagruhaId);
    }
  }, [balagruhaId]);

  const fetchCoaches = async (balId) => {
    try {
      const response = await getAnyUserBasedonRoleandBalagruha("coach", balId);
      if (response.success) {
        setCoaches(response.data.users || []);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
      setCoaches([]);
    }
  };

  const addFollowUp = () => {
    const newFollowUp = {
      followUpDate: "",
      hospital: "",
      doctor: "",
      assignedCoaches: [],
      status: "",
      descriptionFiles: [],
      testResultFiles: [],
      notes: "",
    };
    onChange([...followUps, newFollowUp]);
  };

  const removeFollowUp = (index) => {
    onChange(followUps.filter((_, i) => i !== index));
  };

  const updateFollowUp = (index, field, value) => {
    const updated = followUps.map((followUp, i) =>
      i === index ? { ...followUp, [field]: value } : followUp
    );
    onChange(updated);
  };

  const handleCoachToggle = (followUpIndex, coachId) => {
    const followUp = followUps[followUpIndex];
    const assignedCoaches = followUp.assignedCoaches || [];
    const newAssignedCoaches = assignedCoaches.includes(coachId)
      ? assignedCoaches.filter((id) => id !== coachId)
      : [...assignedCoaches, coachId];

    updateFollowUp(followUpIndex, "assignedCoaches", newAssignedCoaches);
  };

  const handleFileUpload = (index, e, fileType) => {
    const files = Array.from(e.target.files);
    const field =
      fileType === "description" ? "descriptionFiles" : "testResultFiles";

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

    const updated = followUps.map((followUp, i) =>
      i === index
        ? { ...followUp, [field]: [...(followUp[field] || []), ...validFiles] }
        : followUp
    );
    onChange(updated);
  };

  const handleRemoveFile = (followUpIndex, fileIndex, fileType) => {
    const field =
      fileType === "description" ? "descriptionFiles" : "testResultFiles";
    const updated = followUps.map((followUp, i) =>
      i === followUpIndex
        ? {
          ...followUp,
          [field]: (followUp[field] || []).filter((_, j) => j !== fileIndex),
        }
        : followUp
    );
    onChange(updated);
  };

  return (
    <div className="follow-up-section">
      <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h4>Follow-ups ({followUps.length})</h4>
        <span className="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
      </div>

      {isExpanded && (
        <div className="section-content">
          {followUps.map((followUp, followUpIndex) => (
            <div key={followUpIndex} className="follow-up-card">
              <div className="follow-up-header">
                <h5>Follow-up #{followUpIndex + 1}</h5>
                {followUps.length > 1 && (
                  <button
                    type="button"
                    className="remove-followup-btn"
                    onClick={() => removeFollowUp(followUpIndex)}
                  >
                    ❌ Remove Follow-up
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>Follow-up Date *</label>
                <input
                  type="date"
                  value={followUp.followUpDate || ""}
                  onChange={(e) =>
                    updateFollowUp(followUpIndex, "followUpDate", e.target.value)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Hospital/Location</label>
                <HospitalNameDropdown
                  value={followUp.hospital || ""}
                  onChange={(value) => {
                    updateFollowUp(followUpIndex, "hospital", value);
                  }}
                  placeholder="Search or add hospital name"
                />
              </div>

              <div className="form-group">
                <label>Doctor Name</label>
                <DoctorNameDropdown
                  value={followUp.doctor || ""}
                  onChange={(value) => {
                    updateFollowUp(followUpIndex, "doctor", value);
                  }}
                  placeholder="Search or add doctor name"
                />
              </div>

              <div className="form-group">
                <label>Assign to Coaches</label>
                {coaches.length > 0 ? (
                  <div className="coaches-list">
                    {coaches.map((coach) => (
                      <label key={coach._id} className="coach-checkbox">
                        <input
                          type="checkbox"
                          checked={
                            followUp.assignedCoaches?.includes(coach._id) ||
                            false
                          }
                          onChange={() =>
                            handleCoachToggle(followUpIndex, coach._id)
                          }
                        />
                        <span>{coach.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="no-coaches">
                    No coaches available for this Balagruha
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={followUp.status || ""}
                  onChange={(e) =>
                    updateFollowUp(followUpIndex, "status", e.target.value)
                  }
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* AC7: File uploads for follow-ups */}
              <div className="form-group">
                <label className="upload-button">
                  📎 Upload Description Files
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) =>
                      handleFileUpload(followUpIndex, e, "description")
                    }
                    hidden
                  />
                </label>
                {followUp.descriptionFiles &&
                  followUp.descriptionFiles.length > 0 && (
                    <div className="file-list">
                      {followUp.descriptionFiles.map((file, fileIndex) => (
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
                                followUpIndex,
                                fileIndex,
                                "description"
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
                <label className="upload-button">
                  📎 Upload Test Result Files
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={(e) =>
                      handleFileUpload(followUpIndex, e, "testResult")
                    }
                    hidden
                  />
                </label>
                {followUp.testResultFiles &&
                  followUp.testResultFiles.length > 0 && (
                    <div className="file-list">
                      {followUp.testResultFiles.map((file, fileIndex) => (
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
                                followUpIndex,
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
                <label>Notes</label>
                <textarea
                  value={followUp.notes || ""}
                  onChange={(e) =>
                    updateFollowUp(followUpIndex, "notes", e.target.value)
                  }
                  placeholder="Enter notes or additional information"
                  rows="2"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="add-followup-btn"
            onClick={addFollowUp}
          >
            ➕ Add Another Follow-up
          </button>
        </div>
      )}
    </div>
  );
};

export default MultipleFollowUpsSection;
