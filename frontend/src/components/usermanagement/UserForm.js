import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addUsers,
  getBalagruha,
  getMachines,
  updateUsers,
  getBalagruhaListbyUserID,
  getMedicalCheckInsByStudentId,
  createMedicalCheckin,
  updateMedicalCheckin,
} from "../../api";
import "./UserForm.css";
import { Modal } from "./modal";
import FaceCapture from "./FaceCapture";
import CheckInForm from "../dashboard/CheckInForm";

const MEDICAL_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "ongoing", label: "Ongoing" },
  { value: "monitoring", label: "Monitoring" },
  { value: "managed", label: "Managed" },
  { value: "resolved", label: "Resolved" },
  { value: "stable", label: "Stable" },
];

const ACCEPTED_PRESCRIPTION_TYPES = ".pdf,.jpg,.jpeg,.png";
const ACCEPTED_ATTACHMENT_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";

const ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "balagruha-incharge", label: "Balagruha In-charge" },
  { value: "purchase-manager", label: "Purchase Manager" },
  { value: "medical-incharge", label: "Medical Incharge" },
  { value: "sports-coach", label: "Sports Coach" },
  { value: "music-coach", label: "Music Coach" },
  { value: "amma", label: "Amma" },
];

const createEmptyMedicalHistoryEntry = () => ({
  name: "",
  description: "",
  date: "",
  caseId: "",
  doctorsName: "",
  hospitalName: "",
  currentStatus: {
    status: "",
    notes: "",
    date: "",
  },
  prescriptions: [],
  otherAttachments: [],
  existingPrescriptions: [],
  existingOtherAttachments: [],
  isExisting: false,
  isDirty: true,
});

