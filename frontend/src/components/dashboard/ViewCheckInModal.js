import React from "react";
import "./CheckInModal.css";

const ViewCheckInModal = ({ isOpen, onClose, checkInData, onEdit }) => {
  if (!isOpen || !checkInData) return null;

  // Format date helper
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format symptoms helper
  const formatSymptoms = () => {
    if (!checkInData.symptoms || checkInData.symptoms.length === 0) return 'None';
    const symptomLabels = {
      cough_cold: 'Cough + Cold',
      fever: 'Fever',
      stomach_ache: 'Stomach ache',
      headache: 'Headache',
      injury: 'Injury',
      other: 'Other'
    };
    const symptoms = checkInData.symptoms
      .filter(s => s)
      .map(s => symptomLabels[s] || s)
      .join(', ');
    if (checkInData.customSymptom) {
      return `${symptoms} (${checkInData.customSymptom})`;
    }
    return symptoms;
  };

  // Get doctor visits (handle both old and new formats)
  const getDoctorVisits = () => {
    if (checkInData.doctorVisits && checkInData.doctorVisits.length > 0) {
      return checkInData.doctorVisits;
    } else if (checkInData.doctorVisit && (checkInData.doctorVisit.doctorName || checkInData.doctorVisit.hospitalName)) {
      return [checkInData.doctorVisit];
    }
    return [];
  };

  // Get follow-ups (handle both old and new formats)
  const getFollowUps = () => {
    if (checkInData.followUps && checkInData.followUps.length > 0) {
      return checkInData.followUps;
    } else if (checkInData.followUp && checkInData.followUp.followUpDate) {
      return [checkInData.followUp];
    }
    return [];
  };

  // Get general attachments (images and PDFs)
  const getImages = () => {
    return checkInData.attachments?.filter(att => att.fileType?.startsWith("image/")) || [];
  };

  const getPdfs = () => {
    return checkInData.attachments?.filter(att => att.fileType === "application/pdf") || [];
  };

  const doctorVisits = getDoctorVisits();
  const followUps = getFollowUps();
  const images = getImages();
  const pdfs = getPdfs();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3>Medical Check-in Details</h3>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="view-modal-body" style={{ padding: '20px' }}>
          {/* Basic Information Section */}
          <div className="view-section">
            <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>Basic Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="view-field">
                <label style={{ fontWeight: 600, color: '#666', display: 'block', marginBottom: '5px' }}>Student Name:</label>
                <div style={{ fontSize: '15px' }}>{checkInData.userName || '-'}</div>
              </div>
              <div className="view-field">
                <label style={{ fontWeight: 600, color: '#666', display: 'block', marginBottom: '5px' }}>Date & Time:</label>
                <div style={{ fontSize: '15px' }}>{formatDate(checkInData.date)}</div>
              </div>
              <div className="view-field">
                <label style={{ fontWeight: 600, color: '#666', display: 'block', marginBottom: '5px' }}>Temperature:</label>
                <div style={{ fontSize: '15px' }}>{checkInData.temperature ? `${checkInData.temperature}°C` : 'Not measured'}</div>
              </div>
              <div className="view-field">
                <label style={{ fontWeight: 600, color: '#666', display: 'block', marginBottom: '5px' }}>Health Status:</label>
                <div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor:
                      checkInData.healthStatus === 'normal' ? '#d1fae5' :
                      checkInData.healthStatus === 'important' ? '#fed7aa' :
                      '#fecaca',
                    color:
                      checkInData.healthStatus === 'normal' ? '#065f46' :
                      checkInData.healthStatus === 'important' ? '#92400e' :
                      '#991b1b'
                  }}>
                    {checkInData.healthStatus?.toUpperCase() || 'NORMAL'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms Section */}
          <div className="view-section">
            <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>Symptoms</h4>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                {formatSymptoms()}
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {checkInData.notes && (
            <div className="view-section">
              <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>Notes</h4>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                  {checkInData.notes}
                </div>
              </div>
            </div>
          )}

          {/* Doctor Visits Section */}
          {doctorVisits.length > 0 && (
            <div className="view-section">
              <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>
                Doctor Visits ({doctorVisits.length})
              </h4>
              {doctorVisits.map((visit, index) => (
                <div key={index} style={{
                  marginBottom: '15px',
                  padding: '15px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '10px', color: '#4f46e5', fontSize: '15px' }}>
                    Visit {index + 1}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Doctor Name:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{visit.doctorName || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Hospital:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{visit.hospitalName || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Visit Date:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{formatDateOnly(visit.visitDate)}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Test Details:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{visit.testDetails || '-'}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Conclusion:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px', whiteSpace: 'pre-wrap' }}>{visit.conclusion || '-'}</div>
                    </div>
                    {/* Prescription Files */}
                    {visit.prescriptionFiles && visit.prescriptionFiles.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Prescriptions:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                          {visit.prescriptionFiles.map((file, fileIndex) => (
                            <a
                              key={fileIndex}
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '6px',
                                fontSize: '13px',
                                textDecoration: 'none',
                                display: 'inline-block'
                              }}
                            >
                              📄 Prescription {fileIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Test Result Files */}
                    {visit.testResultFiles && visit.testResultFiles.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Test Results:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                          {visit.testResultFiles.map((file, fileIndex) => (
                            <a
                              key={fileIndex}
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '6px',
                                fontSize: '13px',
                                textDecoration: 'none',
                                display: 'inline-block'
                              }}
                            >
                              📋 Test Result {fileIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Follow-ups Section */}
          {followUps.length > 0 && (
            <div className="view-section">
              <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>
                Follow-ups ({followUps.length})
              </h4>
              {followUps.map((followUp, index) => (
                <div key={index} style={{
                  marginBottom: '15px',
                  padding: '15px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '10px', color: '#4f46e5', fontSize: '15px' }}>
                    Follow-up {index + 1}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Follow-up Date:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{formatDateOnly(followUp.followUpDate)}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Hospital/Location:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{followUp.hospital || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Doctor:</label>
                      <div style={{ fontSize: '14px', marginTop: '3px' }}>{followUp.doctor || '-'}</div>
                    </div>
                    <div>
                      <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Status:</label>
                      <div>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor:
                            followUp.status === 'completed' ? '#d1fae5' :
                            followUp.status === 'scheduled' ? '#dbeafe' :
                            '#fed7aa',
                          color:
                            followUp.status === 'completed' ? '#065f46' :
                            followUp.status === 'scheduled' ? '#1e40af' :
                            '#92400e'
                        }}>
                          {followUp.status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>
                    {followUp.assignedCoaches && followUp.assignedCoaches.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Assigned Coaches:</label>
                        <div style={{ fontSize: '14px', marginTop: '3px' }}>
                          {followUp.assignedCoaches.map(coach => coach.name).join(', ')}
                        </div>
                      </div>
                    )}
                    {followUp.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Notes:</label>
                        <div style={{ fontSize: '14px', marginTop: '3px', whiteSpace: 'pre-wrap' }}>{followUp.notes}</div>
                      </div>
                    )}
                    {/* Description Files */}
                    {followUp.descriptionFiles && followUp.descriptionFiles.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Description Files:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                          {followUp.descriptionFiles.map((file, fileIndex) => (
                            <a
                              key={fileIndex}
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                borderRadius: '6px',
                                fontSize: '13px',
                                textDecoration: 'none',
                                display: 'inline-block'
                              }}
                            >
                              📎 File {fileIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Test Result Files */}
                    {followUp.testResultFiles && followUp.testResultFiles.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontWeight: 600, color: '#666', fontSize: '13px' }}>Test Results:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                          {followUp.testResultFiles.map((file, fileIndex) => (
                            <a
                              key={fileIndex}
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                borderRadius: '6px',
                                fontSize: '13px',
                                textDecoration: 'none',
                                display: 'inline-block'
                              }}
                            >
                              📋 Test Result {fileIndex + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* General Attachments Section */}
          {(images.length > 0 || pdfs.length > 0) && (
            <div className="view-section">
              <h4 style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '8px', marginBottom: '15px', color: '#4f46e5' }}>
                General Attachments
              </h4>
              <div style={{ marginBottom: '20px' }}>
                {images.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontWeight: 600, color: '#666', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                      Images ({images.length}):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {images.map((img, index) => (
                        <a
                          key={index}
                          href={img.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block' }}
                        >
                          <img
                            src={img.fileUrl}
                            alt={`Attachment ${index + 1}`}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '2px solid #e5e7eb',
                              cursor: 'pointer'
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {pdfs.length > 0 && (
                  <div>
                    <label style={{ fontWeight: 600, color: '#666', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                      PDF Documents ({pdfs.length}):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {pdfs.map((pdf, index) => (
                        <a
                          key={index}
                          href={pdf.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textDecoration: 'none',
                            display: 'inline-block',
                            fontWeight: 500
                          }}
                        >
                          📄 {pdf.fileName || `Document ${index + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="medic-action-button"
            onClick={() => onEdit(checkInData)}
            style={{ padding: '10px 24px', backgroundColor: '#4f46e5', color: 'white' }}
          >
            📝 Edit Check-in
          </button>
          <button
            type="button"
            className="medic-action-button secondary"
            onClick={onClose}
            style={{ padding: '10px 24px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewCheckInModal;
