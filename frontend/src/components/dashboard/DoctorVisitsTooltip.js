import React from 'react';
import './StudentDetailsTooltip.css';

const DoctorVisitsTooltip = ({ doctorVisits, position, onMouseLeave }) => {
  if (!doctorVisits || doctorVisits.length === 0) {
    return null;
  }

  return (
    <div
      className="student-details-tooltip"
      style={{
        left: `${position.x}px`,
        top: position.alignY === 'bottom' ? 'auto' : `${position.y}px`,
        bottom: position.alignY === 'bottom' ? `${position.y}px` : 'auto',
      }}
      onMouseLeave={onMouseLeave}
    >
      <div className="tooltip-header">
        <h4>Doctor Visits ({doctorVisits.length})</h4>
      </div>
      <div className="tooltip-content">
        {doctorVisits.map((visit, index) => (
          <div key={index}>
            {index > 0 && <div className="tooltip-section-divider" />}
            <div className="tooltip-section-title">Visit #{index + 1}</div>

            {visit.doctorName && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Doctor:</span>
                <span className="tooltip-value">{visit.doctorName}</span>
              </div>
            )}

            {visit.hospitalName && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Hospital:</span>
                <span className="tooltip-value">{visit.hospitalName}</span>
              </div>
            )}

            {visit.visitDate && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Visit Date:</span>
                <span className="tooltip-value">
                  {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {visit.testDetails && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Tests:</span>
                <span className="tooltip-value">{visit.testDetails}</span>
              </div>
            )}

            {visit.conclusion && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Conclusion:</span>
                <span className="tooltip-value">{visit.conclusion}</span>
              </div>
            )}

            {visit.prescriptionFiles && visit.prescriptionFiles.length > 0 && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Prescriptions:</span>
                <span className="tooltip-value">{visit.prescriptionFiles.length} file(s)</span>
              </div>
            )}

            {visit.testResultFiles && visit.testResultFiles.length > 0 && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Test Results:</span>
                <span className="tooltip-value">{visit.testResultFiles.length} file(s)</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorVisitsTooltip;
