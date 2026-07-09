import React from "react";
import "./SymptomsSelector.css";

const SYMPTOM_OPTIONS = [
  { value: "cough_cold", label: "Cough + Cold" },
  { value: "fever", label: "Fever" },
  { value: "stomach_ache", label: "Stomach ache" },
  { value: "headache", label: "Headache" },
  { value: "injury", label: "Injury" },
  { value: "other", label: "Other (Type your own)" },
];

const SymptomsSelector = ({ symptoms, customSymptom, onChange }) => {
  const handleSymptomChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    onChange({ symptoms: selectedOptions });
  };

  const handleCustomSymptomChange = (e) => {
    onChange({ customSymptom: e.target.value });
  };

  const showCustomInput = symptoms.includes("other");

  return (
    <div className="symptoms-selector">
      <div className="form-group">
        <label>Symptoms *</label>
        <select
          multiple
          value={symptoms}
          onChange={handleSymptomChange}
          className="symptoms-multiselect"
        >
          {SYMPTOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="form-hint">Hold Ctrl/Cmd to select multiple symptoms</small>
      </div>

      {showCustomInput && (
        <div className="form-group">
          <label>Custom Symptom Description</label>
          <input
            type="text"
            value={customSymptom}
            onChange={handleCustomSymptomChange}
            placeholder="Type custom symptom here..."
            className="custom-symptom-input"
          />
        </div>
      )}
    </div>
  );
};

export default SymptomsSelector;
