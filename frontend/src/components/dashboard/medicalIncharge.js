import React, { useEffect, useMemo, useState } from "react";
import "./MedicInchargeDashboard.css";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import CheckInModal from "./CheckInModal";
import ViewCheckInModal from "./ViewCheckInModal";
import TaskManagement from "../TaskManagement/taskmanagement";
import UserManagement from "../usermanagement/usermanagement";
import { createMedicalCheckin, updateMedicalCheckin, deleteMedicalCheckin, addMedicalCheckinAttachments, deleteMedicalCheckinAttachment, getAnyUserBasedonRoleandBalagruha, getBalagruha, getMedicalConditionBasedOnBalagruha, getUserBalagruhas } from "../../api";
import showToast from '../../utils/toast';
import DateRangeSelector from "../shop/DateRangeSelector";
import StudentDetailsTooltip from "./StudentDetailsTooltip";
import DoctorVisitsTooltip from "./DoctorVisitsTooltip";
import FollowUpsTooltip from "./FollowUpsTooltip";

const CLOSED_STATUSES = new Set(["completed", "inactive", "closed", "resolved"]);
const ACTIVE_STATUSES = new Set(["active", "ongoing", "in-progress", "scheduled", "pending", ""]);

const parseStoredBalagruhaIds = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem("balagruhaIds") || "[]");
    return (Array.isArray(parsed) ? parsed : [])
      .map((item) => item?._id || item?.id || item)
      .filter(Boolean);
  } catch (error) {
    return (localStorage.getItem("balagruhaIds") || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
};

const getDoctorVisitsList = (checkin = {}) => {
  if (Array.isArray(checkin.doctorVisits) && checkin.doctorVisits.length) {
    return checkin.doctorVisits.filter(Boolean);
  }
  if (checkin.doctorVisit && (checkin.doctorVisit.doctorName || checkin.doctorVisit.hospitalName)) {
    return [checkin.doctorVisit];
  }
  return [];
};

const getFollowUpsList = (checkin = {}) => {
  if (Array.isArray(checkin.followUps) && checkin.followUps.length) {
    return checkin.followUps.filter(Boolean);
  }
  if (checkin.followUp && (checkin.followUp.followUpDate || checkin.followUp.status || checkin.followUp.hospital || checkin.followUp.doctor)) {
    return [checkin.followUp];
  }
  return [];
};

const getLatestDoctorVisitName = (checkin = {}) => {
  const visits = getDoctorVisitsList(checkin);
  if (!visits.length) {
    return "-";
  }
  const latest = visits[visits.length - 1];
  return latest.doctorName || latest.hospitalName || "-";
};

const getLatestFollowUpSummary = (checkin = {}) => {
  const followUps = getFollowUpsList(checkin);
  if (!followUps.length) {
    return checkin.followUp?.doctor || checkin.followUp?.hospital || "-";
  }
  const latest = followUps[followUps.length - 1];
  return latest.doctor || latest.hospital || "-";
};

const getLatestFollowUp = (checkin = {}) => {
  const followUps = getFollowUpsList(checkin);
  if (!followUps.length) {
    return null;
  }
  return followUps[followUps.length - 1];
};

const getPrimarySymptom = (checkin = {}) => {
  if (Array.isArray(checkin.symptoms) && checkin.symptoms.length) {
    const filtered = checkin.symptoms.filter(Boolean);
    if (filtered.length) {
      return filtered.join(", ");
    }
  }
  return checkin.customSymptom || "-";
};

const getCaseClosedDate = (checkin = {}) => {
  const latestFollowUp = getLatestFollowUp(checkin);
  const fallback = checkin.updatedAt || checkin.date;
  if (!latestFollowUp) {
    return fallback ? new Date(fallback) : null;
  }
  const closeDate = latestFollowUp.followUpDate || latestFollowUp.updatedAt || latestFollowUp.createdAt || fallback;
  return closeDate ? new Date(closeDate) : null;
};

const isClosedCase = (checkin = {}) => {
  const latestStatus = (getLatestFollowUp(checkin)?.status || checkin.followUp?.status || "").toLowerCase();
  return CLOSED_STATUSES.has(latestStatus);
};

const hasActiveFollowUp = (checkin = {}) => {
  const followUps = getFollowUpsList(checkin);
  if (!followUps.length) {
    return false;
  }
  return followUps.some((followUp) => ACTIVE_STATUSES.has((followUp.status || "").toLowerCase()));
};

const formatCaseDate = (date) => {
  if (!date) {
    return "-";
  }
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStudentCountKey = (checkin = {}) => {
  const studentId = checkin.studentId;
  if (studentId && typeof studentId === "object") {
    return studentId._id || studentId.id;
  }
  return studentId || checkin.userId || checkin._id;
};

const MedicInchargeDashboard = () => {
  const getVerticalPosition = (rect) => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const neededSpace = 550; // Estimated max height of tooltip

    if (spaceBelow < neededSpace) {
      return { y: window.innerHeight - rect.bottom, alignY: 'bottom' };
    }
    return { y: rect.top, alignY: 'top' };
  };

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [balagruhaData, setBalagruhaData] = useState([]);
  const [search, setSearch] = useState();
  const [medicalStatus, setMedicalStatus] = useState('all');
  const [selectedBalagruha, setSelectedBalagruha] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checkInsPage, setCheckInsPage] = useState(1);
  const CHECKINS_PER_PAGE = 10;
  const [editData, setEditData] = useState();
  const [editMode, setEditMode] = useState(false);
  // New state for dashboard filters
  const [selectedStatusFilters, setSelectedStatusFilters] = useState(['normal', 'important', 'critical']);
  const [hoveredStudent, setHoveredStudent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredDoctorVisits, setHoveredDoctorVisits] = useState(null);
  const [doctorVisitsTooltipPosition, setDoctorVisitsTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredFollowUps, setHoveredFollowUps] = useState(null);
  const [followUpsTooltipPosition, setFollowUpsTooltipPosition] = useState({ x: 0, y: 0 });
  const [closedCasesPage, setClosedCasesPage] = useState(1);
  const CLOSED_CASES_PER_PAGE = 5;
  const [checkIns, setCheckIns] = useState([
    // {
    //   id: "HC001",
    //   studentId: "STU001",
    //   studentName: "Alex Johnson",
    //   temperature: 36.8,
    //   mood: "Happy",
    //   timestamp: "2025-03-26 08:30 AM",
    //   status: "Normal",
    // },
    // {
    //   id: "HC002",
    //   studentId: "STU002",
    //   studentName: "Maya Patel",
    //   temperature: 37.9,
    //   mood: "Tired",
    //   timestamp: "2025-03-26 09:15 AM",
    //   status: "Warning",
    // },
    // {
    //   id: "HC003",
    //   studentId: "STU003",
    //   studentName: "Tyler Smith",
    //   temperature: 36.5,
    //   mood: "Neutral",
    //   timestamp: "2025-03-26 10:00 AM",
    //   status: "Normal",
    // },
    // {
    //   id: "HC004",
    //   studentId: "STU004",
    //   studentName: "Emma Wilson",
    //   temperature: 38.2,
    //   mood: "Unwell",
    //   timestamp: "2025-03-26 10:45 AM",
    //   status: "Alert",
    // },
  ]);

  useEffect(() => {
    fetchBalagruha()

    const handleGlobalClick = () => {
      setHoveredStudent(null);
      setHoveredDoctorVisits(null);
      setHoveredFollowUps(null);
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [])

  // Fetch check-ins using the medic's actual assigned Balagruhas (balagruhaData),
  // which can include multiple Balagruhas and is always fresh from the server —
  // rather than a localStorage snapshot that can go stale if assignments change.
  useEffect(() => {
    if (balagruhaData.length > 0) {
      fetchMedicalData(balagruhaData.map((bal) => bal._id));
    }
  }, [balagruhaData])

  // Handle navigation from Layout menu with state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Mock data for dashboard
  const [recentHealthCheckins, setRecentHealthCheckins] = useState([]);

  const emergencyAlerts = [
    {
      id: "EA001",
      studentName: "Emma Wilson",
      issue: "High Temperature (38.2°C)",
      timestamp: "2025-03-26 10:45 AM",
      status: "New",
    },
    {
      id: "EA002",
      studentName: "Liam Johnson",
      issue: "Reported Severe Headache",
      timestamp: "2025-03-26 09:30 AM",
      status: "In Progress",
    },
  ];

  const healthMetrics = [
    {
      date: "2025-03-20",
      avgTemperature: 36.7,
      moodScore: 4.2,
      checkInsCompleted: 18,
    },
    {
      date: "2025-03-21",
      avgTemperature: 36.6,
      moodScore: 4.3,
      checkInsCompleted: 20,
    },
    {
      date: "2025-03-22",
      avgTemperature: 36.8,
      moodScore: 4.1,
      checkInsCompleted: 19,
    },
    {
      date: "2025-03-23",
      avgTemperature: 36.9,
      moodScore: 3.9,
      checkInsCompleted: 21,
    },
    {
      date: "2025-03-24",
      avgTemperature: 37.0,
      moodScore: 3.8,
      checkInsCompleted: 22,
    },
    {
      date: "2025-03-25",
      avgTemperature: 36.8,
      moodScore: 4.0,
      checkInsCompleted: 20,
    },
    {
      date: "2025-03-26",
      avgTemperature: 37.1,
      moodScore: 3.7,
      checkInsCompleted: 15,
    },
  ];

  const studentList = [
    {
      id: "STU001",
      name: "Alex Johnson",
      age: 12,
      lastCheckIn: "2025-03-26 08:30 AM",
      healthStatus: "Normal",
    },
    {
      id: "STU002",
      name: "Maya Patel",
      age: 11,
      lastCheckIn: "2025-03-26 09:15 AM",
      healthStatus: "Warning",
    },
    {
      id: "STU003",
      name: "Tyler Smith",
      age: 13,
      lastCheckIn: "2025-03-26 10:00 AM",
      healthStatus: "Normal",
    },
    {
      id: "STU004",
      name: "Emma Wilson",
      age: 12,
      lastCheckIn: "2025-03-26 10:45 AM",
      healthStatus: "Alert",
    },
    {
      id: "STU005",
      name: "Liam Johnson",
      age: 13,
      lastCheckIn: "2025-03-26 09:30 AM",
      healthStatus: "Warning",
    },
  ];

  const moodEmoji = {
    Happy: "😊",
    Neutral: "😐",
    Tired: "😴",
    Unwell: "🤒",
    Sad: "😔",
  };

  const {
    closedCases,
    closedCaseRecords,
    sickStudentsCount,
    ongoingTreatmentsCount,
    criticalCasesCount,
  } = useMemo(() => {
    const sickStudents = new Set();
    const closedEntries = [];
    const ongoingEntries = [];
    let criticalCount = 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    recentHealthCheckins.forEach((checkin) => {
      const healthStatus = (checkin.healthStatus || "").toLowerCase();
      const checkInDate = checkin.date ? new Date(checkin.date) : null;

      if (healthStatus === "critical") {
        criticalCount += 1;
      }

      if (checkInDate && checkInDate >= startOfMonth && checkInDate <= endOfMonth) {
        const studentKey = getStudentCountKey(checkin);
        if (studentKey) {
          sickStudents.add(studentKey.toString());
        }
      }

      if (isClosedCase(checkin)) {
        closedEntries.push({
          checkin,
          closedDate: getCaseClosedDate(checkin) || checkInDate || new Date(),
        });
      } else if (hasActiveFollowUp(checkin) || healthStatus !== "normal") {
        ongoingEntries.push(checkin);
      }
    });

    const sortedClosed = closedEntries.sort(
      (a, b) => (b.closedDate?.getTime() || 0) - (a.closedDate?.getTime() || 0)
    );

    const closedHistoryTiles = sortedClosed.map(({ checkin, closedDate }) => {
      const balagruhaName =
        checkin?.balagruhaNames?.[0] ||
        checkin?.balagruhaName ||
        "";
      const studentName = checkin?.userName || "Unknown";
      const doctorName = getLatestDoctorVisitName(checkin);
      const symptomsSummary = getPrimarySymptom(checkin);
      const followUpCount = getFollowUpsList(checkin).length;

      return {
        id: checkin?._id,
        studentName,
        initials: (studentName || "?").charAt(0).toUpperCase(),
        symptomsSummary,
        doctorName,
        balagruhaName,
        followUpCount,
        closedDate,
        rawCheckin: checkin,
      };
    });

    return {
      closedCases: sortedClosed,
      closedCaseRecords: closedHistoryTiles,
      sickStudentsCount: sickStudents.size,
      ongoingTreatmentsCount: ongoingEntries.length,
      criticalCasesCount: criticalCount,
    };
  }, [recentHealthCheckins]);

  const totalClosedPages = Math.max(
    1,
    Math.ceil(closedCaseRecords.length / CLOSED_CASES_PER_PAGE)
  );

  const paginatedClosedCases = useMemo(() => {
    const startIndex = (closedCasesPage - 1) * CLOSED_CASES_PER_PAGE;
    return closedCaseRecords.slice(
      startIndex,
      startIndex + CLOSED_CASES_PER_PAGE
    );
  }, [closedCaseRecords, closedCasesPage]);

  useEffect(() => {
    if (closedCasesPage > totalClosedPages) {
      setClosedCasesPage(totalClosedPages);
    }
  }, [closedCasesPage, totalClosedPages]);

  const sportCoachMenu = [
    { id: 1, name: "Dashboard", activeTab: "dashboard" },
    { id: 2, name: "Students", activeTab: "students" },
    { id: 3, name: "Check Ins", activeTab: "checkins" },
    // { id: 4, name: "Alerts", activeTab: "alerts", link: "/task" },
    { id: 5, name: "Tasks", activeTab: "tasks" },
    { id: 6, name: "Purchases", activeTab: "purchases", link: "/purchase" },
    { id: 7, name: "Shop", activeTab: "shop", link: "/shop" },
    // Doctors Data Bank — shared doctor directory managed by medical incharge
    { id: 8, name: "Doctors", activeTab: "doctors", link: "/medical/doctors" },
    //     { id: 5, name: "Performance", activeTab: "" },
    // { id: 6, name: "Reports", activeTab: "reports" },
  ];
  const handleOpenModal = (checkin = null, edit = null) => {

    setEditData(checkin);
    setEditMode(edit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditMode(false);
    setIsModalOpen(false);
  };

  const handleOpenViewModal = (checkin) => {
    setViewData(checkin);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewData(null);
  };

  const handleEditFromView = (checkin) => {
    // Close view modal
    setIsViewModalOpen(false);
    // Open edit modal
    handleOpenModal(checkin, true);
  };

  const handleSubmitCheckIn = async (formData, checkInId = null, removedAttachmentIds = []) => {
    try {
      if (editMode && checkInId) {
        // Update existing check-in
        // Sprint6-Story-3-BugFix: Support both old and new formats
        const updateData = {
          studentId: formData.studentId,
          temperature: formData.temperature,
          date: `${formData.date} ${formData.time}`,
          healthStatus: formData.healthStatus,
          notes: formData.notes,
          symptoms: formData.symptoms,
          customSymptom: formData.customSymptom,
        };

        // Sprint6-Story-3: Handle NEW array format (doctorVisits/followUps)
        if (formData.doctorVisits && formData.doctorVisits.length > 0) {
          // Send doctorVisits array (without files, files sent separately)
          const doctorVisitsData = formData.doctorVisits.map(visit => ({
            doctorName: visit.doctorName,
            hospitalName: visit.hospitalName,
            visitDate: visit.visitDate,
            testDetails: visit.testDetails,
            conclusion: visit.conclusion,
          }));
          updateData.doctorVisits = doctorVisitsData;
        }

        if (formData.followUps && formData.followUps.length > 0) {
          // Send followUps array (without files, files sent separately)
          const followUpsData = formData.followUps.map(followUp => ({
            followUpDate: followUp.followUpDate,
            hospital: followUp.hospital,
            doctor: followUp.doctor,
            assignedCoaches: followUp.assignedCoaches,
            status: followUp.status,
            notes: followUp.notes,
          }));
          updateData.followUps = followUpsData;
        }

        // Backward compatibility: Handle OLD single object format
        if (formData.doctorVisit && typeof formData.doctorVisit === 'object') {
          updateData["doctorVisit.doctorName"] = formData.doctorVisit.doctorName;
          updateData["doctorVisit.hospitalName"] = formData.doctorVisit.hospitalName;
          updateData["doctorVisit.visitDate"] = formData.doctorVisit.visitDate;
          updateData["doctorVisit.testDetails"] = formData.doctorVisit.testDetails;
          updateData["doctorVisit.conclusion"] = formData.doctorVisit.conclusion;
        }

        if (formData.followUp && typeof formData.followUp === 'object') {
          updateData["followUp.followUpDate"] = formData.followUp.followUpDate;
          updateData["followUp.hospital"] = formData.followUp.hospital;
          updateData["followUp.doctor"] = formData.followUp.doctor;
          updateData["followUp.assignedCoaches"] = formData.followUp.assignedCoaches;
          updateData["followUp.status"] = formData.followUp.status;
        }

        const response = await updateMedicalCheckin(checkInId, updateData);
        if (response.success) {
          // Delete removed attachments first
          if (removedAttachmentIds && removedAttachmentIds.length > 0) {
            for (const attachmentId of removedAttachmentIds) {
              try {
                await deleteMedicalCheckinAttachment(checkInId, attachmentId);
              } catch (error) {
                console.error(`Failed to delete attachment ${attachmentId}:`, error);
              }
            }
          }

          // Check if there are new attachments (File objects, not existing DB attachments with fileUrl)
          const newImages = formData.uploadedImages.filter(file => file instanceof File);
          const newPdfs = formData.uploadedPdfs.filter(file => file instanceof File);

          // Sprint6-Story-3-BugFix: Collect prescription/test files from NEW array format
          let newPrescriptions = [];
          let newTestResults = [];

          if (formData.doctorVisits && Array.isArray(formData.doctorVisits)) {
            // NEW format: collect files from all doctor visits
            formData.doctorVisits.forEach(visit => {
              if (visit.prescriptionFiles) {
                newPrescriptions.push(...visit.prescriptionFiles.filter(file => file instanceof File));
              }
              if (visit.testResultFiles) {
                newTestResults.push(...visit.testResultFiles.filter(file => file instanceof File));
              }
            });
          } else if (formData.doctorVisit && typeof formData.doctorVisit === 'object') {
            // OLD format: backward compatibility
            newPrescriptions = formData.doctorVisit.prescriptionFiles?.filter(file => file instanceof File) || [];
            newTestResults = formData.doctorVisit.testResultFiles?.filter(file => file instanceof File) || [];
          }
          const hasNewAttachments = newImages.length > 0 || newPdfs.length > 0 || newPrescriptions.length > 0 || newTestResults.length > 0;

          if (hasNewAttachments) {
            // Send new attachments separately
            const attachmentFormData = new FormData();
            attachmentFormData.append("createdBy", localStorage.getItem("userId"));

            newImages.forEach((file) => {
              attachmentFormData.append("attachments", file);
            });
            newPdfs.forEach((file) => {
              attachmentFormData.append("attachments", file);
            });
            newPrescriptions.forEach((file) => {
              attachmentFormData.append("prescriptions", file);
            });
            newTestResults.forEach((file) => {
              attachmentFormData.append("testResults", file);
            });

            const attachmentResponse = await addMedicalCheckinAttachments(checkInId, attachmentFormData);
            if (attachmentResponse.success) {
              showToast("Medical Check-in and attachments updated successfully", "success");
            } else {
              showToast("Check-in updated but failed to add attachments", "warning");
            }
          } else {
            showToast("Medical Check-in updated successfully", "success");
          }
          await fetchMedicalData(balagruhaData.map((bal) => bal._id));
        } else {
          // Sprint6-Story-3-AC4: Show specific error message from backend
          const errorMessage = response.message || "Failed to update medical check-in";
          showToast(errorMessage, "error");
        }
      } else {
        // Create new check-in
        const formDataToSend = new FormData();
        formDataToSend.append("studentId", formData.studentId);
        formDataToSend.append("temperature", formData.temperature);
        formDataToSend.append("date", `${formData.date} ${formData.time}`);
        formDataToSend.append("healthStatus", formData.healthStatus);
        formDataToSend.append("notes", formData.notes);

        // NEW FIELDS (Sprint6-Story-3: Arrays for multiple visits/followups)
        // Sprint6-Story-3-BugFix: Send symptoms as array items, not JSON string
        if (formData.symptoms && Array.isArray(formData.symptoms)) {
          formData.symptoms.forEach((symptom) => {
            formDataToSend.append("symptoms[]", symptom);
          });
        }
        formDataToSend.append("customSymptom", formData.customSymptom);

        // Send doctorVisits array (without files, files sent separately)
        const doctorVisitsData = (formData.doctorVisits || []).map(visit => ({
          doctorName: visit.doctorName,
          hospitalName: visit.hospitalName,
          visitDate: visit.visitDate,
          testDetails: visit.testDetails,
          conclusion: visit.conclusion,
        }));
        formDataToSend.append("doctorVisits", JSON.stringify(doctorVisitsData));

        // Send followUps array (without files, files sent separately)
        const followUpsData = (formData.followUps || []).map(followUp => ({
          followUpDate: followUp.followUpDate,
          hospital: followUp.hospital,
          doctor: followUp.doctor,
          assignedCoaches: followUp.assignedCoaches,
          status: followUp.status,
          notes: followUp.notes,
        }));
        formDataToSend.append("followUps", JSON.stringify(followUpsData));

        // Append general attachments
        formData.uploadedImages.forEach((file) => {
          if (file instanceof File) {
            formDataToSend.append("attachments", file);
          }
        });
        formData.uploadedPdfs.forEach((file) => {
          if (file instanceof File) {
            formDataToSend.append("attachments", file);
          }
        });

        // Append prescription files from all doctor visits
        (formData.doctorVisits || []).forEach((visit) => {
          (visit.prescriptionFiles || []).forEach((file) => {
            if (file instanceof File) {
              formDataToSend.append("prescriptions", file);
            }
          });
        });

        // Append test result files from all doctor visits
        (formData.doctorVisits || []).forEach((visit) => {
          (visit.testResultFiles || []).forEach((file) => {
            if (file instanceof File) {
              formDataToSend.append("testResults", file);
            }
          });
        });

        // Append description files from all follow-ups
        (formData.followUps || []).forEach((followUp) => {
          (followUp.descriptionFiles || []).forEach((file) => {
            if (file instanceof File) {
              formDataToSend.append("followUpDescriptions", file);
            }
          });
        });

        // Append test result files from all follow-ups
        (formData.followUps || []).forEach((followUp) => {
          (followUp.testResultFiles || []).forEach((file) => {
            if (file instanceof File) {
              formDataToSend.append("followUpTestResults", file);
            }
          });
        });

        const response = await createMedicalCheckin(formDataToSend);
        if (response.success) {
          showToast("Medical Check-in created successfully", "success");
          await fetchMedicalData(balagruhaData.map((bal) => bal._id));
        } else {
          // Sprint6-Story-3-AC4: Show specific error message from backend
          const errorMessage = response.message || "Failed to create medical check-in";
          showToast(errorMessage, "error");
        }
      }
      setEditMode(false);
    } catch (error) {
      console.error("Error submitting check-in:", error);
      // Sprint6-Story-3-AC4: Show specific error message if available
      const errorMessage = error.response?.data?.message || error.message || "Error submitting medical check-in";
      showToast(errorMessage, "error");
    }
  };

  const handleDeleteCheckIn = async (id) => {
    try {
      const response = await deleteMedicalCheckin(id);
      if (response.success) {
        showToast("Medical Check-in deleted successfully", "success");
        fetchMedicalData(balagruhaData.map((bal) => bal._id)); // Refresh the list
      } else {
        showToast("Failed to delete medical check-in", "error");
      }
    } catch (error) {
      console.error("Error deleting check-in:", error);
      showToast("Error deleting medical check-in", "error");
    }
  };

  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedPdfs, setUploadedPdfs] = useState([]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleOpenUpdateModal = (student) => {
    setSelectedStudent(student);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedStudent(null);
    setUploadedFiles([]);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles((prevFiles) => [...prevFiles, ...files]);
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();


    handleCloseUpdateModal();
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
    setUploadedImages((prev) => [...prev, ...validFiles]);
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
    setUploadedPdfs((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePdf = (index) => {
    setUploadedPdfs((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchBalagruha = async () => {
    // Sprint6-Story-3-BugFix: Use getUserBalagruhas instead of getBalagruha
    // getUserBalagruhas returns the current user's assigned balagruhas
    try {
      const response = await getUserBalagruhas();

      // Backend returns { success: true, data: [balagruhas] }
      // where data is the array directly
      if (response.success && Array.isArray(response.data)) {
        // Filter out the STOCK option, only keep actual balagruhas
        const actualBalagruhas = response.data.filter(b => b._id !== 'STOCK');

        setBalagruhaData(actualBalagruhas);
      } else {
        console.error("Invalid response structure:", response);
        showToast("Error fetching balagruha: Invalid data", "error");
        setBalagruhaData([]);
      }
    } catch (error) {
      console.error("Error in fetchBalagruha:", error);
      showToast("Error fetching balagruha", "error");
      setBalagruhaData([]);
    }
  }

  const fetchMedicalData = async(balagruhaIds) => {
    // Prefer the live list of the medic's assigned Balagruhas (from balagruhaData,
    // passed in by the caller). Fall back to localStorage only if that isn't
    // available yet, so students across every assigned Balagruha are included.
    const idsToUse = balagruhaIds && balagruhaIds.length > 0
      ? balagruhaIds
      : parseStoredBalagruhaIds();
    const response = await getMedicalConditionBasedOnBalagruha(idsToUse);
    if(response.success) {
      // Show all check-ins for students in assigned balagruhas (not just ones created by this user)
      setRecentHealthCheckins(response?.data?.medicalCheckIns || []);
    } else {
      showToast("Error in fetching Medical Condition Details", "error")
    }

  }

  const handleDateRangeChange = (start, end) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (start && new Date(start) > today) {
      showToast("Start date cannot be a future date", "error");
      return;
    }

    if (end && new Date(end) > today) {
      showToast("End date cannot be a future date", "error");
      return;
    }

    if (start && end && new Date(start) > new Date(end)) {
      showToast("Start date cannot be greater than end date", "error");
      return;
    }

    setStartDate(start);
    setEndDate(end);
  };

  const filterMedicalCheckInData = recentHealthCheckins.filter((user) => {
    if (search &&
      !user?.userName?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }

    if (medicalStatus !== "all" && user?.healthStatus !== medicalStatus) {
      return false;
    }

    if (selectedBalagruha !== 'all' && user?.balagruhaIds[0] !== selectedBalagruha) {
      return false;
    }

    // Date range filtering
    if (startDate || endDate) {
      const checkInDate = new Date(user.date);
      checkInDate.setHours(0, 0, 0, 0); // Normalize to midnight for comparison

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (checkInDate < start) {
          return false;
        }
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of day
        if (checkInDate > end) {
          return false;
        }
      }
    }



    return true;
  })

  const totalCheckInsPages = Math.max(
    1,
    Math.ceil(filterMedicalCheckInData.length / CHECKINS_PER_PAGE)
  );

  const paginatedCheckIns = filterMedicalCheckInData.slice(
    (checkInsPage - 1) * CHECKINS_PER_PAGE,
    checkInsPage * CHECKINS_PER_PAGE
  );

  useEffect(() => {
    setCheckInsPage(1);
  }, [search, medicalStatus, selectedBalagruha, startDate, endDate]);

  useEffect(() => {
    if (checkInsPage > totalCheckInsPages) {
      setCheckInsPage(totalCheckInsPages);
    }
  }, [checkInsPage, totalCheckInsPages]);

  return (
    <div className="medic-incharge-dashboard">
      <div className="header">
        <div className="user-info" style={{ flexDirection: "row" }}>
          <h2>Hi {localStorage?.getItem("name")},</h2>
          <div className="avatar">
            {localStorage?.getItem("name")?.charAt(0)}
          </div>
        </div>

        {/* Top Menu */}
        <div className="top-menu scrollable-menu">
          {sportCoachMenu.map((menu) => (
            <div
              key={menu.id}
              className={`menu-item ${activeTab === menu.activeTab ? "active" : ""
                }`}
              onClick={() => {
                if (menu.link) {
                  navigate(menu.link);
                } else {
                  setActiveTab(menu?.activeTab);
                }
              }}
            >
              {menu.name}
            </div>
          ))}
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
      {/* Collapsible Sidebar */}
      {/* <div className={`medic-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="medic-sidebar-content">
                    <nav className="medic-sidebar-menu">
                        <ul>
                            <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                                <span className="emoji">📊</span>
                                {sidebarOpen && <span>Dashboard</span>}
                            </li>
                            <li className={activeTab === 'checkins' ? 'active' : ''} onClick={() => setActiveTab('checkins')}>
                                <span className="emoji">🩺</span>
                                {sidebarOpen && <span>Health Check-ins</span>}
                            </li>
                            <li className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>
                                <span className="emoji">👥</span>
                                {sidebarOpen && <span>Students</span>}
                            </li>
                            <li className={activeTab === 'alerts' ? 'active' : ''} onClick={() => setActiveTab('alerts')}>
                                <span className="emoji">🚨</span>
                                {sidebarOpen && <span>Health Alerts</span>}
                            </li>
                            <li className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
                                <span className="emoji">📝</span>
                                {sidebarOpen && <span>Health Reports</span>}
                            </li>
                            <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
                                <span className="emoji">⚙️</span>
                                {sidebarOpen && <span>Settings</span>}
                            </li>
                        </ul>
                    </nav>
                </div>
            </div> */}

      {/* Main Content Area */}
      <div className="medic-main-content">
        {/* Tab Content */}
        <div className="medic-dashboard-content">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="medic-dashboard-overview">
              <h2>Health Overview</h2>

              <div className="medic-stats-cards">
                <div className="medic-stat-card">
                  <div className="medic-stat-card-header">
                    <div className="medic-stat-icon success">🎯</div>
                    <span className="medic-stat-chip">Closed</span>
                  </div>
                  <div className="medic-stat-info">
                    <p className="medic-stat-label">Total Students Treated</p>
                    <h3 className="medic-stat-value">{closedCases.length}</h3>
                    <span className="medic-stat-subtext">Closed cases recorded</span>
                  </div>
                </div>
                <div className="medic-stat-card">
                  <div className="medic-stat-card-header">
                    <div className="medic-stat-icon sick">🤒</div>
                    <span className="medic-stat-chip warning">Month</span>
                  </div>
                  <div className="medic-stat-info">
                    <p className="medic-stat-label">Sick Students This Month</p>
                    <h3 className="medic-stat-value">{sickStudentsCount}</h3>
                    <span className="medic-stat-subtext">Unique students needing care</span>
                  </div>
                </div>
                <div className="medic-stat-card">
                  <div className="medic-stat-card-header">
                    <div className="medic-stat-icon pending">🕒</div>
                    <span className="medic-stat-chip info">Follow-up</span>
                  </div>
                  <div className="medic-stat-info">
                    <p className="medic-stat-label">Ongoing Treatments</p>
                    <h3 className="medic-stat-value">{ongoingTreatmentsCount}</h3>
                    <span className="medic-stat-subtext">Follow-ups still in progress</span>
                  </div>
                </div>
                <div className="medic-stat-card">
                  <div className="medic-stat-card-header">
                    <div className="medic-stat-icon alert">🚨</div>
                    <span className="medic-stat-chip danger">Alert</span>
                  </div>
                  <div className="medic-stat-info">
                    <p className="medic-stat-label">Critical Cases</p>
                    <h3 className="medic-stat-value">{criticalCasesCount}</h3>
                    <span className="medic-stat-subtext">Need immediate attention</span>
                  </div>
                </div>
              </div>

              <div className="medic-dashboard-card medic-closed-history">
                <div className="medic-card-header">
                  <h3>Closed Case History</h3>
                  <span className="medic-history-count">{closedCases.length} total</span>
                </div>
                {closedCaseRecords.length ? (
                  <>
                    <div className="medic-closed-history-table-wrapper">
                      <table className="medic-closed-history-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Symptoms</th>
                            <th>Doctor</th>
                            <th>Balagruha</th>
                            <th>Closed On</th>
                            <th>Follow-ups</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedClosedCases.map((entry) => {
                            const doctorLabel =
                              entry.doctorName && entry.doctorName !== "-"
                                ? entry.doctorName
                                : "Pending";
                            return (
                              <tr key={entry.id}>
                                <td>
                                  <div className="medic-history-student">
                                    <div className="medic-history-avatar">{entry.initials}</div>
                                    <div>
                                      <p className="medic-history-name">{entry.studentName}</p>
                                      <span className="medic-history-pill">Closed</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <p className="medic-history-note" title={entry.symptomsSummary}>
                                    {entry.symptomsSummary}
                                  </p>
                                </td>
                                <td className="medic-history-doctor">{doctorLabel}</td>
                                <td>
                                  {entry.balagruhaName ? (
                                    <span className="medic-balagruha-tag">{entry.balagruhaName}</span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td>{formatCaseDate(entry.closedDate)}</td>
                                <td>
                                  <span className="medic-followup-pill">
                                    {entry.followUpCount || 0} follow-ups
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="medic-inline-button"
                                    onClick={() => handleOpenViewModal(entry.rawCheckin)}
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="medic-history-pagination">
                      <button
                        type="button"
                        className="medic-pagination-button"
                        onClick={() => setClosedCasesPage((prev) => Math.max(1, prev - 1))}
                        disabled={closedCasesPage === 1}
                      >
                        Previous
                      </button>
                      <span className="medic-pagination-info">
                        Page {closedCasesPage} of {totalClosedPages}
                      </span>
                      <button
                        type="button"
                        className="medic-pagination-button"
                        onClick={() =>
                          setClosedCasesPage((prev) =>
                            Math.min(totalClosedPages, prev + 1)
                          )
                        }
                        disabled={closedCasesPage === totalClosedPages}
                      >
                        Next
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="medic-empty-state">No closed medical cases yet.</p>
                )}
              </div>

              {/* <div className="medic-dashboard-grid">
                <div className="medic-dashboard-card medic-health-metrics">
                  <div className="medic-card-header">
                    <h3>Health Metrics Trend</h3>
                    <select>
                      <option>Last 7 Days</option>
                      <option>Last 30 Days</option>
                      <option>This Month</option>
                    </select>
                  </div>
                  <div className="medic-chart-placeholder">
                    <p>Health metrics chart will be displayed here</p>
                    <div className="medic-chart-grid"></div>
                  </div>
                </div>

                <div className="medic-dashboard-card medic-emergency-alerts">
                  <div className="medic-card-header">
                    <h3>Emergency Alerts</h3>
                    <button className="medic-action-button">View All</button>
                  </div>
                  <div className="medic-alert-list">
                    {emergencyAlerts.map((alert, index) => (
                      <div
                        className={`medic-alert-item ${alert.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                        key={index}
                      >
                        <div className="medic-alert-icon">🚨</div>
                        <div className="medic-alert-details">
                          <h4>{alert.studentName}</h4>
                          <p>{alert.issue}</p>
                          <div className="medic-alert-meta">
                            <span>{alert.timestamp}</span>
                            <span
                              className={`medic-tag medic-status-${alert.status
                                .toLowerCase()
                                .replace(" ", "-")}`}
                            >
                              {alert.status}
                            </span>
                          </div>
                        </div>
                        <div className="medic-alert-actions">
                          <button className="medic-icon-button">👁️</button>
                          <button className="medic-icon-button">✅</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div> */}

              <div className="medic-filters-row">
                {/* Balagruha Filter Navigation */}
                <div className="balagruha-filter-section">
                  <button className="bg-scroll-arrow" onClick={() => document.getElementById('bg-filter-container').scrollBy({ left: -200, behavior: 'smooth' })}>
                    ←
                  </button>
                  <div id="bg-filter-container" className="bg-filter-container">
                    <button
                      className={`bg-filter-btn ${selectedBalagruha === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedBalagruha('all')}
                    >
                      All BGs
                    </button>
                    {balagruhaData.map((bal) => (
                      <button
                        key={bal._id}
                        className={`bg-filter-btn ${selectedBalagruha === bal._id ? 'active' : ''}`}
                        onClick={() => setSelectedBalagruha(bal._id)}
                      >
                        {bal.name}
                      </button>
                    ))}
                  </div>
                  <button className="bg-scroll-arrow" onClick={() => document.getElementById('bg-filter-container').scrollBy({ left: 200, behavior: 'smooth' })}>
                    →
                  </button>
                </div>

                {/* Status Filter Badges */}
                <div className="status-filter-badges">
                  <button
                    className={`status-badge normal ${selectedStatusFilters.includes('normal') ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStatusFilters(prev =>
                        prev.includes('normal')
                          ? prev.filter(s => s !== 'normal')
                          : [...prev, 'normal']
                      );
                    }}
                  >
                    Normal
                  </button>
                  <button
                    className={`status-badge important ${selectedStatusFilters.includes('important') ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStatusFilters(prev =>
                        prev.includes('important')
                          ? prev.filter(s => s !== 'important')
                          : [...prev, 'important']
                      );
                    }}
                  >
                    Important
                  </button>
                  <button
                    className={`status-badge critical ${selectedStatusFilters.includes('critical') ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStatusFilters(prev =>
                        prev.includes('critical')
                          ? prev.filter(s => s !== 'critical')
                          : [...prev, 'critical']
                      );
                    }}
                  >
                    Critical
                  </button>
                </div>
              </div>

              <div className="medic-dashboard-card medic-recent-checkins">
                <div className="medic-card-header">
                  <h3>Recent Health Check-ins</h3>
                  {/* <button
                    className="medic-action-button"
                    onClick={handleOpenModal}
                  >
                    Record New Check-in
                  </button> */}
                </div>
                <div className="medic-checkins-table">
                  <table style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>SI NO</th>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Symptoms</th>
                        <th>Dr Visits</th>
                        <th>Follow-ups</th>
                      </tr>
                    </thead>
                    <tbody style={{ textAlign: "center" }}>
                      {recentHealthCheckins
                        .filter(c => {
                          // Filter by health status
                          if (!selectedStatusFilters.includes(c.healthStatus)) {
                            return false;
                          }
                          // Filter by balagruha
                          if (selectedBalagruha !== 'all' && c?.balagruhaIds[0] !== selectedBalagruha) {
                            return false;
                          }
                          return true;
                        })
                        .map((checkin, index) => {
                          const symptomSummary = getPrimarySymptom(checkin);
                          const doctorVisitSummary = getLatestDoctorVisitName(checkin);
                          const followUpSummary = getLatestFollowUpSummary(checkin);

                          const handleStudentClick = (e) => {
                            e.stopPropagation();
                            if (hoveredStudent && hoveredStudent._id === checkin._id) {
                              setHoveredStudent(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const verticalPos = getVerticalPosition(rect);
                              // Smart positioning: if too close to right edge, show on left
                              const spaceOnRight = window.innerWidth - rect.right;
                              const tooltipWidth = 450;
                              const x = spaceOnRight > tooltipWidth ? rect.right + 10 : rect.left - tooltipWidth - 10;
                              setTooltipPosition({ x, y: verticalPos.y, alignY: verticalPos.alignY });
                              setHoveredStudent(checkin);
                              setHoveredDoctorVisits(null);
                              setHoveredFollowUps(null);
                            }
                          };

                          // Handle click for doctor visits tooltip
                          const handleDoctorVisitsClick = (e) => {
                            e.stopPropagation();
                            if (hoveredDoctorVisits && hoveredDoctorVisits.id === checkin._id) {
                              setHoveredDoctorVisits(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // Position tooltip to the RIGHT of the column
                              setDoctorVisitsTooltipPosition({ x: rect.right + 10, y: rect.top });
                              const allDoctorVisits = getDoctorVisitsList(checkin);
                              setHoveredDoctorVisits({ id: checkin._id, data: allDoctorVisits });
                              setHoveredStudent(null);
                              setHoveredFollowUps(null);
                            }
                          };

                          // Handle click for follow-ups tooltip
                          const handleFollowUpsClick = (e) => {
                            e.stopPropagation();
                            if (hoveredFollowUps && hoveredFollowUps.id === checkin._id) {
                              setHoveredFollowUps(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // Position tooltip to the LEFT
                              setFollowUpsTooltipPosition({ x: rect.left - 380, y: rect.top });
                              const allFollowUps = getFollowUpsList(checkin);
                              setHoveredFollowUps({ id: checkin._id, data: allFollowUps });
                              setHoveredStudent(null);
                              setHoveredDoctorVisits(null);
                            }
                          };

                          return (
                            <tr
                              key={checkin._id}
                              className={checkin?.healthStatus?.toLowerCase()}
                            >
                              <td>{index + 1}</td>
                              <td
                                onClick={handleStudentClick}
                                style={{ cursor: 'pointer', fontWeight: 600, color: '#6366f1' }}
                              >
                                {checkin.userName}
                              </td>
                              <td>{new Date(checkin.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}</td>
                              <td>{symptomSummary}</td>
                              <td
                                className="truncate"
                                onClick={handleDoctorVisitsClick}
                                style={{ cursor: 'pointer', color: '#6366f1', fontWeight: 600 }}
                              >
                                {doctorVisitSummary}
                              </td>
                              <td
                                className="truncate"
                                onClick={handleFollowUpsClick}
                                style={{ cursor: 'pointer' }}
                              >
                                {followUpSummary}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {hoveredStudent && (
                    <StudentDetailsTooltip
                      checkIn={hoveredStudent}
                      position={tooltipPosition}
                    />
                  )}
                  {hoveredDoctorVisits && hoveredDoctorVisits.data && hoveredDoctorVisits.data.length > 0 && (
                    <DoctorVisitsTooltip
                      doctorVisits={hoveredDoctorVisits.data}
                      position={doctorVisitsTooltipPosition}
                    />
                  )}
                  {hoveredFollowUps && hoveredFollowUps.data && hoveredFollowUps.data.length > 0 && (
                    <FollowUpsTooltip
                      followUps={hoveredFollowUps.data}
                      position={followUpsTooltipPosition}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Health Check-ins Tab */}
          {activeTab === "checkins" && (
            <div className="medic-checkins-section">
              <div className="medic-section-header">
                <h2>Health Check-ins</h2>
                <DateRangeSelector
                  startDate={startDate}
                  endDate={endDate}
                  onDateRangeChange={handleDateRangeChange}
                />
                <div className="medic-search-filter">
                  <div className="medic-search-box">
                    <span className="medic-search-icon" aria-hidden="true">🔍</span>
                    <input type="text" placeholder="Search student..." onChange={(e) => setSearch(e.target.value)} aria-label="Search students by name" />
                  </div>
                  <select onChange={(e) => setMedicalStatus(e.target.value)} aria-label="Filter by medical status">
                    <option value={'all'}>All Statuses</option>
                    <option value={'normal'}>Normal</option>
                    <option value={'important'}>Important</option>
                    <option value={'critical'}>Critical</option>
                  </select>

                  <select
                    value={selectedBalagruha}
                    onChange={(e) => setSelectedBalagruha(e.target.value)}
                    aria-label="Filter by balagruha"
                  >
                    <option value="all">All Balagruhas</option>
                    {balagruhaData.map((bal) => (
                      <option key={bal._id} value={bal._id}>
                        {bal.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className="medic-action-button"
                    onClick={() => handleOpenModal()}
                  >
                    Record New Check-in
                  </button>
                </div>
              </div>
              <div className="medic-data-table">
                <table>
                  <thead>
                    <tr>
                      <th>SI NO</th>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Symptoms</th>
                      <th>Dr Visits</th>
                      <th>Follow-ups</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCheckIns.map((checkin, index) => {
                      // Format symptoms
                      const formatSymptoms = () => {
                        if (!checkin.symptoms || checkin.symptoms.length === 0) return '-';
                        const symptomLabels = {
                          cough_cold: 'Cough + Cold',
                          fever: 'Fever',
                          stomach_ache: 'Stomach ache',
                          headache: 'Headache',
                          injury: 'Injury',
                          other: 'Other'
                        };
                        const symptoms = checkin.symptoms
                          .filter(s => s)
                          .map(s => symptomLabels[s] || s)
                          .join(', ');
                        if (checkin.customSymptom) {
                          return `${symptoms} (${checkin.customSymptom})`;
                        }
                        return symptoms;
                      };

                      // Get latest doctor visit (NEW array format or OLD single format)
                      const getLatestDoctorVisit = () => {
                        if (checkin.doctorVisits && checkin.doctorVisits.length > 0) {
                          // Return the most recent doctor visit
                          const latest = checkin.doctorVisits[checkin.doctorVisits.length - 1];
                          return latest.doctorName || latest.hospitalName || '-';
                        } else if (checkin.doctorVisit?.doctorName) {
                          return checkin.doctorVisit.doctorName;
                        }
                        return '-';
                      };

                      // Get latest follow-up (NEW array format or OLD single format)
                      // Show doctor name instead of date
                      const getLatestFollowUp = () => {
                        if (checkin.followUps && checkin.followUps.length > 0) {
                          // Return the most recent follow-up doctor name
                          const latest = checkin.followUps[checkin.followUps.length - 1];
                          return latest.doctor || latest.hospital || '-';
                        } else if (checkin.followUp?.doctor) {
                          return checkin.followUp.doctor;
                        } else if (checkin.followUp?.hospital) {
                          return checkin.followUp.hospital;
                        }
                        return '-';
                      };

                      // Handle click for student name tooltip
                      const handleStudentClick = (e) => {
                        e.stopPropagation();
                        if (hoveredStudent && hoveredStudent._id === checkin._id) {
                          setHoveredStudent(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const verticalPos = getVerticalPosition(rect);
                          const spaceOnRight = window.innerWidth - rect.right;
                          const tooltipWidth = 450;
                          const x = spaceOnRight > tooltipWidth ? rect.right + 10 : rect.left - tooltipWidth - 10;
                          setTooltipPosition({ x, y: verticalPos.y, alignY: verticalPos.alignY });
                          setHoveredStudent(checkin);
                          setHoveredDoctorVisits(null);
                          setHoveredFollowUps(null);
                        }
                      };

                      // Handle click for doctor visits tooltip
                      const handleDoctorVisitsClick = (e) => {
                        e.stopPropagation();
                        if (hoveredDoctorVisits && hoveredDoctorVisits.id === checkin._id) {
                          setHoveredDoctorVisits(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const verticalPos = getVerticalPosition(rect);
                          setDoctorVisitsTooltipPosition({ x: rect.right + 10, y: verticalPos.y, alignY: verticalPos.alignY });
                          // Get all doctor visits (NEW array or OLD single format)
                          const allDoctorVisits = checkin.doctorVisits && checkin.doctorVisits.length > 0
                            ? checkin.doctorVisits
                            : checkin.doctorVisit && checkin.doctorVisit.doctorName
                              ? [checkin.doctorVisit]
                              : [];
                          setHoveredDoctorVisits({ id: checkin._id, data: allDoctorVisits });
                          setHoveredStudent(null);
                          setHoveredFollowUps(null);
                        }
                      };

                      // Handle click for follow-ups tooltip
                      const handleFollowUpsClick = (e) => {
                        e.stopPropagation();
                        if (hoveredFollowUps && hoveredFollowUps.id === checkin._id) {
                          setHoveredFollowUps(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const verticalPos = getVerticalPosition(rect);
                          // Position tooltip to the LEFT of the column
                          setFollowUpsTooltipPosition({ x: rect.left - 380, y: verticalPos.y, alignY: verticalPos.alignY });
                          // Get all follow-ups (NEW array or OLD single format)
                          const allFollowUps = checkin.followUps && checkin.followUps.length > 0
                            ? checkin.followUps
                            : checkin.followUp && checkin.followUp.followUpDate
                              ? [checkin.followUp]
                              : [];
                          setHoveredFollowUps({ id: checkin._id, data: allFollowUps });
                          setHoveredStudent(null);
                          setHoveredDoctorVisits(null);
                        }
                      };

                      return (
                        <tr key={checkin._id}>
                          <td style={{ textAlign: 'center' }}>
                            {(checkInsPage - 1) * CHECKINS_PER_PAGE + index + 1}
                          </td>
                          <td
                            className="student-name"
                            onClick={handleStudentClick}
                            style={{ cursor: 'pointer' }}
                          >
                            {checkin.userName}
                          </td>
                          <td>
                            {new Date(checkin.date).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </td>
                          <td className="truncate">{formatSymptoms()}</td>
                          <td
                            className="truncate"
                            onClick={handleDoctorVisitsClick}
                            style={{ cursor: 'pointer', color: '#6366f1', fontWeight: 600 }}
                          >
                            {getLatestDoctorVisit()}
                          </td>
                          <td
                            className="truncate"
                            onClick={handleFollowUpsClick}
                            style={{ cursor: 'pointer' }}
                          >
                            {getLatestFollowUp()}
                          </td>
                          <td>
                            <button
                              className="medic-icon-button"
                              onClick={() => handleOpenViewModal(checkin)}
                              title="View Details"
                            >
                              👁️
                            </button>
                            <button
                              className="medic-icon-button"
                              onClick={() => handleOpenModal(checkin, true)}
                              title="Edit Check-in"
                            >
                              📝
                            </button>
                            <button
                              className="medic-icon-button"
                              onClick={() => handleDeleteCheckIn(checkin._id)}
                              title="Delete Check-in"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filterMedicalCheckInData.length > CHECKINS_PER_PAGE && (
                  <div className="medic-history-pagination">
                    <button
                      type="button"
                      className="medic-pagination-button"
                      onClick={() => setCheckInsPage((prev) => Math.max(1, prev - 1))}
                      disabled={checkInsPage === 1}
                    >
                      Previous
                    </button>

                    <span className="medic-pagination-info">
                      Page {checkInsPage} of {totalCheckInsPages}
                    </span>

                    <button
                      type="button"
                      className="medic-pagination-button"
                      onClick={() =>
                        setCheckInsPage((prev) => Math.min(totalCheckInsPages, prev + 1))
                      }
                      disabled={checkInsPage === totalCheckInsPages}
                    >
                      Next
                    </button>
                  </div>
                )}
                {hoveredStudent && (
                  <StudentDetailsTooltip checkIn={hoveredStudent} position={tooltipPosition} />
                )}
                {hoveredDoctorVisits && hoveredDoctorVisits.data && hoveredDoctorVisits.data.length > 0 && (
                  <DoctorVisitsTooltip
                    doctorVisits={hoveredDoctorVisits.data}
                    position={doctorVisitsTooltipPosition}
                  />
                )}
                {hoveredFollowUps && hoveredFollowUps.data && hoveredFollowUps.data.length > 0 && (
                  <FollowUpsTooltip
                    followUps={hoveredFollowUps.data}
                    position={followUpsTooltipPosition}
                  />
                )}
              </div>
              {/* <div className="medic-checkin-details-panel">
                <h3>Health Check-in Details</h3>
                <p>Select a check-in record to view or edit details.</p>
                <div className="medic-checkin-form">
                  <div className="medic-form-row">
                    <div className="medic-form-group">
                      <label>Student</label>
                      <select>
                        <option>Select Student</option>
                        <option>John Doe</option>
                        <option>Jane Smith</option>
                      </select>
                    </div>
                    <div className="medic-form-group">
                      <label>Date & Time</label>
                      <input type="datetime-local" />
                    </div>
                  </div>
                  <div className="medic-form-row">
                    <div className="medic-form-group">
                      <label>Temperature (°C)</label>
                      <input type="number" step="0.1" />
                    </div>
                    <div className="medic-form-group">
                      <label>Mood</label>
                      <select>
                        <option>Select Mood</option>
                        <option>Happy</option>
                        <option>Neutral</option>
                        <option>Sad</option>
                      </select>
                    </div>
                  </div>
                  <div className="medic-form-group">
                    <label>Health Observations</label>
                    <textarea
                      rows="3"
                      placeholder="Enter health observations here..."
                    ></textarea>
                  </div>

                  <div className="medic-form-group">
                    <label>Upload Images (Max 5MB each)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                    <div className="uploaded-files">
                      {uploadedImages.map((file, index) => (
                        <div key={index} className="uploaded-item">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Uploaded"
                            width="50"
                            height="50"
                          />
                          <button onClick={() => handleRemoveImage(index)}>
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="medic-form-group">
                    <label>Upload PDFs (Max 10MB each)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handlePdfUpload}
                    />
                    <div className="uploaded-files">
                      {uploadedPdfs.map((file, index) => (
                        <div key={index} className="uploaded-item">
                          <span>{file.name}</span>
                          <button onClick={() => handleRemovePdf(index)}>
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="medic-form-actions">
                    <button className="medic-action-button">
                      Save Changes
                    </button>
                    <button className="medic-action-button secondary">
                      Add Medical Note
                    </button>
                  </div>
                </div>
              </div> */}
              {/* ); */}
            </div>
          )}

          {activeTab === "tasks" && <TaskManagement />}

          {/* Students Tab */}
          {activeTab === "students" && (
            // <div className="medic-students-section">
            //   <div className="medic-section-header">
            //     <h2>Student Health Records</h2>
            //     <div className="medic-search-filter">
            //       <input type="text" placeholder="Search student..." />
            //       {/* <select>
            //                             <option>All Classes</option>
            //                             <option>6A</option>
            //                             <option>6B</option>
            //                             <option>7A</option>
            //                             <option>8C</option>
            //                         </select> */}
            //       <select>
            //         <option>All Health Statuses</option>
            //         <option>Normal</option>
            //         <option>Warning</option>
            //         <option>Alert</option>
            //       </select>
            //     </div>
            //   </div>

            //   <div className="medic-data-table">
            //     <table>
            //       <thead>
            //         <tr>
            //           <th>Student ID</th>
            //           <th>Name</th>
            //           <th>Age</th>
            //           <th>Last Check-in</th>
            //           <th>Health Status</th>
            //           <th>Actions</th>
            //         </tr>
            //       </thead>
            //       <tbody>
            //         {studentList.map((student) => (
            //           <tr key={student.id}>
            //             <td>{student.id}</td>
            //             <td>{student.name}</td>
            //             <td>{student.age}</td>
            //             <td>{student.lastCheckIn}</td>
            //             <td>
            //               <span
            //                 className={`medic-tag medic-status-${student.healthStatus.toLowerCase()}`}
            //               >
            //                 {student.healthStatus}
            //               </span>
            //             </td>
            //             <td>
            //               {/* <button className="medic-icon-button">🩺</button>
            //                                         <button className="medic-icon-button">📊</button> */}
            //               <button
            //                 className="medic-icon-button"
            //                 onClick={() => handleOpenUpdateModal(student)}
            //               >
            //                 ✏️
            //               </button>
            //             </td>
            //           </tr>
            //         ))}
            //       </tbody>
            //     </table>
            //   </div>

            //   {/* Update Modal */}
            //   {isUpdateModalOpen && (
            //     <div className="modal-overlay">
            //       <div className="modal-content">
            //         <div className="modal-header">
            //           <h3>Update Student Record</h3>
            //           <button
            //             className="close-button"
            //             onClick={handleCloseUpdateModal}
            //           >
            //             &times;
            //           </button>
            //         </div>
            //         <form onSubmit={handleUpdateSubmit}>
            //           <div className="form-group">
            //             <label>Student ID</label>
            //             <input
            //               type="text"
            //               value={selectedStudent?.id || ""}
            //               readOnly
            //             />
            //           </div>
            //           <div className="form-group">
            //             <label>Name</label>
            //             <input
            //               type="text"
            //               value={selectedStudent?.name || ""}
            //               readOnly
            //             />
            //           </div>
            //           <div className="form-group">
            //             <label>Age</label>
            //             <input
            //               type="number"
            //               value={selectedStudent?.age || ""}
            //               readOnly
            //             />
            //           </div>
            //           <div className="form-group">
            //             <label>Last Check-in</label>
            //             <input
            //               type="text"
            //               value={selectedStudent?.lastCheckIn || ""}
            //               readOnly
            //             />
            //           </div>
            //           <div className="form-group">
            //             <label>Health Status</label>
            //             <select
            //               value={selectedStudent?.healthStatus || ""}
            //               onChange={(e) =>
            //                 setSelectedStudent((prev) => ({
            //                   ...prev,
            //                   healthStatus: e.target.value,
            //                 }))
            //               }
            //             >
            //               <option value="Normal">Normal</option>
            //               <option value="Warning">Warning</option>
            //               <option value="Alert">Alert</option>
            //             </select>
            //           </div>
            //           <div className="form-group">
            //             <label>Upload Files</label>
            //             <input
            //               type="file"
            //               multiple
            //               onChange={handleFileUpload}
            //             />
            //             <div className="uploaded-files">
            //               {uploadedFiles.map((file, index) => (
            //                 <div key={index} className="uploaded-item">
            //                   <span>{file.name}</span>
            //                   <button
            //                     type="button"
            //                     onClick={() => handleRemoveFile(index)}
            //                   >
            //                     ❌
            //                   </button>
            //                 </div>
            //               ))}
            //             </div>
            //           </div>
            //           <div className="modal-footer">
            //             <button
            //               type="button"
            //               className="cancel-button"
            //               onClick={handleCloseUpdateModal}
            //             >
            //               Cancel
            //             </button>
            //             <button type="submit" className="submit-button">
            //               Update
            //             </button>
            //           </div>
            //         </form>
            //       </div>
            //     </div>
            //   )}
            // </div>
            <UserManagement />
          )}

          {/* Health Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="medic-alerts-section">
              <div className="medic-section-header">
                <h2>Health Alerts</h2>
                <div className="medic-alert-tabs">
                  <button className="medic-tab-button active">
                    Emergency (2)
                  </button>
                  <button className="medic-tab-button">Warnings (3)</button>
                  <button className="medic-tab-button">Resolved (5)</button>
                </div>
              </div>

              <div className="medic-alerts-list">
                {emergencyAlerts.map((alert, index) => (
                  <div
                    className={`medic-alert-card ${alert?.status?.toLowerCase()
                      .replace(" ", "-")}`}
                    key={index}
                  >
                    <div className="medic-alert-header">
                      <div className="medic-alert-type">
                        <span className="medic-alert-icon">🚨</span>
                        <span>Emergency Alert</span>
                      </div>
                      <span
                        className={`medic-tag medic-status-${alert?.status?.toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {alert.status}
                      </span>
                    </div>
                    <div className="medic-alert-body">
                      <h4>{alert.studentName}</h4>
                      <p className="medic-alert-issue">{alert.issue}</p>
                      <p className="medic-alert-time">{alert.timestamp}</p>
                    </div>
                    <div className="medic-alert-footer">
                      <button className="medic-action-button">
                        View Details
                      </button>
                      <button className="medic-action-button secondary">
                        Mark as Resolved
                      </button>
                      <button className="medic-action-button warning">
                        Escalate to Admin
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="medic-alert-settings">
                <h3>Alert Configuration</h3>
                <div className="medic-settings-form">
                  <div className="medic-form-row">
                    <div className="medic-form-group">
                      <label>Temperature Alert Threshold (°C)</label>
                      <div className="medic-threshold-inputs">
                        <div className="medic-threshold-group">
                          <span className="medic-threshold-label warning">
                            Warning
                          </span>
                          <input type="number" value="37.5" step="0.1" />
                        </div>
                        <div className="medic-threshold-group">
                          <span className="medic-threshold-label alert">
                            Alert
                          </span>
                          <input type="number" value="38.0" step="0.1" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="medic-form-row">
                    <div className="medic-form-group">
                      <label>Mood Score Alert Threshold (1-5)</label>
                      <div className="medic-threshold-inputs">
                        <div className="medic-threshold-group">
                          <span className="medic-threshold-label warning">
                            Warning
                          </span>
                          <input type="number" value="2" min="1" max="5" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="medic-form-group">
                    <label>Notification Methods</label>
                    <div className="medic-checkbox-group">
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Push Notifications
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Email
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> SMS (Emergency Only)
                      </label>
                    </div>
                  </div>
                  <div className="medic-form-actions">
                    <button className="medic-action-button">
                      Save Settings
                    </button>
                    <button className="medic-action-button secondary">
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Health Reports Tab */}
          {activeTab === "reports" && (
            <div className="medic-reports-section">
              <h2>Health Reports</h2>

              <div className="medic-report-filters">
                <div className="medic-filter-group">
                  <label>Report Type:</label>
                  <select>
                    <option>Temperature Trends</option>
                    <option>Mood Assessment</option>
                    <option>Health Status Summary</option>
                    <option>Alert History</option>
                  </select>
                </div>
                {/* <div className="medic-filter-group">
                                    <label>Student Group:</label>
                                    <select>
                                        <option>All Students</option>
                                        <option> 6A</option>
                                        <option>Class 6B</option>
                                        <option>Class 7A</option>
                                        <option>Class 8C</option>
                                    </select>
                                </div> */}
                <div className="medic-filter-group">
                  <label>Date Range:</label>
                  <select>
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>Last 30 Days</option>
                    <option>Custom Range</option>
                  </select>
                </div>
                <button className="medic-action-button">Generate Report</button>
              </div>

              <div className="medic-report-preview">
                <div className="medic-report-chart">
                  <div className="medic-placeholder-chart">
                    <p>Report Visualization Will Appear Here</p>
                    <div className="medic-chart-placeholder"></div>
                  </div>
                </div>

                <div className="medic-report-summary">
                  <h3>Report Summary</h3>
                  <ul>
                    <li>Total Students: 24</li>
                    <li>Average Temperature: 36.8°C</li>
                    <li>Average Mood Score: 3.9/5</li>
                    <li>Health Alerts: 5</li>
                  </ul>
                  <div className="medic-form-actions">
                    <button className="medic-action-button">
                      Export Report (PDF)
                    </button>
                    <button className="medic-action-button secondary">
                      Export Data (CSV)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="medic-settings-section">
              <h2>System Settings</h2>

              <div className="medic-settings-card">
                <h3>Health Check-in Configuration</h3>
                <div className="medic-settings-form">
                  <div className="medic-form-group">
                    <label>Check-in Reminder Frequency</label>
                    <select>
                      <option>Daily (Morning)</option>
                      <option>Daily (Morning & Afternoon)</option>
                      <option>Custom Schedule</option>
                    </select>
                  </div>
                  <div className="medic-form-group">
                    <label>Required Health Metrics</label>
                    <div className="medic-checkbox-group">
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Temperature
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Mood Assessment
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Health Observations
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" /> Medication Tracking
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="medic-settings-card">
                <h3>Notification Preferences</h3>
                <div className="medic-settings-form">
                  <div className="medic-form-group">
                    <label>Emergency Alert Notifications</label>
                    <div className="medic-checkbox-group">
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Push Notifications
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Email
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> SMS
                      </label>
                    </div>
                  </div>
                  <div className="medic-form-group">
                    <label>Warning Alert Notifications</label>
                    <div className="medic-checkbox-group">
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Push Notifications
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Email
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" /> SMS
                      </label>
                    </div>
                  </div>
                  <div className="medic-form-group">
                    <label>Daily Report Delivery</label>
                    <select>
                      <option>End of Day (5:00 PM)</option>
                      <option>Morning (8:00 AM)</option>
                      <option>No Automatic Delivery</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="medic-settings-card">
                <h3>System Integration</h3>
                <div className="medic-settings-form">
                  <div className="medic-form-group">
                    <label>Data Sharing with Other Roles</label>
                    <div className="medic-checkbox-group">
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Share with Admin
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" checked /> Share with Sports
                        Coach
                      </label>
                      <label className="medic-checkbox-label">
                        <input type="checkbox" /> Share with Academic Teachers
                      </label>
                    </div>
                  </div>
                  <div className="medic-form-actions">
                    <button className="medic-action-button">
                      Save All Settings
                    </button>
                    <button className="medic-action-button secondary">
                      Reset to Defaults
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <CheckInModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSubmit={handleSubmitCheckIn}
            studentData={editData}
            balagruhas={balagruhaData}
            editMode={editMode}
          />
          <ViewCheckInModal
            isOpen={isViewModalOpen}
            onClose={handleCloseViewModal}
            checkInData={viewData}
            onEdit={handleEditFromView}
          />
        </div>
      </div>
    </div>
  );
};

export default MedicInchargeDashboard;
