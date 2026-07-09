import React, { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";
import { getAllHospitals, createHospital } from "../../api";

// Sprint6-Story-3-BugFix-006: Searchable hospital dropdown with auto-add capability
const HospitalNameDropdown = ({ value, onChange, placeholder }) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setIsLoading(true);
      const response = await getAllHospitals();
      if (response.success) {
        const options = response.data.map((hospital) => ({
          value: hospital.name,
          label: hospital.name,
        }));
        setHospitals(options);
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (inputValue) => {
    try {
      setIsLoading(true);
      const response = await createHospital(inputValue);
      if (response.success) {
        const newOption = {
          value: response.data.name,
          label: response.data.name,
        };

        // Update local state immediately
        setHospitals((prev) => {
          return [...prev, newOption];
        });

        // Pass value to parent
        if (onChange && typeof onChange === 'function') {
          onChange(response.data.name);
        }
      }
    } catch (error) {
      console.error("Error creating hospital:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (selectedOption) => {
    if (onChange && typeof onChange === 'function') {
      onChange(selectedOption ? selectedOption.value : "");
    }
  };

  const selectedOption = value
    ? { value: value, label: value }
    : null;

  return (
    <CreatableSelect
      isClearable
      isLoading={isLoading}
      options={hospitals}
      value={selectedOption}
      onChange={handleChange}
      onCreateOption={handleCreate}
      placeholder={placeholder || "Search or add hospital name"}
      formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
      noOptionsMessage={() => "Type to add new hospital"}
      menuPortalTarget={document.body}
      styles={{
        control: (base) => ({
          ...base,
          minHeight: "38px",
          borderColor: "#ddd",
        }),
        menu: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999
        }),
      }}
    />
  );
};

export default HospitalNameDropdown;
