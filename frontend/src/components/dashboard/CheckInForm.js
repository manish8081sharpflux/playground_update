import React, { useState, useEffect } from "react";
import "./CheckInForm.css";
import SymptomsSelector from "./SymptomsSelector";
import MultipleDoctorVisitsSection from "./MultipleDoctorVisitsSection";
import MultipleFollowUpsSection from "./MultipleFollowUpsSection";

const CheckInForm = ({
  studentData,
  checkInData,
  mode,
  onSave,
  onCancel,
  balagruhas,
}) => {
  // Form state
  const [temperature, setTemperature] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [healthStatus, setHealthStatus] = useState("Healthy");
  const [doctorVisits, setDoctorVisits] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [notes, setNotes] = useState("");
  const [attachmentImages, setAttachmentImages] = useState([]);
  const [attachmentPDFs, setAttachmentPDFs] = useState([]);

  // Handle symptoms change from SymptomsSelector
  const handleSymptomsUpdate = (updates) => {
    if (updates.symptoms) {
      setSymptoms(updates.symptoms);
    }
    if (updates.customSymptom !== undefined) {
      setCustomSymptom(updates.customSymptom);
    }
  };

  // Get balagruha name from ID
  const getBalagruhaName = (balagruhaId) => {
    if (!balagruhaId) return "N/A";
    const balagruha = balagruhas.find((b) => b._id === balagruhaId || b.id === balagruhaId);
    return balagruha ? balagruha.name : "N/A";
  };

  // Extract balagruha ID from studentData
  const balagruhaId =
    studentData.balagruhaIds && studentData.balagruhaIds.length > 0
      ? typeof studentData.balagruhaIds[0] === "object"
        ? studentData.balagruhaIds[0]._id || studentData.balagruhaIds[0].id
        : studentData.balagruhaIds[0]
      : "";

  // Initialize form fields
  useEffect(() => {
    if (mode === "edit" && checkInData) {
      // Editing existing check-in - populate all fields
      setTemperature(checkInData.temperature || "");
      setSymptoms(checkInData.symptoms || []);
      setCustomSymptom(checkInData.customSymptom || "");
      setHealthStatus(checkInData.healthStatus || "Healthy");
      setNotes(checkInData.notes || "");
      setDoctorVisits(checkInData.doctorVisits || []);
      setFollowUps(checkInData.followUps || []);
      setAttachmentImages(checkInData.attachments?.filter((a) => a.type === "image") || []);
      setAttachmentPDFs(checkInData.attachments?.filter((a) => a.type === "pdf") || []);

      // Handle date/time
      if (checkInData.date) {
        const dateObj = new Date(checkInData.date);
        if (!isNaN(dateObj.getTime())) {
          const localDate = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
          setDate(localDate.toISOString().split("T")[0]);
          setTime(localDate.toISOString().split("T")[1].slice(0, 5));
        } else {
          setDate(new Date().toISOString().split("T")[0]);
          setTime(new Date().toTimeString().slice(0, 5));
        }
      } else {
        setDate(new Date().toISOString().split("T")[0]);
        setTime(new Date().toTimeString().slice(0, 5));
      }
    } else {
      // Creating new check-in - use current date/time
      setDate(new Date().toISOString().split("T")[0]);
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [mode, checkInData]);

  // Handle form submission
  const handleSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Validate required fields
    if (!temperature || !date || !time) {
      alert("Please fill in all required fields (temperature, date, time)");
      return;
    }

    // Prepare form data
    const formData = new FormData();
    formData.append("studentId", studentData.studentId);
    formData.append("balagruhaId", balagruhaId);
    formData.append("temperature", temperature);
    formData.append("date", date);
    formData.append("time", time);
    formData.append("healthStatus", healthStatus);
    formData.append("notes", notes);
    formData.append("symptoms", JSON.stringify(symptoms));
    formData.append("customSymptom", customSymptom);
    formData.append("doctorVisits", JSON.stringify(doctorVisits));
    formData.append("followUps", JSON.stringify(followUps));

    // Add new image files
    attachmentImages.forEach((img) => {
      if (img.file) {
        formData.append("attachments", img.file);
      }
    });

    // Add new PDF files
    attachmentPDFs.forEach((pdf) => {
      if (pdf.file) {
        formData.append("attachments", pdf.file);
      }
    });

    // Add existing attachments (for edit mode)
    if (mode === "edit") {
      const existingAttachments = [
        ...attachmentImages.filter((img) => !img.file),
        ...attachmentPDFs.filter((pdf) => !pdf.file),
      ];
      formData.append("existingAttachments", JSON.stringify(existingAttachments));
    }

    onSave(formData);
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validImages = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    const newImages = validImages.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: "image",
    }));

    setAttachmentImages([...attachmentImages, ...newImages]);
  };

  // Handle PDF upload
  const handlePDFUpload = (e) => {
    const files = Array.from(e.target.files);
    const validPDFs = files.filter((file) => {
      if (file.type !== "application/pdf") {
        alert(`${file.name} is not a PDF file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds 10MB limit`);
        return false;
      }
      return true;
    });

    const newPDFs = validPDFs.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: "pdf",
      name: file.name,
    }));

    setAttachmentPDFs([...attachmentPDFs, ...newPDFs]);
  };

  // Remove image
  const removeImage = (index) => {
    const newImages = [...attachmentImages];
    if (newImages[index].url && newImages[index].file) {
      URL.revokeObjectURL(newImages[index].url);
    }
    newImages.splice(index, 1);
    setAttachmentImages(newImages);
  };

  // Remove PDF
  const removePDF = (index) => {
    const newPDFs = [...attachmentPDFs];
    if (newPDFs[index].url && newPDFs[index].file) {
      URL.revokeObjectURL(newPDFs[index].url);
    }
    newPDFs.splice(index, 1);
    setAttachmentPDFs(newPDFs);
  };

  return (
    <div className="checkin-form-container">
      <div className="checkin-form-header">
        <h3>{mode === "create" ? "Create New Check-in" : "Edit Check-in"}</h3>
        <div className="student-info-display">
          <div className="info-item">
            <label>Student:</label>
            <span>{studentData.userName || "N/A"}</span>
          </div>
          <div className="info-item">
            <label>Balagruha:</label>
            <span>{getBalagruhaName(balagruhaId)}</span>
          </div>
        </div>
      </div>

      <div className="checkin-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>
                Date <span className="required">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>
                Time <span className="required">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Temperature (°F) <span className="required">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g., 98.6"
                required
              />
            </div>
            <div className="form-group">
              <label>Health Status</label>
              <select
                value={healthStatus}
                onChange={(e) => setHealthStatus(e.target.value)}
              >
                <option value="Healthy">Healthy</option>
                <option value="Sick">Sick</option>
                <option value="Recovering">Recovering</option>
                <option value="Injury">Injury</option>
              </select>
            </div>
          </div>
        </div>

        {/* Symptoms Section */}
        <div className="form-section">
          <h4>Symptoms</h4>
          <SymptomsSelector
            symptoms={symptoms}
            customSymptom={customSymptom}
            onChange={handleSymptomsUpdate}
          />
        </div>

        {/* Doctor Visits Section */}
        <div className="form-section">
          <h4>Doctor Visits</h4>
          <MultipleDoctorVisitsSection
            doctorVisits={doctorVisits}
            onChange={setDoctorVisits}
          />
        </div>

        {/* Follow-ups Section */}
        <div className="form-section">
          <h4>Follow-ups</h4>
          <MultipleFollowUpsSection
            followUps={followUps}
            balagruhaId={balagruhaId}
            onChange={setFollowUps}
          />
        </div>

        {/* Notes Section */}
        <div className="form-section">
          <h4>Notes</h4>
          <div className="form-group">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the check-in..."
              rows="4"
            />
          </div>
        </div>

        {/* Attachments Section */}
        <div className="form-section">
          <h4>Attachments</h4>

          {/* Image Attachments */}
          <div className="form-group">
            <label>Images (Max 5MB each)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            {attachmentImages.length > 0 && (
              <div className="attachments-preview">
                {attachmentImages.map((img, index) => (
                  <div key={index} className="attachment-item">
                    <img src={img.url} alt={`Attachment ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PDF Attachments */}
          <div className="form-group">
            <label>PDFs (Max 10MB each)</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handlePDFUpload}
            />
            {attachmentPDFs.length > 0 && (
              <div className="attachments-list">
                {attachmentPDFs.map((pdf, index) => (
                  <div key={index} className="attachment-item-pdf">
                    <span>{pdf.name || `PDF ${index + 1}`}</span>
                    <button
                      type="button"
                      onClick={() => removePDF(index)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} className="btn-save">
            {mode === "create" ? "Create Check-in" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