const UserForm = ({ mode = "add", user = null, existingUsers = [], onSuccess, onCancel }) => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const role = localStorage.getItem("role");
  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = normalizedRole === "admin";
  const selectableRoleOptions = useMemo(() => {
    if (isAdmin) {
      return ROLE_OPTIONS;
    }
    return ROLE_OPTIONS.filter((option) => option.value === "student");
  }, [isAdmin]);
  const isRoleSelectDisabled = !isAdmin || selectableRoleOptions.length === 1;
  const [isOpen, setIsOpen] = useState(false);
  const faceCaptureRef = useRef();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    userId: "",
    role: "student",
    status: "active",
    age: "",
    gender: "",
    balagruhaIds: [],
    parentalStatus: "",
    guardianName1: "",
    guardianContact1: "",
    guardianName2: "",
    guardianContact2: "",
    assignedMachines: [],
    nextActionDate: "",
    medicalHistory: [],
  });

  const [errors, setErrors] = useState({});
  const [balagruhaOptions, setBalagruhaOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [prevBalagruhaIds, setPrevBalagruhaIds] = useState([]);
  const [files, setFiles] = useState({
    facialData: null,
    // medicalHistoryFiles removed - Sprint6-Story-02
  });
  const [previews, setPreviews] = useState({
    facialData: null,
    // medicalHistoryFiles removed - Sprint6-Story-02
  });
  const [facialPhotoRemoved, setFacialPhotoRemoved] = useState(false);
  const isStudentRole = formData.role === "student";
  const showMedicalHistoryForStaff =
    formData.role && formData.role !== "student";
  const shouldShowMedicalHistorySection =
    isStudentRole || showMedicalHistoryForStaff;

  // Sprint6-Story-02-Phase4: Medical Check-ins state (inline form)
  const [checkIns, setCheckIns] = useState([]);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState(null);
  const [formMode, setFormMode] = useState("create"); // 'create' or 'edit'
  const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false);

  const fileInputRefs = {
    facialData: useRef(null),
  };

  const isSameUserRecord = (candidate) => {
    if (!candidate || !user) return false;
    const candidateId = candidate._id || candidate.id;
    const currentId = user._id || user.id;
    return Boolean(candidateId && currentId && String(candidateId) === String(currentId));
  };

  const isDuplicateEmail = (email) => {
    const emailValue = String(email || "").trim().toLowerCase();
    if (!emailValue) return false;

    return existingUsers.some((existingUser) => {
      if (isSameUserRecord(existingUser)) return false;
      return String(existingUser?.email || "").trim().toLowerCase() === emailValue;
    });
  };

  const isDuplicateUserId = (userId) => {
    const userIdValue = String(userId || "").trim();
    if (!userIdValue) return false;

    return existingUsers.some((existingUser) => {
      if (isSameUserRecord(existingUser)) return false;
      if (existingUser?.role !== "student") return false;
      return String(existingUser?.userId || "").trim() === userIdValue;
    });
  };

  const getMachinesData = async () => {
    const response = await getMachines();

    setMachines(response.data.machines);
  };

  const generateRandomPassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const specialChars = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + specialChars;
    const passwordChars = [
      uppercase.charAt(Math.floor(Math.random() * uppercase.length)),
      lowercase.charAt(Math.floor(Math.random() * lowercase.length)),
      numbers.charAt(Math.floor(Math.random() * numbers.length)),
      specialChars.charAt(Math.floor(Math.random() * specialChars.length)),
    ];

    for (let i = passwordChars.length; i < 10; i++) {
      passwordChars.push(
        allChars.charAt(Math.floor(Math.random() * allChars.length))
      );
    }

    return passwordChars.sort(() => Math.random() - 0.5).join("");
  };

  useEffect(() => {
    if (!isAdmin) {
      setFormData((prev) => ({
        ...prev,
        role: "student",
      }));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (mode === "edit" && user) {
      const normalizedMedicalHistory = (user.medicalHistory || []).map(
        (history) => ({
          name: history.name || "",
          description: history.description || "",
          date: history.date ? history.date.split("T")[0] : "",
          caseId: history.caseId || "",
          doctorsName: history.doctorsName || "",
          hospitalName: history.hospitalName || "",
          currentStatus: {
            status: history.currentStatus?.status || "",
            notes: history.currentStatus?.notes || "",
            date: history.currentStatus?.date
              ? history.currentStatus.date.split("T")[0]
              : "",
          },
          prescriptions: [],
          otherAttachments: [],
          existingPrescriptions:
            history.prescriptionUrls || history.prescriptions || [],
          existingOtherAttachments:
            history.otherAttachmentUrls || history.otherAttachments || [],
          isExisting: true,
          isDirty: false,
        }),
      );

      // Set basic user data
      setFormData({
        name: user.name || "",
        email: user.email || "",
        userId: user?.userId != null ? String(user.userId) : "",
        role: user.role || "student",
        status: user.status || "active",
        age: user.age || "",
        gender: user.gender || "",
        balagruhaIds: (user.balagruhaIds || []).map((bg) => {
          if (typeof bg === "object" && bg.name) return bg;

          const bgId = bg?._id || bg;
          const matchedBalagruha = balagruhaOptions.find(
            (option) => String(option._id) === String(bgId)
          );

          return matchedBalagruha || { _id: bgId };
        }),
        parentalStatus: user.parentalStatus || "",
        nextActionDate: user.nextActionDate || "",
        guardianName1: user.guardianName1 || "",
        guardianContact1: user.guardianContact1 || "",
        assignedMachines: user.assignedMachines || [],
        guardianName2: user.guardianName2 || "",
        guardianContact2: user.guardianContact2 || "",
        medicalHistory: normalizedMedicalHistory,
      });

      // Set facial data preview if available
      const existingFacialPhoto =
        user.facialDataUrl ||
        user.facialData?.url ||
        user.facialData?.location ||
        user.facialData?.photoUrl;

      if (existingFacialPhoto) {
        setPreviews((prev) => ({
          ...prev,
          facialData: existingFacialPhoto,
        }));
      }
      setFacialPhotoRemoved(false);
    } else if (mode === "add") {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: [],
      }));
      setPreviews({ facialData: null });
      setFiles({ facialData: null });
      setFacialPhotoRemoved(false);
    }
    fetchBalagruhaOptions();
    getMachinesData();
  }, [mode, user]);

  // Sprint6-Story-02: Fetch check-ins when editing a student
  useEffect(() => {
    const fetchCheckIns = async () => {
      if (mode === "edit" && user && user.role === "student" && user._id) {
        setIsLoadingCheckIns(true);
        try {
          const response = await getMedicalCheckInsByStudentId(user._id);
          // Debug log
          if (response.success) {
            // Sprint6-Story-02-Phase4-BUG: response.data contains medicalCheckIns array
            const checkInsData = response.data.medicalCheckIns || response.data;
            // Debug log
            // Sort by date, newest first
            const sortedCheckIns = checkInsData.sort(
              (a, b) => new Date(b.date) - new Date(a.date),
            );
            setCheckIns(sortedCheckIns);
          }
        } catch (error) {
          console.error("Error fetching check-ins:", error);
        } finally {
          setIsLoadingCheckIns(false);
        }
      }
    };
    fetchCheckIns();
  }, [mode, user]);

  useEffect(() => {
    // Only clear machines if balagruhaIds actually changed (not on initial load)
    if (
      prevBalagruhaIds.length > 0 &&
      JSON.stringify(prevBalagruhaIds) !== JSON.stringify(formData.balagruhaIds)
    ) {
      setFormData((prev) => ({
        ...prev,
        assignedMachines: [],
      }));
    }
    setPrevBalagruhaIds(formData.balagruhaIds);
  }, [formData.balagruhaIds]);

  const fetchBalagruhaOptions = async () => {
    try {
      const role = (localStorage.getItem("role") || "").toLowerCase();
      const isCoachLike = [
        "coach",
        "sports-coach",
        "music-coach",
        "medical-incharge",
      ].includes(role);

      if (isCoachLike) {
        const userId = localStorage.getItem("userId");
        const response = await getBalagruhaListbyUserID(userId);
        const balagruhas = response?.data?.balagruhas || [];
        setBalagruhaOptions(balagruhas);
      } else {
        const response = await getBalagruha();
        setBalagruhaOptions(response?.data?.balagruhas || []);
      }
    } catch (error) {
      console.error("Error fetching balagruha options:", error);
    }
  };

  // Medical history handlers removed - Sprint6-Story-02: Replaced with Check-in Form
  // handleAddMedicalHistory, handleRemoveMedicalHistory, handleMedicalHistoryChange,
  // handleMedicalHistoryNestedChange, handleMedicalHistoryFileChange all removed
  useEffect(() => {
    const handleClickOutside = (event) => {
      // For balagruha dropdown
      const balagruhaSelector = document.querySelector(
        ".form-balagruha-selector",
      );

      // Check if click is outside balagruha dropdown
      if (balagruhaSelector && !balagruhaSelector.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Empty dependency array since we don't need to track any dependencies
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone) => {
    return /^\d{10}$/.test(phone);
  };

  const validatePasswordStrength = (password) => {
    if (!password) return { isValid: false, message: "Password is required" };
    if (password.length < 8)
      return {
        isValid: false,
        message: "Password must be at least 8 characters long",
      };
    if (!/[A-Z]/.test(password))
      return {
        isValid: false,
        message: "Password must contain at least one uppercase letter",
      };
    if (!/[a-z]/.test(password))
      return {
        isValid: false,
        message: "Password must contain at least one lowercase letter",
      };
    if (!/[0-9]/.test(password))
      return {
        isValid: false,
        message: "Password must contain at least one number",
      };
    if (!/[!@#$%^&*]/.test(password))
      return {
        isValid: false,
        message:
          "Password must contain at least one special character (!@#$%^&*)",
      };
    return { isValid: true, message: "Strong password" };
  };

  const today = new Date().toISOString().split("T")[0];

  const getMinAllowedDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10); // past limit: 10 years
    return date.toISOString().split("T")[0];
  };

  const minAllowedDate = getMinAllowedDate();

  const validateLimitedDate = (dateValue, fieldLabel) => {
    if (!dateValue) return "";

    if (dateValue > today) {
      return `${fieldLabel} cannot be in the future`;
    }

    if (dateValue < minAllowedDate) {
      return `${fieldLabel} cannot be older than 10 years`;
    }

    return "";
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Name must be less than 100 characters";
    }

    const emailValue = formData.email.trim();
    const isEmailRequired = formData.role !== "student";
    if (isEmailRequired && !emailValue) {
      newErrors.email = "Email is required for non-student users";
    } else if (emailValue && !validateEmail(emailValue)) {
      newErrors.email = "Please enter a valid email address";
    } else if (emailValue && isDuplicateEmail(emailValue)) {
      newErrors.email = "This email is already registered";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Password validation (for admin when adding new user or explicitly changing)
    if (localStorage.getItem("role") === "admin") {
      if (mode === "add" && !formData.password) {
        newErrors.password = "Password is required for new users";
      } else if (formData.password) {
        const passwordCheck = validatePasswordStrength(formData.password);
        if (!passwordCheck.isValid) {
          newErrors.password = passwordCheck.message;
        }
      }
    }

    // Balagruha validation (not required for admin)
    if (formData.role !== "admin") {
      if (!formData.balagruhaIds || formData.balagruhaIds.length === 0) {
        newErrors.balagruhaIds = "Please select at least one Balagruha";
      }
    }

    // Student-specific validation
    if (formData.role === "student") {
      // UserId validation
      const userIdValue = String(formData.userId || "").trim();
      if (!userIdValue) {
        newErrors.userId = "User ID is required";
      } else if (userIdValue.length < 3) {
        newErrors.userId = "User ID must be at least 3 characters long";
      } else if (!/^\d+$/.test(userIdValue)) {
        newErrors.userId = "User ID must contain only numbers";
      } else if (isDuplicateUserId(userIdValue)) {
        newErrors.userId = "This User ID is already registered";
      }

      // Age validation
      if (!formData.age) {
        newErrors.age = "Age is required";
      } else {
        const ageNum = parseInt(formData.age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          newErrors.age = "Please enter a valid age between 1 and 120";
        }
      }

      // Gender validation
      if (!formData.gender) {
        newErrors.gender = "Gender is required";
      }

      // Parental status validation
      if (!formData.parentalStatus) {
        newErrors.parentalStatus = "Parental status is required";
      }

      // Guardian validation based on parental status
      if (
        formData.parentalStatus === "has one" ||
        formData.parentalStatus === "has guardian"
      ) {
        if (!formData.guardianName1 || !formData.guardianName1.trim()) {
          const guardianType =
            formData.parentalStatus === "has one" ? "Parent" : "Guardian";
          newErrors.guardianName1 = `${guardianType} name is required`;
        } else if (formData.guardianName1.trim().length < 2) {
          newErrors.guardianName1 =
            "Guardian name must be at least 2 characters long";
        }

        // if (!formData.guardianContact1 || !formData.guardianContact1.trim()) {
        //   const guardianType =
        //     formData.parentalStatus === "has one" ? "Parent" : "Guardian";
        //   newErrors.guardianContact1 = `${guardianType} contact is required`;
        // } else if (!validatePhoneNumber(formData.guardianContact1.trim())) {
        //   newErrors.guardianContact1 =
        //     "Please enter a valid 10-digit phone number";
        // }

        if (
          formData.guardianContact1?.trim() &&
          !validatePhoneNumber(formData.guardianContact1.trim())
        ) {
          newErrors.guardianContact1 =
            "Please enter a valid 10-digit phone number";
        }
      } else if (formData.parentalStatus === "has both") {
        // Father's details
        if (
          formData.guardianContact1?.trim() &&
          !validatePhoneNumber(formData.guardianContact1.trim())
        ) {
          newErrors.guardianContact1 =
            "Please enter a valid 10-digit phone number";
        }

        // if (!formData.guardianContact1 || !formData.guardianContact1.trim()) {
        //   newErrors.guardianContact1 = "Father's contact is required";
        // } else if (!validatePhoneNumber(formData.guardianContact1.trim())) {
        //   newErrors.guardianContact1 =
        //     "Please enter a valid 10-digit phone number for father";
        // }

        // Mother's details
        if (
          formData.guardianContact2?.trim() &&
          !validatePhoneNumber(formData.guardianContact2.trim())
        ) {
          newErrors.guardianContact2 =
            "Please enter a valid 10-digit phone number";
        }

        //   if (!formData.guardianContact2 || !formData.guardianContact2.trim()) {
        //     newErrors.guardianContact2 = "Mother's contact is required";
        //   } else if (!validatePhoneNumber(formData.guardianContact2.trim())) {
        //     newErrors.guardianContact2 =
        //       "Please enter a valid 10-digit phone number for mother";
        //   }
        // }

        // Facial photo validation
        if (mode === "add" && !files.facialData && !previews.facialData) {
          newErrors.facialData = "Facial photo is required for new students";
        }
      }
    }

      (formData.medicalHistory || []).forEach((history, index) => {
        const diagnosisDateError = validateLimitedDate(
          history.date,
          "Diagnosis date"
        );

        if (diagnosisDateError) {
          newErrors[`medicalHistory_${index}_date`] = diagnosisDateError;
        }

        const statusDateError = validateLimitedDate(
          history.currentStatus?.date,
          "Status date"
        );

        if (statusDateError) {
          newErrors[`medicalHistory_${index}_statusDate`] = statusDateError;
        }
      });

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      setFormData((prev) => {
        let updatedData = { ...prev, [name]: value };

        // Reset dependent fields when parentalStatus changes
        if (name === "parentalStatus") {
          updatedData = {
            ...updatedData,
            guardianName1: "",
            guardianContact1: "",
            guardianName2: "",
            guardianContact2: "",
          };
        }

        return updatedData;
      });

      // Real-time field validation
      validateField(name, value);
      if (name === "role") {
        setErrors((prev) => {
          const nextErrors = { ...prev };
          if (value === "student") {
            delete nextErrors.email;
          } else if (!formData.email.trim()) {
            nextErrors.email = "Email is required for non-student users";
          }
          return nextErrors;
        });
      }
    };

    const validateField = (fieldName, value) => {
      let fieldError = "";

      switch (fieldName) {
        case "name":
          if (!value.trim()) {
            fieldError = "Name is required";
          } else if (value.trim().length < 2) {
            fieldError = "Name must be at least 2 characters long";
          } else if (value.trim().length > 100) {
            fieldError = "Name must be less than 100 characters";
          }
          break;

        case "email":
          if (formData.role !== "student" && !value.trim()) {
            fieldError = "Email is required for non-student users";
          } else if (value && value.trim() && !validateEmail(value)) {
            fieldError = "Please enter a valid email address";
          } else if (value && value.trim() && isDuplicateEmail(value)) {
            fieldError = "This email is already registered";
          }
          break;

        case "password":
          if (value && localStorage.getItem("role") === "admin") {
            const passwordCheck = validatePasswordStrength(value);
            if (!passwordCheck.isValid) {
              fieldError = passwordCheck.message;
            }
          }
          break;

        case "userId":
          const userIdValue = String(value || "").trim();
          if (!userIdValue) {
            fieldError = "User ID is required";
          } else if (userIdValue.length < 3) {
            fieldError = "User ID must be at least 3 characters long";
          } else if (!/^\d+$/.test(userIdValue)) {
            fieldError = "User ID must contain only numbers";
          } else if (isDuplicateUserId(userIdValue)) {
            fieldError = "This User ID is already registered";
          }
          break;

        case "age":
          if (!value) {
            fieldError = "Age is required";
          } else {
            const ageNum = parseInt(value);
            if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
              fieldError = "Please enter a valid age between 1 and 120";
            }
          }
          break;

        case "gender":
          if (!value) {
            fieldError = "Gender is required";
          }
          break;

        case "parentalStatus":
          if (!value) {
            fieldError = "Parental status is required";
          }
          break;

        case "guardianName1":
          if (
            formData.parentalStatus === "has one" ||
            formData.parentalStatus === "has guardian"
          ) {
            if (!value.trim()) {
              fieldError =
                formData.parentalStatus === "has one"
                  ? "Parent name is required"
                  : "Guardian name is required";
            } else if (value.trim().length < 2) {
              fieldError = "Guardian name must be at least 2 characters long";
            }
          } else if (formData.parentalStatus === "has both") {
            if (!value.trim()) {
              fieldError = "Father's name is required";
            } else if (value.trim().length < 2) {
              fieldError = "Father's name must be at least 2 characters long";
            }
          }
          break;

        case "guardianContact1":
          // Contact number is optional.
          // Validate only when the user enters a value.
          if (value.trim() && !validatePhoneNumber(value.trim())) {
            fieldError = "Please enter a valid 10-digit phone number";
          }
          break;

        case "guardianName2":
          if (formData.parentalStatus === "has both") {
            if (!value.trim()) {
              fieldError = "Mother's name is required";
            } else if (value.trim().length < 2) {
              fieldError = "Mother's name must be at least 2 characters long";
            }
          }
          break;

        case "guardianContact2":
          // Contact number is optional.
          // Validate only when the user enters a value.
          if (value.trim() && !validatePhoneNumber(value.trim())) {
            fieldError = "Please enter a valid 10-digit phone number";
          }
          break;

        default:
          break;
      }

      // Update error state
      setErrors((prev) => {
        if (fieldError) {
          return { ...prev, [fieldName]: fieldError };
        } else {
          const newErrors = { ...prev };
          delete newErrors[fieldName];
          return newErrors;
        }
      });
    };

    const handleFileChange = (e, type) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [type]: "File size should not exceed 5MB",
        }));
        return;
      }

      if (type === "facialData" && !file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          [type]: "Please upload an image file",
        }));
        return;
      }

      setFiles((prev) => ({
        ...prev,
        [type]: file,
      }));

      if (type === "facialData") {
        setFacialPhotoRemoved(false);
      }

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({
            ...prev,
            [type]: reader.result,
          }));
        };
        reader.readAsDataURL(file);
      }

      if (errors[type]) {
        setErrors((prev) => ({
          ...prev,
          [type]: null,
        }));
      }
    };

    const handleRemoveFacialPhoto = () => {
      setFiles((prev) => ({ ...prev, facialData: null }));
      setPreviews((prev) => ({ ...prev, facialData: null }));
      setFacialPhotoRemoved(true);

      if (fileInputRefs.facialData.current) {
        fileInputRefs.facialData.current.value = "";
      }

      setErrors((prev) => {
        const nextErrors = { ...prev };
        delete nextErrors.facialData;
        return nextErrors;
      });
    };

    const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toISOString().split("T")[0];
    };

    const handleBalagruhaChange = (balagruhaId) => {
      setFormData((prev) => ({
        ...prev,
        balagruhaIds: prev.balagruhaIds.includes(balagruhaId)
          ? prev.balagruhaIds.filter((id) => id !== balagruhaId)
          : [...prev.balagruhaIds, balagruhaId],
      }));

      if (errors.balagruhaIds) {
        setErrors((prev) => ({
          ...prev,
          balagruhaIds: null,
        }));
      }
    };

    const handleAddMedicalHistory = () => {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: [
          ...prev.medicalHistory,
          createEmptyMedicalHistoryEntry(),
        ],
      }));
    };

    const handleRemoveMedicalHistory = (index) => {
      setFormData((prev) => ({
        ...prev,
        medicalHistory: prev.medicalHistory.filter((entry, i) => {
          if (i !== index) return true;
          return entry?.isExisting ? true : false;
        }),
      }));
    };

    const handleMedicalHistoryChange = (index, field, value) => {
      setFormData((prev) => {
        const updated = [...prev.medicalHistory];
        updated[index] = {
          ...updated[index],
          [field]: value,
          isDirty: true,
        };
        return { ...prev, medicalHistory: updated };
      });
    };

    const handleMedicalHistoryStatusChange = (index, field, value) => {
      setFormData((prev) => {
        const updated = [...prev.medicalHistory];
        updated[index] = {
          ...updated[index],
          currentStatus: {
            ...updated[index].currentStatus,
            [field]: value,
          },
          isDirty: true,
        };
        return { ...prev, medicalHistory: updated };
      });
    };

    const handleMedicalHistoryFileChange = (index, field, event) => {
      const selectedFiles = Array.from(event.target.files || []);

      if (!selectedFiles.length) {
        return;
      }

      for (const file of selectedFiles) {
        const limitMb = file.type === "application/pdf" ? 10 : 5;
        if (file.size > limitMb * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            medicalHistory: `${file.name} exceeds the ${limitMb}MB limit`,
          }));
          return;
        }
      }

      setErrors((prev) => ({
        ...prev,
        medicalHistory: null,
      }));

      setFormData((prev) => {
        const updated = [...prev.medicalHistory];
        const existing = updated[index][field] || [];
        updated[index] = {
          ...updated[index],
          [field]: [...existing, ...selectedFiles],
          isDirty: true,
        };
        return { ...prev, medicalHistory: updated };
      });
    };

    const handleRemoveMedicalHistoryFile = (entryIndex, field, fileIndex) => {
      setFormData((prev) => {
        const updated = [...prev.medicalHistory];
        const currentFiles = [...(updated[entryIndex][field] || [])];
        currentFiles.splice(fileIndex, 1);
        updated[entryIndex] = {
          ...updated[entryIndex],
          [field]: currentFiles,
          isDirty: true,
        };
        return { ...prev, medicalHistory: updated };
      });
    };

    const getBalagruhaIdValue = (balagruha) => {
      if (!balagruha) return null;
      if (typeof balagruha === "string") return balagruha;
      return balagruha._id || balagruha.id || null;
    };

    const getBalagruhaName = (balagruha) => {
      if (!balagruha) return "";

      const balagruhaId = getBalagruhaIdValue(balagruha);

      const match = balagruhaOptions.find(
        (option) => String(option._id) === String(balagruhaId)
      );

      if (match?.name) return match.name;

      if (typeof balagruha === "object" && balagruha.name) {
        return balagruha.name;
      }

      return "";
    };

    const normalizedMachines = useMemo(() => {
      return (machines || []).map((machine) => ({
        ...machine,
        assignedBalagruhaId: getBalagruhaIdValue(machine.assignedBalagruha),
      }));
    }, [machines]);

    const machinesByBalagruha = useMemo(() => {
      const mapping = {};
      (formData.balagruhaIds || []).forEach((balagruha) => {
        const balId = getBalagruhaIdValue(balagruha);
        if (!balId) return;
        mapping[balId] = normalizedMachines.filter((machine) => {
          if (!machine.assignedBalagruhaId) {
            return false;
          }
          return machine.assignedBalagruhaId === balId;
        });
      });
      return mapping;
    }, [formData.balagruhaIds, normalizedMachines]);

    const unassignedMachines = useMemo(() => {
      return normalizedMachines.filter((machine) => !machine.assignedBalagruhaId);
    }, [normalizedMachines]);

    const toggleMachineSelection = (machine) => {
      if (!machine || !machine._id) return;
      setFormData((prev) => {
        const exists = prev.assignedMachines.some(
          (assigned) =>
            (assigned?._id || assigned) === machine._id ||
            assigned?.machineId === machine.machineId,
        );
        const updatedMachines = exists
          ? prev.assignedMachines.filter(
            (assigned) =>
              (assigned?._id || assigned) !== machine._id &&
              assigned?.machineId !== machine.machineId
          )
          : [
            ...prev.assignedMachines,
            {
              _id: machine._id,
              machineId: machine.machineId,
              serialNumber: machine.serialNumber,
              assignedBalagruha: machine.assignedBalagruha,
            },
          ];
        return { ...prev, assignedMachines: updatedMachines };
      });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        setErrors((prev) => ({
          ...prev,
          submit: "Please fill all required fields before submitting.",
        }));
        return;
      }

      setIsSubmitting(true);

      try {
        const formDataToSend = new FormData();

        const appendIfNotBlank = (key, value) => {
          const normalizedValue = value == null ? "" : String(value).trim();
          if (normalizedValue) {
            formDataToSend.append(key, normalizedValue);
          }
        };

        // Add basic fields
        formDataToSend.append("name", String(formData.name || "").trim());
        appendIfNotBlank("email", formData.email);
        formDataToSend.append("role", formData.role);
        formDataToSend.append("status", formData.status);

        if (formData.password && localStorage.getItem("role") === "admin") {
          formDataToSend.append("password", formData.password);
        }

        if (formData.role !== "admin") {
          if (formData.balagruhaIds && formData.balagruhaIds.length > 0) {
            const balagruhaIdsList = formData.balagruhaIds
              .map((bg) => bg?._id || bg)
              .filter(Boolean)
              .join(",");
            formDataToSend.append("balagruhaIds", balagruhaIdsList);
          }
        }
        // Add student-specific fields if role is student
        if (formData.role === "student") {
          formDataToSend.append("age", String(formData.age || "").trim());
          formDataToSend.append("userId", String(formData.userId || "").trim());
          formDataToSend.append("gender", formData.gender);
          formDataToSend.append("parentalStatus", formData.parentalStatus);
          appendIfNotBlank("nextActionDate", formData.nextActionDate);
          if (
            formData.parentalStatus === "has one" ||
            formData.parentalStatus === "has guardian"
          ) {
            formDataToSend.append("guardianName1", formData.guardianName1);

            appendIfNotBlank(
              "guardianContact1",
              formData.guardianContact1
            );

          } else if (formData.parentalStatus === "has both") {
            formDataToSend.append("guardianName1", formData.guardianName1);

            appendIfNotBlank(
              "guardianContact1",
              formData.guardianContact1
            );

            formDataToSend.append("guardianName2", formData.guardianName2);

            appendIfNotBlank(
              "guardianContact2",
              formData.guardianContact2
            );
          }

          // Add balagruhaIds

          // Add assignedMachines - extract IDs and join them
          if (formData.assignedMachines && formData.assignedMachines.length > 0) {
            const machineIdsList = formData.assignedMachines
              .map((machine) => machine?._id || machine)
              .filter(Boolean)
              .join(",");
            formDataToSend.append("assignedMachines", machineIdsList);
          }
          // Add facial data file if available
          if (files.facialData) {
            formDataToSend.append("facialData", files.facialData);
          } else if (mode === "edit" && facialPhotoRemoved) {
            formDataToSend.append("clearFacialData", "true");
          }
        }

        if (shouldShowMedicalHistorySection) {
          const historiesToSubmit = (formData.medicalHistory || []).filter(
            (history) => {
              if (!history) return false;
              if (history.isExisting && !history.isDirty) {
                return false;
              }
              const hasContent =
                history.name ||
                history.description ||
                history.caseId ||
                history.doctorsName ||
                history.hospitalName ||
                history.date ||
                history.currentStatus?.status ||
                history.currentStatus?.notes ||
                history.currentStatus?.date ||
                (history.prescriptions && history.prescriptions.length > 0) ||
                (history.otherAttachments && history.otherAttachments.length > 0);
              return hasContent;
            },
          );

          historiesToSubmit.forEach((history, index) => {
            const prefix = `medicalHistory[${index}]`;
            const appendIfPresent = (key, value) => {
              if (value !== undefined && value !== null && value !== "") {
                formDataToSend.append(`${prefix}.${key}`, value);
              }
            };

            appendIfPresent("name", history.name);
            appendIfPresent("description", history.description);
            appendIfPresent("date", history.date);
            appendIfPresent("caseId", history.caseId);
            appendIfPresent("doctorsName", history.doctorsName);
            appendIfPresent("hospitalName", history.hospitalName);

            if (history.currentStatus) {
              appendIfPresent(
                "currentStatus.status",
                history.currentStatus.status,
              );
              appendIfPresent("currentStatus.notes", history.currentStatus.notes);
              appendIfPresent("currentStatus.date", history.currentStatus.date);
            }

            (history.prescriptions || []).forEach((file) => {
              formDataToSend.append(`${prefix}.prescriptions`, file);
            });

            (history.otherAttachments || []).forEach((file) => {
              formDataToSend.append(`${prefix}.otherAttachments`, file);
            });
          });
        }

        // Use the API functions with FormData
        const response =
          mode === "add"
            ? await addUsers(formDataToSend)
            : await updateUsers(user._id, formDataToSend);

        onSuccess?.(response);
      } catch (error) {
        console.error("Error submitting form:", error);
        setErrors((prev) => ({
          ...prev,
          submit:
            error?.response?.data?.message ||
            "An error occurred while saving the user",
        }));
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleCloseModal = () => {
      if (faceCaptureRef.current) {
        faceCaptureRef.current.stopCamera(); // Ensures camera is stopped
      }
      setIsOpen(false);
    };

    // Sprint6-Story-02: Check-in modal handlers
    // Sprint6-Story-02-Phase4: Inline form handlers
    const handleCreateCheckIn = () => {
      setFormMode("create");
      setEditingCheckIn(null);
      setShowCheckInForm(true);
    };

    const handleEditCheckIn = (checkIn) => {
      setFormMode("edit");
      setEditingCheckIn(checkIn);
      setShowCheckInForm(true);
    };

    const handleCheckInSave = async (checkInData) => {
      try {
        let response;
        if (formMode === "create") {
          response = await createMedicalCheckin(checkInData);
        } else {
          response = await updateMedicalCheckin(editingCheckIn._id, checkInData);
        }

        if (response.success) {
          // Refresh check-ins list
          const updatedCheckIns = await getMedicalCheckInsByStudentId(user._id);
          if (updatedCheckIns.success) {
            // Sprint6-Story-02-Phase4-BUG: response.data contains medicalCheckIns array
            const checkInsData =
              updatedCheckIns.data.medicalCheckIns || updatedCheckIns.data;
            const sortedCheckIns = checkInsData.sort(
              (a, b) => new Date(b.date) - new Date(a.date),
            );
            setCheckIns(sortedCheckIns);
          }
          setShowCheckInForm(false);
          setEditingCheckIn(null);
        }
      } catch (error) {
        console.error(
          `Error ${formMode === "create" ? "creating" : "updating"} check-in:`,
          error,
        );
      }
    };

    const handleCheckInCancel = () => {
      setShowCheckInForm(false);
      setEditingCheckIn(null);
    };

    const formatCheckInDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <div className="user-form-container">
        <Modal
          isOpen={isOpen}
          title={"Capture Photo"}
          onClose={handleCloseModal}
          children={
            <FaceCapture
              ref={faceCaptureRef}
              onCapture={(file, previewUrl) => {
                setFiles((prev) => ({ ...prev, facialData: file }));
                setPreviews((prev) => ({ ...prev, facialData: previewUrl }));
                setFacialPhotoRemoved(false);

                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.facialData;
                  return newErrors;
                });

                handleCloseModal();
              }}
            />
          }
        />
        <div className="form-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{ cursor: "pointer", fontSize: "20px" }}
              onClick={onCancel}
            >
              ⬅️
            </span>
            <h2>{mode === "add" ? "Add New User" : "Edit User"}</h2>
          </div>
          {mode === "edit" && (
            <div className="user-info">
              {/* <span>User ID: {user?._id}</span> */}
              <span className="text-sm">
                Last Updated: {new Date(user?.updatedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="user-form"
          encType="multipart/form-data"
        >
          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="name" aria-required="true">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? "error" : ""}
                placeholder="Enter full name"
                disabled={localStorage.getItem("role") === "medical-incharge"}
                aria-label="Full name"
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <span className="error-message" id="name-error">
                  {errors.name}
                </span>
              )}
            </div>

            {localStorage.getItem("role") !== "medical-incharge" && (
              <>
                <div className="form-group">
                  <label htmlFor="email">
                    Email {!isStudentRole && <span className="required">*</span>}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={errors.email ? "error" : ""}
                    placeholder="Enter email address"
                    required={!isStudentRole}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <span className="error-message" id="email-error">
                      {errors.email}
                    </span>
                  )}
                </div>

                {localStorage.getItem("role") === "admin" && (
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-group">
                      <input
                        type="text"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={errors.password ? "error" : ""}
                        placeholder={
                          mode === "add"
                            ? "Enter New Password"
                            : "Retype to reset passoword"
                        }
                      />
                      <button
                        type="button"
                        className="generate-password-btn"
                        onClick={() => {
                          const password = generateRandomPassword();
                          handleInputChange({
                            target: { name: "password", value: password },
                          });
                        }}
                      >
                        Generate
                      </button>
                    </div>
                    {errors.password && (
                      <span className="error-message">{errors.password}</span>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="role" aria-required="true">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className={errors.role ? "error" : ""}
                    disabled={isRoleSelectDisabled}
                    aria-label="User role"
                    aria-describedby={errors.role ? "role-error" : undefined}
                  >
                    {selectableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <span className="error-message" id="role-error">
                      {errors.role}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div className="status-toggle">
                    <label
                      className={formData.status === "active" ? "active" : ""}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === "active"}
                        onChange={handleInputChange}
                      />
                      Active
                    </label>
                    <label
                      className={formData.status === "inactive" ? "inactive" : ""}
                    >
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        checked={formData.status === "inactive"}
                        onChange={handleInputChange}
                      />
                      Inactive
                    </label>
                  </div>
                </div>

                {formData.role !== "admin" && (
                  <div className="form-group">
                    <label aria-required="true">Balagruha</label>
                    <div className="form-balagruha-selector">
                      <div
                        className={`form-dropdown-header ${errors.balagruhaIds ? "form-error redbtndiv" : ""
                          }`}
                        onClick={() => setDropdownOpen((prev) => !prev)}
                      >
                        <span>
                          {formData.balagruhaIds.length
                            ? `${formData.balagruhaIds
                              .map((bg) => getBalagruhaName(bg))
                              .join(", ")}`
                            : "Select Balagruha"}
                        </span>
                        <span className="form-dropdown-arrow">
                          {dropdownOpen ? "▲" : "▼"}
                        </span>
                      </div>
                      {dropdownOpen && (
                        <div className="form-dropdown-options">
                          {balagruhaOptions.map((option) => (
                            <label
                              key={option._id}
                              className="form-checkbox-option"
                            >
                              <input
                                type={
                                  formData.role === "student"
                                    ? "radio"
                                    : "checkbox"
                                }
                                checked={
                                  formData.role === "student"
                                    ? formData.balagruhaIds.some(
                                      (bg) => bg._id === option._id
                                    )
                                    : formData.balagruhaIds.some(
                                      (bg) => bg._id === option._id
                                    )
                                }
                                onChange={(e) => {
                                  if (formData.role === "student") {
                                    // Single select for students
                                    setFormData((prev) => ({
                                      ...prev,
                                      balagruhaIds: [option],
                                    }));

                                    setDropdownOpen(false);
                                  } else {
                                    // Multi select for other roles
                                    const isSelected = formData.balagruhaIds.some(
                                      (bg) => bg._id === option._id,
                                    );
                                    const selectedBalagruhas = isSelected
                                      ? formData.balagruhaIds.filter(
                                        (bg) => bg._id !== option._id
                                      )
                                      : [...formData.balagruhaIds, option];
                                    setFormData((prev) => ({
                                      ...prev,
                                      balagruhaIds: selectedBalagruhas,
                                    }));
                                  }
                                  // Close dropdown if it's a student (single select)
                                  setDropdownOpen(false);
                                }}
                              />
                              {option.name}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.balagruhaIds && (
                      <span className="form-error-message redbtn">
                        {errors.balagruhaIds}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Student Specific Fields */}
          {formData.role === "student" && (
            <div className="form-section">
              <h3>Student Information</h3>

              <div className="form-group">
                <label htmlFor="userId" aria-required="true">
                  User ID
                </label>
                <input
                  type="text"
                  id="userId"
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  placeholder="Enter User ID"
                  className={errors.userId ? "error" : ""}
                  disabled={localStorage.getItem("role") === "medical-incharge"}
                  aria-label="Student User ID"
                  aria-describedby={errors.userId ? "userId-error" : undefined}
                />
                {errors.userId && (
                  <span className="error-message" id="userId-error">
                    {errors.userId}
                  </span>
                )}
              </div>

              {localStorage.getItem("role") !== "medical-incharge" && (
                <>
                  <div className="form-group machine-assignment-block">
                    <div className="machine-assignment-header">
                      <label>Assigned Machines</label>
                      <button
                        type="button"
                        className="machine-link-btn"
                        onClick={() => navigate("/machines")}
                      >
                        Open Machine Manager ↗
                      </button>
                    </div>
                    <p className="machine-helper-text">
                      1) Select a Balagruha above · 2) Check the machines that
                      belong to each Balagruha · 3) Use the Machine Manager to add
                      or reassign hardware when required.
                    </p>

                    {formData.balagruhaIds.length === 0 ? (
                      <div className="no-balagruha-message">
                        Please select a Balagruha first to view available machines
                      </div>
                    ) : (
                      <div className="machine-grid">
                        {formData.balagruhaIds.map((balagruha) => {
                          const balId = getBalagruhaIdValue(balagruha);
                          const machinesForBal = machinesByBalagruha[balId] || [];

                          return (
                            <div key={balId} className="machine-bal-card">
                              <div className="machine-bal-card__header">
                                <h4>
                                  {getBalagruhaName(balagruha) || "Balagruha"}
                                </h4>
                                <span>
                                  {machinesForBal.length > 0
                                    ? `${machinesForBal.length} machine${machinesForBal.length > 1 ? "s" : ""
                                    }`
                                    : "No machines"}
                                </span>
                              </div>

                              {machinesForBal.length > 0 ? (
                                machinesForBal.map((machine) => {
                                  const isChecked =
                                    formData.assignedMachines.some(
                                      (assigned) =>
                                        (assigned?._id || assigned) ===
                                        machine._id,
                                    );

                                  return (
                                    <label
                                      key={machine._id}
                                      className="machine-option"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() =>
                                          toggleMachineSelection(machine)
                                        }
                                      />
                                      <span>
                                        <strong>{machine.machineId}</strong>
                                        {machine.serialNumber && (
                                          <>
                                            {" · "}
                                            <span>{machine.serialNumber}</span>
                                          </>
                                        )}
                                        {!machine.assignedBalagruhaId && (
                                          <em className="machine-unassigned-pill">
                                            Unassigned
                                          </em>
                                        )}
                                      </span>
                                    </label>
                                  );
                                })
                              ) : (
                                <div className="no-machines-message">
                                  No machines mapped to this Balagruha yet. Use
                                  the Machine Manager to add one.
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {unassignedMachines.length > 0 && (
                          <div className="machine-bal-card">
                            <div className="machine-bal-card__header">
                              <h4>Unassigned Machines</h4>
                              <span>{unassignedMachines.length} available</span>
                            </div>
                            <p className="machine-helper-text compact">
                              These machines are not linked to any Balagruha yet.
                              You can still allocate them to a student, but
                              consider mapping them in the Machine Manager for
                              clarity.
                            </p>
                            {unassignedMachines.map((machine) => {
                              const isChecked = formData.assignedMachines.some(
                                (assigned) =>
                                  (assigned?._id || assigned) === machine._id,
                              );

                              return (
                                <label
                                  key={machine._id}
                                  className="machine-option"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      toggleMachineSelection(machine)
                                    }
                                  />
                                  <span>
                                    <strong>{machine.machineId}</strong>
                                    {machine.serialNumber && (
                                      <>
                                        {" · "}
                                        <span>{machine.serialNumber}</span>
                                      </>
                                    )}
                                    <em className="machine-unassigned-pill">
                                      Not mapped
                                    </em>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {errors.assignedMachines && (
                      <span className="form-error-message">
                        {errors.assignedMachines}
                      </span>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="age" aria-required="true">
                        Age
                      </label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className={errors.age ? "error" : ""}
                        min="1"
                        max="120"
                        placeholder="Enter age"
                        aria-label="Student age"
                        aria-describedby={errors.age ? "age-error" : undefined}
                      />
                      {errors.age && (
                        <span className="error-message" id="age-error">
                          {errors.age}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="gender" aria-required="true">
                        Gender
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={errors.gender ? "error" : ""}
                        aria-label="Student gender"
                        aria-describedby={
                          errors.gender ? "gender-error" : undefined
                        }
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.gender && (
                        <span className="error-message" id="gender-error">
                          {errors.gender}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="parentalStatus" aria-required="true">
                      Parental Status
                    </label>
                    <select
                      id="parentalStatus"
                      name="parentalStatus"
                      value={formData.parentalStatus}
                      onChange={handleInputChange}
                      className={errors.parentalStatus ? "error" : ""}
                      aria-label="Student parental status"
                      aria-describedby={
                        errors.parentalStatus ? "parentalStatus-error" : undefined
                      }
                    >
                      <option value="">Select Status</option>
                      <option value="has both">Has Both Parents</option>
                      <option value="has one">Has One Parent</option>
                      <option value="has guardian">Has Guardian</option>
                      <option value="has none">Has None</option>
                    </select>
                    {errors.parentalStatus && (
                      <span className="error-message" id="parentalStatus-error">
                        {errors.parentalStatus}
                      </span>
                    )}
                  </div>

                  {((formData.parentalStatus && formData.parentalStatus) ===
                    "has one" ||
                    (formData.parentalStatus && formData.parentalStatus) ===
                    "has guardian") && (
                      <>
                        <div className="form-group">
                          <label htmlFor="guardianContact">
                            {formData.parentalStatus === "has one"
                              ? "Parent Name"
                              : "Guardian Name"}{" "}
                            *
                          </label>
                          <input
                            type="text"
                            id="guardianName1"
                            name="guardianName1"
                            value={formData.guardianName1}
                            onChange={handleInputChange}
                            className={errors.guardianName1 ? "error" : ""}
                            placeholder={
                              formData.parentalStatus === "has one"
                                ? "Parent Name"
                                : "Guardian Name"
                            }
                          />
                          {errors.guardianName1 && (
                            <span className="error-message">
                              {errors.guardianName1}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="guardianContact">
                            {formData.parentalStatus === "has one"
                              ? "Parent Contact"
                              : "Guardian Contact"}{" "}
                            *
                          </label>
                          <input
                            type="tel"
                            id="guardianContact1"
                            name="guardianContact1"
                            value={formData.guardianContact1}
                            onChange={handleInputChange}
                            className={errors.guardianContact1 ? "error" : ""}
                            placeholder="10-digit mobile number"
                            pattern="[0-9]{10}"
                          />
                          {errors.guardianContact1 && (
                            <span className="error-message">
                              {errors.guardianContact1}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                  {(formData.parentalStatus && formData.parentalStatus) ===
                    "has both" && (
                      <>
                        <div className="form-group">
                          <label htmlFor="guardianName1">Fathers Name*</label>
                          <input
                            type="text"
                            id="guardianName1"
                            name="guardianName1"
                            value={formData.guardianName1}
                            onChange={handleInputChange}
                            className={errors.guardianName1 ? "error" : ""}
                            placeholder="Father's Name"
                          />
                          {errors.guardianName1 && (
                            <span className="error-message">
                              {errors.guardianName1}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="guardianContact">
                            Father's Contact *
                          </label>
                          <input
                            type="tel"
                            id="guardianContact1"
                            name="guardianContact1"
                            value={formData.guardianContact1}
                            onChange={handleInputChange}
                            className={errors.guardianContact1 ? "error" : ""}
                            placeholder="Contact No"
                            pattern="[0-9]{10}"
                          />
                          {errors.guardianContact1 && (
                            <span className="error-message">
                              {errors.guardianContact1}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="guardianName2">Mother's Name *</label>
                          <input
                            type="text"
                            id="guardianName2"
                            name="guardianName2"
                            value={formData.guardianName2}
                            onChange={handleInputChange}
                            className={errors.guardianName2 ? "error" : ""}
                            placeholder="Mothers Name"
                          />
                          {errors.guardianName2 && (
                            <span className="error-message">
                              {errors.guardianName2}
                            </span>
                          )}
                        </div>
                        <div className="form-group">
                          <label htmlFor="guardianContact2">
                            Mother's Contact *
                          </label>
                          <input
                            type="tel"
                            id="guardianContact2"
                            name="guardianContact2"
                            value={formData.guardianContact2}
                            onChange={handleInputChange}
                            className={errors.guardianContact2 ? "error" : ""}
                            placeholder="10-digit mobile number"
                            pattern="[0-9]{10}"
                          />
                          {errors.guardianContact2 && (
                            <span className="error-message">
                              {errors.guardianContact2}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                  {/* <div className="form-group">
                            <label htmlFor="nextActionDate">Next Action Date</label>
                            <input
                                type="date"
                                id="nextActionDate"
                                name="nextActionDate"
                                value={formatDateForInput(formData.nextActionDate)}
                                onChange={handleInputChange}
                                className={errors.nextActionDate ? 'error' : ''}
                                placeholder="Next Action Date"

                            />
                            {errors.guardianName1 && <span className="error-message">{errors.guardianName1}</span>}
                        </div> */}

                  <div className="form-group">
                    <label htmlFor="facialData" aria-required={mode === "add"}>
                      Facial Photo
                    </label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        ref={fileInputRefs.facialData}
                        onChange={(e) => handleFileChange(e, "facialData")}
                        accept="image/*"
                        style={{ display: "none" }}
                        id="facialData"
                        aria-label="Upload facial photo"
                      />
                      <button
                        type="button"
                        className="file-upload-btn"
                        onClick={() => fileInputRefs.facialData.current.click()}
                      >
                        📤 Upload Photo
                      </button>
                      <button
                        type="button"
                        className="file-upload-btn"
                        onClick={() => setIsOpen(true)}
                      >
                        📷 Capture Photo
                      </button>
                      {(files.facialData || previews.facialData) && (
                        <div className="file-preview facial-photo-preview">
                          <img
                            src={previews.facialData}
                            alt="Facial preview"
                            className="preview-image"
                          />
                          <button
                            type="button"
                            className="remove-photo-btn"
                            onClick={handleRemoveFacialPhoto}
                          >
                            Delete Photo
                          </button>
                        </div>
                      )}
                    </div>
                    {errors.facialData && (
                      <span className="error-message">{errors.facialData}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {shouldShowMedicalHistorySection && (
            <div className="form-section medical-history-section">
              <div className="section-header">
                <h3>
                  Medical History
                  {!isStudentRole ? " (Staff)" : ""}
                </h3>
                <button
                  type="button"
                  className="add-medical-btn"
                  onClick={handleAddMedicalHistory}
                >
                  + Add Medical Record
                </button>
              </div>

              {formData.medicalHistory.length === 0 ? (
                <div className="medical-history-empty">
                  No medical records added yet. Use the button above to capture
                  this user's historical conditions, prescriptions, or notes.
                </div>
              ) : (
                formData.medicalHistory.map((history, index) => (
                  <div key={`medical-${index}`} className="medical-history-item">
                    <div className="medical-history-header">
                      <h4>
                        Case #{index + 1}
                        {history.isExisting && (
                          <span className="existing-record-pill">Existing</span>
                        )}
                      </h4>
                      <button
                        type="button"
                        className={`remove-medical-btn ${history.isExisting ? "disabled" : ""
                          }`}
                        onClick={() => handleRemoveMedicalHistory(index)}
                        title={
                          history.isExisting
                            ? "Existing records can be edited but not removed"
                            : "Remove this record"
                        }
                        disabled={history.isExisting}
                      >
                        ×
                      </button>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Condition / Case Name</label>
                        <input
                          type="text"
                          value={history.name}
                          onChange={(e) =>
                            handleMedicalHistoryChange(
                              index,
                              "name",
                              e.target.value,
                            )
                          }
                          placeholder="eg: Asthma, Allergy"
                        />
                      </div>
                      <div className="form-group">
                        <label>Case ID / Reference</label>
                        <input
                          type="text"
                          value={history.caseId}
                          onChange={(e) =>
                            handleMedicalHistoryChange(
                              index,
                              "caseId",
                              e.target.value,
                            )
                          }
                          placeholder="Hospital reference number"
                        />
                      </div>
                      <div className="form-group">
                        <label>Diagnosis Date</label>
                        <input
                          type="date"
                          value={history.date}
                          min={minAllowedDate}
                          max={today}
                          onChange={(e) =>
                            handleMedicalHistoryChange(
                              index,
                              "date",
                              e.target.value,
                            )
                          }
                        />

                        {errors[`medicalHistory_${index}_date`] && (
                          <span className="error-message">
                            {errors[`medicalHistory_${index}_date`]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Doctor's Name</label>
                        <input
                          type="text"
                          value={history.doctorsName}
                          onChange={(e) =>
                            handleMedicalHistoryChange(
                              index,
                              "doctorsName",
                              e.target.value,
                            )
                          }
                          placeholder="Treating doctor"
                        />
                      </div>
                      <div className="form-group">
                        <label>Hospital / Clinic</label>
                        <input
                          type="text"
                          value={history.hospitalName}
                          onChange={(e) =>
                            handleMedicalHistoryChange(
                              index,
                              "hospitalName",
                              e.target.value,
                            )
                          }
                          placeholder="Healthcare facility"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Condition Details</label>
                      <textarea
                        rows="3"
                        value={history.description}
                        onChange={(e) =>
                          handleMedicalHistoryChange(
                            index,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Describe symptoms, triggers or treatment plans"
                      ></textarea>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Current Status</label>
                        <select
                          value={history.currentStatus?.status || ""}
                          onChange={(e) =>
                            handleMedicalHistoryStatusChange(
                              index,
                              "status",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Select status</option>
                          {MEDICAL_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Status Date</label>
                        <input
                          type="date"
                          value={history.currentStatus?.date || ""}
                          min={minAllowedDate}
                          max={today}
                          onChange={(e) =>
                            handleMedicalHistoryStatusChange(
                              index,
                              "date",
                              e.target.value,
                            )
                          }
                        />

                        {errors[`medicalHistory_${index}_statusDate`] && (
                          <span className="error-message">
                            {errors[`medicalHistory_${index}_statusDate`]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Status Notes</label>
                      <textarea
                        rows="2"
                        value={history.currentStatus?.notes || ""}
                        onChange={(e) =>
                          handleMedicalHistoryStatusChange(
                            index,
                            "notes",
                            e.target.value,
                          )
                        }
                        placeholder="Any active prescriptions, symptoms or care instructions"
                      ></textarea>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Prescriptions</label>
                        <label
                          className="file-upload-btn"
                          style={{
                            display: "inline-block",
                            marginTop: "0.25rem",
                          }}
                        >
                          Choose prescription files
                          <input
                            type="file"
                            multiple
                            accept={ACCEPTED_PRESCRIPTION_TYPES}
                            onChange={(e) =>
                              handleMedicalHistoryFileChange(
                                index,
                                "prescriptions",
                                e,
                              )
                            }
                            style={{ display: "none" }}
                          />
                        </label>
                        <span
                          style={{
                            marginLeft: "0.75rem",
                            color: "#666",
                            fontSize: "0.85rem",
                          }}
                        >
                          {history.prescriptions?.length > 0
                            ? `${history.prescriptions.length} file(s) selected`
                            : "PDF, JPG, JPEG, PNG"}
                        </span>
                        {history.prescriptions?.length > 0 && (
                          <div className="file-list">
                            {history.prescriptions.map((file, fileIndex) => (
                              <div key={fileIndex} className="file-item">
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveMedicalHistoryFile(
                                      index,
                                      "prescriptions",
                                      fileIndex,
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {history.existingPrescriptions?.length > 0 && (
                          <div className="existing-file-list">
                            {history.existingPrescriptions.map(
                              (fileUrl, fileIndex) => (
                                <a
                                  key={fileIndex}
                                  href={fileUrl}
                                  className="existing-file-link"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View prescription {fileIndex + 1}
                                </a>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Other Attachments</label>
                        <label
                          className="file-upload-btn"
                          style={{
                            display: "inline-block",
                            marginTop: "0.25rem",
                          }}
                        >
                          Choose attachment files
                          <input
                            type="file"
                            multiple
                            accept={ACCEPTED_ATTACHMENT_TYPES}
                            onChange={(e) =>
                              handleMedicalHistoryFileChange(
                                index,
                                "otherAttachments",
                                e,
                              )
                            }
                            style={{ display: "none" }}
                          />
                        </label>
                        <span
                          style={{
                            marginLeft: "0.75rem",
                            color: "#666",
                            fontSize: "0.85rem",
                          }}
                        >
                          {history.otherAttachments?.length > 0
                            ? `${history.otherAttachments.length} file(s) selected`
                            : "PDF, DOC, DOCX, JPG, JPEG, PNG"}
                        </span>
                        {history.otherAttachments?.length > 0 && (
                          <div className="file-list">
                            {history.otherAttachments.map((file, fileIndex) => (
                              <div key={fileIndex} className="file-item">
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveMedicalHistoryFile(
                                      index,
                                      "otherAttachments",
                                      fileIndex,
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {history.existingOtherAttachments?.length > 0 && (
                          <div className="existing-file-list">
                            {history.existingOtherAttachments.map(
                              (fileUrl, fileIndex) => (
                                <a
                                  key={fileIndex}
                                  href={fileUrl}
                                  className="existing-file-link"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View attachment {fileIndex + 1}
                                </a>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {errors.medicalHistory && (
                <span className="form-error-message">
                  {errors.medicalHistory}
                </span>
              )}
            </div>
          )}

          {/* Sprint6-Story-02-Phase4: Medical Check-ins Section (Inline Form) */}
          {mode === "edit" && formData.role === "student" && (
            <div className="form-section medical-checkins-section">
              <div className="section-header">
                <h3>Medical Check-ins</h3>
                {!showCheckInForm && (
                  <button
                    type="button"
                    className="add-medical-btn"
                    onClick={handleCreateCheckIn}
                  >
                    + Create New Check-in
                  </button>
                )}
              </div>

              {/* Inline Check-in Form */}
              {showCheckInForm && (
                <CheckInForm
                  studentData={{
                    studentId: user._id,
                    userName: user.name,
                    balagruhaIds: user.balagruhaIds || [],
                  }}
                  checkInData={editingCheckIn}
                  mode={formMode}
                  onSave={handleCheckInSave}
                  onCancel={handleCheckInCancel}
                  balagruhas={balagruhaOptions}
                />
              )}

              {/* Check-ins List */}
              {!showCheckInForm && (
                <>
                  {isLoadingCheckIns ? (
                    <div style={{ padding: "20px", textAlign: "center" }}>
                      Loading check-ins...
                    </div>
                  ) : checkIns.length === 0 ? (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "#666",
                      }}
                    >
                      No medical check-ins found for this student.
                    </div>
                  ) : (
                    <div className="checkins-list">
                      {checkIns.map((checkIn, index) => (
                        <div key={checkIn._id || index} className="checkin-item">
                          <div className="checkin-header">
                            <span className="checkin-date">
                              {formatCheckInDate(checkIn.date)}
                            </span>
                            <div className="checkin-header-actions">
                              <span
                                className={`health-status ${checkIn.healthStatus}`}
                              >
                                {checkIn.healthStatus}
                              </span>
                              <button
                                type="button"
                                className="edit-checkin-btn"
                                onClick={() => handleEditCheckIn(checkIn)}
                                title="Edit check-in"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </div>
                          <div className="checkin-details">
                            {checkIn.temperature && (
                              <p>
                                <strong>Temperature:</strong>{" "}
                                {checkIn.temperature}°F
                              </p>
                            )}
                            {checkIn.symptoms && checkIn.symptoms.length > 0 && (
                              <p>
                                <strong>Symptoms:</strong>{" "}
                                {checkIn.symptoms.join(", ")}
                              </p>
                            )}
                            {checkIn.notes && (
                              <p>
                                <strong>Notes:</strong> {checkIn.notes}
                              </p>
                            )}
                            {/* Sprint6-Story-02-Phase4-DEBUG: Log check-in data */}

                            {checkIn.doctorVisits &&
                              checkIn.doctorVisits.length > 0 && (
                                <p>
                                  <strong>Doctor Visits:</strong>{" "}
                                  {checkIn.doctorVisits.length}
                                </p>
                              )}
                            {checkIn.followUps &&
                              checkIn.followUps.length > 0 && (
                                <p>
                                  <strong>Follow-ups:</strong>{" "}
                                  {checkIn.followUps.length}
                                </p>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "add"
                  ? "Create User"
                  : "Save Changes"}
            </button>
            <button
              type="button"
              className="cancel-btn"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>

          {errors.submit && <div className="submit-error">{errors.submit}</div>}
        </form>

        {/* Sprint6-Story-02-Phase4: Inline form (no modal needed) */}
      </div>
    );
  };



export default UserForm;
