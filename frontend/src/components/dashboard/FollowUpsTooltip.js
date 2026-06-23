import React from 'react';
import './StudentDetailsTooltip.css';

const FollowUpsTooltip = ({ followUps, position, onMouseLeave }) => {
  if (!followUps || followUps.length === 0) {
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
        <h4>Follow-ups ({followUps.length})</h4>
      </div>
      <div className="tooltip-content">
        {followUps.map((followUp, index) => (
          <div key={index}>
            {index > 0 && <div className="tooltip-section-divider" />}
            <div className="tooltip-section-title">Follow-up #{index + 1}</div>

            {followUp.followUpDate && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Date:</span>
                <span className="tooltip-value">
                  {new Date(followUp.followUpDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}

            {followUp.doctor && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Doctor:</span>
                <span className="tooltip-value">{followUp.doctor}</span>
              </div>
            )}

            {followUp.hospital && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Hospital:</span>
                <span className="tooltip-value">{followUp.hospital}</span>
              </div>
            )}

            {followUp.status && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Status:</span>
                <span className="tooltip-value">
                  <span className={`tooltip-badge tooltip-status-${followUp.status}`}>
                    {followUp.status}
                  </span>
                </span>
              </div>
            )}

            {followUp.assignedCoaches && followUp.assignedCoaches.length > 0 && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Assigned Coaches:</span>
                <span className="tooltip-value">{followUp.assignedCoaches.length} coach(es)</span>
              </div>
            )}

            {followUp.notes && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Notes:</span>
                <span className="tooltip-value">{followUp.notes}</span>
              </div>
            )}

            {followUp.descriptionFiles && followUp.descriptionFiles.length > 0 && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Description Files:</span>
                <span className="tooltip-value">{followUp.descriptionFiles.length} file(s)</span>
              </div>
            )}

            {followUp.testResultFiles && followUp.testResultFiles.length > 0 && (
              <div className="tooltip-detail-row">
                <span className="tooltip-label">Test Results:</span>
                <span className="tooltip-value">{followUp.testResultFiles.length} file(s)</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FollowUpsTooltip;
