import React from 'react';
import './StudentDetailsTooltip.css';

const StudentDetailsTooltip = ({ checkIn, position }) => {
  if (!checkIn) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatSymptoms = () => {
    if (!checkIn.symptoms || checkIn.symptoms.length === 0) return 'None';

    const symptomLabels = {
      cough_cold: 'Cough + Cold',
      fever: 'Fever',
      stomach_ache: 'Stomach ache',
      headache: 'Headache',
      injury: 'Injury',
      other: 'Other'
    };

    const symptoms = checkIn.symptoms
      .filter(s => s)
      .map(s => symptomLabels[s] || s)
      .join(', ');

    if (checkIn.customSymptom) {
      return `${symptoms} (${checkIn.customSymptom})`;
    }

    return symptoms;
  };

  const renderFileLinks = (files, label) => {
    if (!files || files.length === 0) return null;

    return (
      <div className="tooltip-detail-row">
        <span className="tooltip-label">{label}:</span>
        <div className="tooltip-files">
          {files.map((file, index) => (
            <a
              key={index}
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tooltip-file-link"
            >
              {file.fileName}
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="student-details-tooltip"
      style={{
        left: `${position.x}px`,
        top: position.alignY === 'bottom' ? 'auto' : `${position.y}px`,
        bottom: position.alignY === 'bottom' ? `${position.y}px` : 'auto',
      }}
    >
      <div className="tooltip-header">
        <h4>{checkIn.userName}</h4>
      </div>

      <div className="tooltip-content">
        <div className="tooltip-detail-row">
          <span className="tooltip-label">Date & Time:</span>
          <span className="tooltip-value">{formatDate(checkIn.date)}</span>
        </div>

        <div className="tooltip-detail-row">
          <span className="tooltip-label">Temperature:</span>
          <span className={`tooltip-value ${
            checkIn.temperature >= 38.0 ? 'critical' :
            checkIn.temperature >= 37.5 ? 'important' : 'normal'
          }`}>
            {checkIn.temperature}°C
          </span>
        </div>

        <div className="tooltip-detail-row">
          <span className="tooltip-label">Health Status:</span>
          <span className={`tooltip-badge tooltip-status-${checkIn.healthStatus}`}>
            {checkIn.healthStatus}
          </span>
        </div>

        <div className="tooltip-detail-row">
          <span className="tooltip-label">Symptoms:</span>
          <span className="tooltip-value">{formatSymptoms()}</span>
        </div>

        {checkIn.doctorVisit && (checkIn.doctorVisit.doctorName || checkIn.doctorVisit.hospitalName) && (
          <>
            <div className="tooltip-section-divider"></div>
            <div className="tooltip-section-title">Doctor Visit</div>

            {checkIn.doctorVisit.doctorName && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Doctor:</span>
                <span className="tooltip-value">{checkIn.doctorVisit.doctorName}</span>
              </div>
            )}

            {checkIn.doctorVisit.hospitalName && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Hospital:</span>
                <span className="tooltip-value">{checkIn.doctorVisit.hospitalName}</span>
              </div>
            )}

            {checkIn.doctorVisit.visitDate && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Visit Date:</span>
                <span className="tooltip-value">{formatDate(checkIn.doctorVisit.visitDate)}</span>
              </div>
            )}

            {checkIn.doctorVisit.testDetails && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Test Details:</span>
                <span className="tooltip-value">{checkIn.doctorVisit.testDetails}</span>
              </div>
            )}

            {checkIn.doctorVisit.conclusion && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Conclusion:</span>
                <span className="tooltip-value">{checkIn.doctorVisit.conclusion}</span>
              </div>
            )}

            {renderFileLinks(checkIn.doctorVisit.prescriptionFiles, 'Prescriptions')}
            {renderFileLinks(checkIn.doctorVisit.testResultFiles, 'Test Results')}
          </>
        )}

        {checkIn.followUp && (checkIn.followUp.followUpDate || checkIn.followUp.hospital) && (
          <>
            <div className="tooltip-section-divider"></div>
            <div className="tooltip-section-title">Follow-up</div>

            {checkIn.followUp.followUpDate && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Date:</span>
                <span className="tooltip-value">{formatDate(checkIn.followUp.followUpDate)}</span>
              </div>
            )}

            {checkIn.followUp.hospital && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Location:</span>
                <span className="tooltip-value">{checkIn.followUp.hospital}</span>
              </div>
            )}

            {checkIn.followUp.doctor && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Doctor:</span>
                <span className="tooltip-value">{checkIn.followUp.doctor}</span>
              </div>
            )}

            {checkIn.followUp.status && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Status:</span>
                <span className={`tooltip-badge tooltip-status-${checkIn.followUp.status}`}>
                  {checkIn.followUp.status}
                </span>
              </div>
            )}
          </>
        )}

        {checkIn.notes && (
          <>
            <div className="tooltip-section-divider"></div>
            <div className="tooltip-detail-row">
              <span className="tooltip-label">Notes:</span>
              <span className="tooltip-value">{checkIn.notes}</span>
            </div>
          </>
        )}

        {checkIn.attachments && checkIn.attachments.length > 0 && (
          <>
            <div className="tooltip-section-divider"></div>
            {renderFileLinks(checkIn.attachments, 'Attachments')}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDetailsTooltip;
