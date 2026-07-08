import React, { useEffect, useState } from "react";
import "./CheckInModal.css";
import { getAnyUserBasedonRoleandBalagruha } from "../../api";
import SymptomsSelector from "./SymptomsSelector";
import MultipleDoctorVisitsSection from "./MultipleDoctorVisitsSection";
import MultipleFollowUpsSection from "./MultipleFollowUpsSection";

const CheckInModal = ({ isOpen, onClose, onSubmit, studentData, balagruhas, editMode }) => {
  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    temperature: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    healthStatus: "normal",
    notes: "",
    uploadedImages: [],
    uploadedPdfs: [],
    // NEW FIELDS (Sprint6-Story-3: Arrays for multiple visits/followups)
    symptoms: [],
    customSymptom: "",
    doctorVisits: [],
    followUps: [],
  });
  const [selectedBalagruha, setSelectedBalagruha] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [students, setStudents] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);

  useEffect(() => {
    if (studentData) {

      const images = studentData.attachments?.filter(att => att.fileType.startsWith("image/")) || [];
      const pdfs = studentData.attachments?.filter(att => att.fileType === "application/pdf") || [];



      // S6-S2-BUG-002 FIX: Extract balagruha ID string from array (could be object or string)
      let balagruhaId = '';
      if (studentData.balagruhaIds && studentData.balagruhaIds.length > 0) {
        balagruhaId = typeof studentData.balagruhaIds[0] === 'object'
          ? studentData.balagruhaIds[0]._id || studentData.balagruhaIds[0].id
          : studentData.balagruhaIds[0];
      } else if (studentData.studentId && typeof studentData.studentId === 'object' && studentData.studentId.balagruhaIds && studentData.studentId.balagruhaIds.length > 0) {
        // Fallback: Check if inside populated studentId object
        const ids = studentData.studentId.balagruhaIds;
        balagruhaId = typeof ids[0] === 'object'
          ? ids[0]._id || ids[0].id
          : ids[0];
      }


      setSelectedBalagruha(balagruhaId);
      fetchStudents(balagruhaId);

      // Handle studentId setting (could be object or string)
      const sId = studentData.studentId && typeof studentData.studentId === 'object'
        ? studentData.studentId._id || studentData.studentId.id
        : studentData.studentId;
      setSelectedStudent(sId);

      // S6-S2-BUG-001 FIX: Check if date exists before converting (for new check-ins from Users tab)
      let dateString, timeString;
      if (studentData.date) {
        // Convert date to local timezone for editing (existing check-in)
        const dateObj = new Date(studentData.date);
        if (!isNaN(dateObj.getTime())) {
          const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
          dateString = localDate.toISOString().split("T")[0];
          timeString = localDate.toISOString().split("T")[1].slice(0, 5);
        } else {
          // Invalid date, use current date/time
          dateString = new Date().toISOString().split("T")[0];
          timeString = new Date().toTimeString().slice(0, 5);
        }
      } else {
        // No date provided (new check-in from Users tab), use current date/time
        dateString = new Date().toISOString().split("T")[0];
        timeString = new Date().toTimeString().slice(0, 5);
      }

      setFormData({
        studentId: studentData.studentId,
        studentName: studentData.userName,
        temperature: studentData.temperature || "",
        date: dateString,
        time: timeString,
        healthStatus: studentData.healthStatus || "normal",
        notes: studentData.notes || "",
        uploadedImages: images,
        uploadedPdfs: pdfs,
        // NEW FIELDS (Sprint6-Story-3: Handle both old and new formats)
        symptoms: studentData.symptoms || [],
        customSymptom: studentData.customSymptom || "",
        // Convert old single doctorVisit to new doctorVisits array
        // BugFix: Convert visitDate from Date object to "YYYY-MM-DD" string for input field
        doctorVisits: studentData.doctorVisits && studentData.doctorVisits.length > 0
          ? studentData.doctorVisits.map(dv => ({
            ...dv,
            visitDate: dv.visitDate ? new Date(dv.visitDate).toISOString().split('T')[0] : "",
          }))
          : studentData.doctorVisit && (studentData.doctorVisit.doctorName || studentData.doctorVisit.hospitalName)
            ? [{
              ...studentData.doctorVisit,
              visitDate: studentData.doctorVisit.visitDate ? new Date(studentData.doctorVisit.visitDate).toISOString().split('T')[0] : ""
            }]
            : [],
        // Convert old single followUp to new followUps array
        // BugFix: Convert followUpDate from Date object to "YYYY-MM-DD" string for input field
        followUps: studentData.followUps && studentData.followUps.length > 0
          ? studentData.followUps.map(fu => ({
            ...fu,
            followUpDate: fu.followUpDate ? new Date(fu.followUpDate).toISOString().split('T')[0] : "",
            // Also convert visitDate for doctor visits if present
          }))
          : studentData.followUp && studentData.followUp.followUpDate
            ? [{
              ...studentData.followUp,
              followUpDate: new Date(studentData.followUp.followUpDate).toISOString().split('T')[0]
            }]
            : [],
      })
      // setSelectedStudent(studentData.balagruhaIds[0]);
      // setSelectedStudent(studentData.studentId)
    } else {
      setFormData({
        studentId: "",
        studentName: "",
        temperature: "",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toTimeString().slice(0, 5),
        healthStatus: "normal",
        notes: "",
        uploadedImages: [],
        uploadedPdfs: [],
        symptoms: [],
        customSymptom: "",
        doctorVisits: [],
        followUps: [],
      })
      setSelectedBalagruha("");
      setSelectedStudent("");
      setStudents([]);
      setRemovedAttachmentIds([]);
    }




  }, [studentData]);

  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  const validateForm = () => {
    if (!selectedBalagruha) {
      alert("Please select Balagruha.");
      return false;
    }

    if (!selectedStudent) {
      alert("Please select Student.");
      return false;
    }

    if (!formData.symptoms || formData.symptoms.length === 0) {
      alert("Please select at least one symptom.");
      return false;
    }

    if (formData.symptoms.includes("other") && !formData.customSymptom.trim()) {
      alert("Please enter the other symptom.");
      return false;
    }

    if (!formData.date) {
      alert("Please select check-in date.");
      return false;
    }

    if (formData.date > today) {
      alert("Check-in date cannot be a future date.");
      return false;
    }

    if (!formData.time) {
      alert("Please select check-in time.");
      return false;
    }

    if (formData.date === today) {
      const currentTime = new Date().toTimeString().slice(0, 5);

      if (formData.time > currentTime) {
        alert("Check-in time cannot be in the future.");
        return false;
      }
    }

    if (formData.temperature) {
      const temp = Number(formData.temperature);

      if (temp < 30 || temp > 45) {
        alert("Temperature must be between 30°C and 45°C.");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const checkInId = studentData?._id || null;
    onSubmit(formData, checkInId, removedAttachmentIds);
    onClose();
  };

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
    const student = students.find((s) => s._id === e.target.value);
    setFormData({
      ...formData,
      studentId: e.target.value,
      studentName: student?.name || "",
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValid =
        file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024; // 5MB limit
      if (!isValid) {
        alert(`File ${file.name} is either not an image or exceeds 5MB limit`);
      }
      return isValid;
    });
    setFormData((prev) => ({
      ...prev,
      uploadedImages: [...prev.uploadedImages, ...validFiles],
    }));
  };

  const handlePdfUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      const isValid =
        file.type === "application/pdf" && file.size <= 10 * 1024 * 1024; // 10MB limit
      if (!isValid) {
        alert(`File ${file.name} is either not a PDF or exceeds 10MB limit`);
      }
      return isValid;
    });
    setFormData((prev) => ({
      ...prev,
      uploadedPdfs: [...prev.uploadedPdfs, ...validFiles],
    }));
  };

  const handleRemoveImage = (index) => {
    const fileToRemove = formData.uploadedImages[index];
    // If it's a database attachment (has _id), track it for deletion
    if (fileToRemove && !(fileToRemove instanceof File) && fileToRemove._id) {
      setRemovedAttachmentIds((prev) => [...prev, fileToRemove._id]);
    }
    setFormData((prev) => ({
      ...prev,
      uploadedImages: prev.uploadedImages.filter((_, i) => i !== index),
    }));
  };

  const handleRemovePdf = (index) => {
    const fileToRemove = formData.uploadedPdfs[index];
    // If it's a database attachment (has _id), track it for deletion
    if (fileToRemove && !(fileToRemove instanceof File) && fileToRemove._id) {
      setRemovedAttachmentIds((prev) => [...prev, fileToRemove._id]);
    }
    setFormData((prev) => ({
      ...prev,
      uploadedPdfs: prev.uploadedPdfs.filter((_, i) => i !== index),
    }));
  };

  const fetchStudents = async (balId) => {

    if (!balId) {

      setStudents([]);
      return;
    }

    setSelectedBalagruha(balId);

    const response = await getAnyUserBasedonRoleandBalagruha("student", balId);


    if (response.success) {
      // Backend already filters by balagruhaId, no need to filter again
      const students = response?.data?.users || [];

      setStudents(students);
    } else {

      setStudents([]);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editMode ? "Edit Health Check-in" : "New Health Check-in"}</h3>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Balagruha</label>
            <select
              value={selectedBalagruha}
              onChange={(e) => fetchStudents(e.target.value)}
              required
            >
              <option value="">Select Balagruha</option>
              {balagruhas.map((bal) => (
                <option key={bal._id} value={bal._id}>
                  {bal.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Student</label>
            <select
              value={selectedStudent}
              onChange={handleStudentChange}
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Temperature (°C)</label>
            <input
              type="number"
              step="any"
              min="30"
              max="45"
              value={formData.temperature}
              onChange={(e) =>
                setFormData({ ...formData, temperature: e.target.value })
              }
              placeholder="Optional - Enter if measured"
              autoComplete="off"
            />
          </div>

          {/* NEW: Symptoms Section */}
          <SymptomsSelector
            symptoms={formData.symptoms}
            customSymptom={formData.customSymptom}
            onChange={(updates) => setFormData({ ...formData, ...updates })}
          />

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                max={today}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Health Status</label>
            <select
              value={formData.healthStatus}
              onChange={(e) =>
                setFormData({ ...formData, healthStatus: e.target.value })
              }
              required
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* NEW: Multiple Doctor Visits Section (Sprint6-Story-3-AC5) */}
          <MultipleDoctorVisitsSection
            doctorVisits={formData.doctorVisits}
            onChange={(doctorVisits) => setFormData({ ...formData, doctorVisits })}
          />

          {/* NEW: Multiple Follow-ups Section (Sprint6-Story-3-AC6-AC7) */}
          <MultipleFollowUpsSection
            followUps={formData.followUps}
            balagruhaId={selectedBalagruha}
            onChange={(followUps) => setFormData({ ...formData, followUps })}
          />

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows="3"
            ></textarea>
          </div>

          {/* File Upload Section */}
          <div className="form-group">
            {/* <label>Upload Images (Max 5MB each)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            <div className="uploaded-files">
              {formData.uploadedImages.map((file, index) => (
                <div key={index} className="uploaded-item">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Uploaded"
                    width="50"
                    height="50"
                  />
                  <button onClick={() => handleRemoveImage(index)}>❌</button>
                </div>
              ))}
            </div> */}

            <label className="upload-button">
              Upload Images (Max 5MB each)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                hidden
              />
            </label>

            {/* <div className="uploaded-files">
              {formData.uploadedImages.map((file, index) => (
                <div key={index} className="uploaded-item">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Uploaded"
                    width="50"
                    height="50"
                  />
                  <button onClick={() => handleRemoveImage(index)}>❌</button>
                </div>
              ))}
            </div> */}

            <div className="uploaded-files">
              {formData.uploadedImages.map((file, index) => (
                <div key={index} className="uploaded-item">
                  {file instanceof File ? (
                    // New file upload - show file name
                    <span>{file.name}</span>
                  ) : (
                    // Existing database attachment - show image preview
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || "Uploaded image"}
                        width="50"
                        height="50"
                        style={{ cursor: "pointer" }}
                      />
                    </a>
                  )}
                  <button type="button" onClick={() => handleRemoveImage(index)}>❌</button>
                </div>
              ))}
            </div>

          </div>

          <div className="form-group">
            {/* <label>Upload PDFs (Max 10MB each)</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handlePdfUpload}
            />
            <div className="uploaded-files">
              {formData.uploadedPdfs.map((file, index) => (
                <div key={index} className="uploaded-item">
                  <span>{file.name}</span>
                  <button onClick={() => handleRemovePdf(index)}>❌</button>
                </div>
              ))}
            </div> */}

            <label className="upload-button">
              Upload PDFs (Max 10MB each)
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handlePdfUpload}
                hidden
              />
            </label>

            <div className="uploaded-files">
              {formData.uploadedPdfs.map((file, index) => (
                <div key={index} className="uploaded-item">
                  {file instanceof File ? (
                    // New file upload - show file name
                    <span>{file.name}</span>
                  ) : (
                    // Existing database attachment - show link
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {file.fileName || `PDF-${index + 1}`}
                    </a>
                  )}
                  <button type="button" onClick={() => handleRemovePdf(index)}>❌</button>
                </div>
              ))}
            </div>
          </div>


          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div >
  );
};

export default CheckInModal;
