import React, { useEffect, useRef, useState } from "react";
import "./AdminDashboard.css";
import {
  getBalagruha,
  getTasks,
  updateTask,
  fetchUsers,
  getStudentListforAttendance,
  getMachines,
  getTaskBytaskId,
  getAnyUserBasedonRoleandBalagruha,
  getMedicalConditionBasedOnBalagruha,
  getMoodBasedOnBalagruha,
  getBalagruhaListbyUserID,
  getBalagruhaListByAssignedID,
  getSchedules,
  getCoachSuggestions,
  api,
} from "../../api";
import { TaskDetailsModal } from "../TaskManagement/taskmanagement";
import WeeklyCalendar from "./WeeklyCalendar";

const CoachName = ({ name }) => {
  const wrapperRef = useRef(null);
  const textRef = useRef(null);
  const [isLong, setIsLong] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (wrapperRef.current && textRef.current) {
        setIsLong(
          textRef.current.scrollWidth > wrapperRef.current.clientWidth
        );
      }
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(checkOverflow);

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [name]);

  return (
    <span ref={wrapperRef} className="coach-name-wrapper">
      <span
        ref={textRef}
        className={`coach-name-text ${isLong ? "coach-name-marquee" : ""
          }`}
      >
        {name}
      </span>
    </span>
  );
};

function AdminDashboard() {
  // Initialize with pre-selected values
  const [selectedBalagruha, setSelectedBalagruha] = useState();
  const [selectedBalagruhaOfCoach, setSelectedBalagruhaOfCoach] = useState();
  const [selectedCoach, setSelectedCoach] = useState();
  const [adminMenuSelected, setAdminMenuSelected] = useState(1);
  const [coachMenuSelected, setCoachMenuSelected] = useState(1);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [balagruhas, setBalagruhas] = useState([]);
  const [balagruhaOfCoach, setBalagruhaOfCoach] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [balagruhaStudents, setBalagruhaStudents] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [medicalIssuesData, setMedicalIssuesData] = useState();
  const [studentUserId, setStudentUserId] = useState([]);
  const [moodData, setMoodData] = useState();

  // New state variables for task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [coachTasks, setCoachTasks] = useState([]);
  const [coachMedicalData, setCoachMedicalData] = useState([]);
  const [coachAssignments, setCoachAssignments] = useState([]);
  const [coachSlowLearners, setCoachSlowLearners] = useState([]);
  const [coachShopData, setCoachShopData] = useState([]);
  const [coachSuggestions, setCoachSuggestions] = useState([]);
  const [isLoadingCoachData, setIsLoadingCoachData] = useState(false);
  const [machines, setMachines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const selectedCoachRef = useRef();
  const isCurrentCoach = (coachId) => selectedCoachRef.current === coachId;
  // const [schedules, setSchedules] = useState({
  //     balagruhaId: '',
  //     assignedTo: '',
  //     startDate: '',
  //     endDate: '',
  //     status: []
  // });

  const getBalagruhaList = async () => {
    try {
      const response = await getBalagruha(JSON.stringify());

      setBalagruhas(response?.data?.balagruhas || []);
    } catch (error) {
      console.error("Error fetching balagruha list:", error);
    }
  };

  const scrollRef = useRef(null);

  const scrollMenu = (direction) => {
    const scrollAmount = 200;
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getCoachNameBasedonBalagruha = async () => {
    if (!selectedBalagruha) return;
    const response = await getAnyUserBasedonRoleandBalagruha(
      "coach",
      selectedBalagruha
    );
    setCoaches(response.data?.users || []);
  };

  const getMachinesData = async () => {
    const response = await getMachines();

    setMachines(response.data.machines);
  };

  const getTasksList = async () => {
    let data = {
      balagruhaId: selectedBalagruha,
    };
    try {
      const response = await getTasks(JSON.stringify(data));

      setTasks(response?.data?.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const getUsersList = async () => {
    try {
      const response = await fetchUsers();


      const userList = response?.data || [];
      setUsers(userList);

      const studentUsers = userList.filter(
        (user) => user.role === "student"
      );
      setStudents(studentUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const getStudentListBasedonDate = async (id) => {
    try {
      const response = await getStudentListforAttendance(id, new Date());
      setAttendance(response?.data?.studentList || []);

      // Set students for the selected balagruha
      const balagruhaStudentsList = response?.data?.studentList || [];
      setBalagruhaStudents(balagruhaStudentsList);
      setStudentSearchQuery("");
      setShowStudentDropdown(true);
    } catch (error) {
      console.error("Error fetching student list:", error);
    }
  };

  const getCurrentWeekDateRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      startDate: monday.toISOString().slice(0, 10),
      endDate: sunday.toISOString().slice(0, 10),
    };
  };

  const getIdValue = (value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    return value._id || value.id || null;
  };

  const getCoachBalagruhaIds = (coachId) => {
    const coach = coaches.find((item) => item._id === coachId);
    const ids = (coach?.balagruhaIds || [])
      .map(getIdValue)
      .filter(Boolean);

    if (ids.length === 0 && selectedBalagruha) {
      ids.push(selectedBalagruha);
    }

    return Array.from(new Set(ids));
  };

  const getBalagruhasFromIds = (ids) => {
    return ids.map((id) => {
      const matchedBalagruha = balagruhas.find((bal) => bal._id === id);
      return matchedBalagruha || { _id: id, name: "Assigned Balagruha" };
    });
  };

  const fetchBalagruhaByCoach = async (id) => {
    const fallbackBalagruhas = getBalagruhasFromIds(getCoachBalagruhaIds(id));

    try {
      const response = await getBalagruhaListByAssignedID(id);
      const assignedBalagruhas = response?.data?.balagruhas || [];
      const usableBalagruhas =
        assignedBalagruhas.length > 0 ? assignedBalagruhas : fallbackBalagruhas;
      if (isCurrentCoach(id)) {
        setBalagruhaOfCoach(usableBalagruhas);
      }
      return usableBalagruhas;
    } catch (error) {
      console.error("Error in fetching balagruha based on user", error);
      if (isCurrentCoach(id)) {
        setBalagruhaOfCoach(fallbackBalagruhas);
      }
      return fallbackBalagruhas;
    }
  };

  const fetchSchedules = async (
    balagruha,
    startDate,
    endDate,
    coachId = selectedCoach
  ) => {
    const explicitIds = Array.isArray(balagruha)
      ? balagruha
      : balagruha
        ? [balagruha]
        : selectedBalagruhaOfCoach
          ? [selectedBalagruhaOfCoach]
          : [];
    const fallbackIds = getCoachBalagruhaIds(coachId);
    const balagruhaIds = explicitIds.length > 0 ? explicitIds : fallbackIds;

    if (!coachId || balagruhaIds.length === 0) {
      setSchedules([]);
      return;
    }

    try {
      const response = await getSchedules({
        balagruhaIds,
        assignedTo: coachId,
        startDate,
        endDate,
        status: [],
      });
      if (isCurrentCoach(coachId)) {
        setSchedules(response?.data?.schedules || []);
      }
    } catch (error) {
      console.error("Error in fetching schedules", error);
      setSchedules([]);
    }
  };

  const fetchCoachTasks = async (coachId, balagruhaId) => {
    if (!coachId || !balagruhaId) {
      setCoachTasks([]);
      return;
    }

    try {
      const [assignedResponse, createdResponse] = await Promise.all([
        getTasks({
          balagruhaId,
          assignedFor: [coachId],
          type: ["sports", "music", "general", "purchase", "order", "medical"],
          limit: 100,
        }),
        getTasks({
          balagruhaId,
          createdBy: [coachId],
          type: ["sports", "music", "general", "purchase", "order", "medical"],
          limit: 100,
        }),
      ]);

      const combinedTasks = [
        ...(assignedResponse?.data?.tasks || []),
        ...(createdResponse?.data?.tasks || []),
      ];
      const uniqueTasks = Array.from(
        new Map(combinedTasks.map((task) => [task._id || task.id, task])).values()
      );

      if (isCurrentCoach(coachId)) {
        setCoachTasks(uniqueTasks);
      }
    } catch (error) {
      console.error("Error fetching coach tasks", error);
      setCoachTasks([]);
    }
  };
  const getActiveCoachBalagruhaIds = (
    coachId = selectedCoach,
    explicitBalagruhaIds = []
  ) => {
    if (explicitBalagruhaIds.length > 0) {
      return Array.from(new Set(explicitBalagruhaIds));
    }

    const selectedIds = selectedBalagruha
      ? [selectedBalagruha]
      : selectedBalagruhaOfCoach
        ? [selectedBalagruhaOfCoach]
        : [];

    const assignedIds = balagruhaOfCoach
      .map((item) => item?._id)
      .filter(Boolean);

    const fallbackIds = getCoachBalagruhaIds(coachId);

    const ids =
      selectedIds.length > 0
        ? selectedIds
        : assignedIds.length > 0
          ? assignedIds
          : fallbackIds;

    return Array.from(new Set(ids));
  };

  const fetchCoachMedicalData = async (
    coachId = selectedCoach,
    explicitBalagruhaIds = []
  ) => {
    const balagruhaIds = getActiveCoachBalagruhaIds(
      coachId,
      explicitBalagruhaIds
    );

    if (!coachId || balagruhaIds.length === 0) {
      if (isCurrentCoach(coachId)) {
        setCoachMedicalData([]);
      }
      return;
    }

    try {
      const response = await getMedicalConditionBasedOnBalagruha({
        balagruhaIds,
      });

      const medicalCheckIns =
        response?.data?.medicalCheckIns ||
        response?.data?.data?.medicalCheckIns ||
        response?.medicalCheckIns ||
        [];

      if (isCurrentCoach(coachId)) {
        setCoachMedicalData(
          Array.isArray(medicalCheckIns) ? medicalCheckIns : []
        );
      }
    } catch (error) {
      console.error("Error fetching selected coach medical data", error);
      if (isCurrentCoach(coachId)) {
        setCoachMedicalData([]);
      }
    }
  };


  const fetchCoachAssignments = async (coachId = selectedCoach) => {
    if (!coachId) {
      if (isCurrentCoach(coachId)) {
        setCoachAssignments([]);
      }
      return;
    }

    try {
      const response = await api.get(`/api/v2/lms/coach/${coachId}/assignments`);
      const assignments = response?.data?.data?.assignments || response?.data?.assignments || [];
      const activeBalagruhaIds = new Set(getActiveCoachBalagruhaIds(coachId));
      const scopedAssignments = Array.isArray(assignments)
        ? assignments.filter((assignment) => {
            if (activeBalagruhaIds.size === 0) return true;
            const assignmentBalagruhaIds = [
              getId(assignment?.assignedTo?.balagruhaId),
              ...(assignment?.assignedTo?.balagruhaIds || []).map((balagruha) => getId(balagruha)),
            ].filter(Boolean);
            return assignmentBalagruhaIds.length === 0 || assignmentBalagruhaIds.some((id) => activeBalagruhaIds.has(id));
          })
        : [];
      if (isCurrentCoach(coachId)) {
        setCoachAssignments(scopedAssignments);
      }
    } catch (error) {
      console.error("Error fetching selected coach syllabus data", error);
      if (isCurrentCoach(coachId)) {
        setCoachAssignments([]);
      }
    }
  };

  const fetchCoachSlowLearners = async (coachId = selectedCoach) => {
    if (!coachId) {
      if (isCurrentCoach(coachId)) {
        setCoachSlowLearners([]);
      }
      return;
    }

    try {
      const response = await api.get(`/api/v2/lms/coach/reports/slow-learners?coachId=${coachId}`);
      const slowLearners = response?.data?.slowLearners || response?.data?.data?.slowLearners || [];
      if (isCurrentCoach(coachId)) {
        setCoachSlowLearners(Array.isArray(slowLearners) ? slowLearners : []);
      }
    } catch (error) {
      console.error("Error fetching selected coach slow learners", error);
      if (isCurrentCoach(coachId)) {
        setCoachSlowLearners([]);
      }
    }
  };

  const fetchCoachShopData = async (
    coachId = selectedCoach,
    explicitBalagruhaIds = []
  ) => {
    const balagruhaIds = getActiveCoachBalagruhaIds(
      coachId,
      explicitBalagruhaIds
    );

    if (!coachId || balagruhaIds.length === 0) {
      if (isCurrentCoach(coachId)) {
        setCoachShopData([]);
      }
      return;
    }

    try {
      const queryParams = new URLSearchParams();

      queryParams.set("limit", "100");
      queryParams.set("status", "all");
      queryParams.set("coachId", coachId);

      if (balagruhaIds.length === 1) {
        queryParams.set("balagruhaId", balagruhaIds[0]);
      }

      const response = await api.get(
        `/api/v2/shop/coach/deliveries?${queryParams.toString()}`
      );

      const shopOrders = response?.data?.orders || [];

      if (isCurrentCoach(coachId)) {
        setCoachShopData(Array.isArray(shopOrders) ? shopOrders : []);
      }
    } catch (error) {
      console.error("Error fetching selected coach shop data", error);
      if (isCurrentCoach(coachId)) {
        setCoachShopData([]);
      }
    }
  };

  const fetchCoachSuggestions = async (coachId = selectedCoach) => {
    if (!coachId) {
      if (isCurrentCoach(coachId)) {
        setCoachSuggestions([]);
      }
      return;
    }

    try {
      const response = await getCoachSuggestions({ coachId, page: 1, limit: 50 });
      const suggestions = response?.data || [];
      if (isCurrentCoach(coachId)) {
        setCoachSuggestions(Array.isArray(suggestions) ? suggestions : []);
      }
    } catch (error) {
      console.error("Error fetching selected coach suggestions", error);
      if (isCurrentCoach(coachId)) {
        setCoachSuggestions([]);
      }
    }
  };

  const fetchSelectedCoachSectionData = async (
    menuId = coachMenuSelected,
    coachId = selectedCoach
  ) => {
    if (!coachId) return;

    const assignedBalagruhas = await fetchBalagruhaByCoach(coachId);

    const balagruhaIds = assignedBalagruhas
      .map((item) => item?._id)
      .filter(Boolean);

    const activeBalagruhaIds = getActiveCoachBalagruhaIds(
      coachId,
      selectedBalagruha && balagruhaIds.includes(selectedBalagruha)
        ? [selectedBalagruha]
        : balagruhaIds
    );

    if (menuId === 3) {
      await fetchCoachMedicalData(coachId, activeBalagruhaIds);
    } else if (menuId === 4) {
      await fetchCoachAssignments(coachId);
    } else if (menuId === 5) {
      await fetchCoachSlowLearners(coachId);
    } else if (menuId === 6) {
      await fetchCoachShopData(coachId, activeBalagruhaIds);
    } else if (menuId === 7) {
      await fetchCoachSuggestions(coachId);
    }
  };


  const clearCoachSelection = () => {
    selectedCoachRef.current = undefined;
    setSelectedCoach(undefined);
    setCoachMenuSelected(1);
    setCurrentWeekOffset(0);
    setSelectedBalagruhaOfCoach(undefined);
    setBalagruhaOfCoach([]);
    setSchedules([]);
    setCoachTasks([]);
    setCoachMedicalData([]);
    setCoachAssignments([]);
    setCoachSlowLearners([]);
    setCoachShopData([]);
    setCoachSuggestions([]);
    setIsLoadingCoachData(false);
  };
  const handleCoachSelect = async (coachId) => {
    selectedCoachRef.current = coachId;
    setSelectedCoach(coachId);
    setCoachMenuSelected(1);
    setCurrentWeekOffset(0);
    setSelectedBalagruhaOfCoach(undefined);
    setBalagruhaOfCoach([]);
    setSchedules([]);
    setCoachTasks([]);
    setCoachMedicalData([]);
    setCoachAssignments([]);
    setCoachSlowLearners([]);
    setCoachShopData([]);
    setCoachSuggestions([]);
    setIsLoadingCoachData(true);

    try {
      const assignedBalagruhas = await fetchBalagruhaByCoach(coachId);
      const assignedBalagruhaIds = assignedBalagruhas
        .map((item) => item?._id)
        .filter(Boolean);
      const selectedBalagruhaInScope =
        selectedBalagruha && assignedBalagruhaIds.includes(selectedBalagruha)
          ? [selectedBalagruha]
          : [];
      const queryBalagruhaIds =
        selectedBalagruhaInScope.length > 0
          ? selectedBalagruhaInScope
          : assignedBalagruhaIds.length > 0
            ? assignedBalagruhaIds
            : getCoachBalagruhaIds(coachId);

      if (!isCurrentCoach(coachId)) return;

      if (queryBalagruhaIds.length > 0) {
        const { startDate, endDate } = getCurrentWeekDateRange();
        const selectedBalagruhaId = queryBalagruhaIds[0];
        setSelectedBalagruhaOfCoach(selectedBalagruhaId);
        await Promise.all([
          fetchSchedules(
            queryBalagruhaIds,
            startDate,
            endDate,
            coachId
          ),

          fetchCoachTasks(
            coachId,
            selectedBalagruhaId
          ),

          fetchCoachMedicalData(
            coachId,
            queryBalagruhaIds
          ),


          fetchCoachAssignments(coachId),

          fetchCoachSlowLearners(coachId),

          fetchCoachShopData(
            coachId,
            queryBalagruhaIds
          ),

          fetchCoachSuggestions(coachId),
        ]);
      } else if (isCurrentCoach(coachId)) {
        setCoachTasks([]);
      }
    } finally {
      if (isCurrentCoach(coachId)) {
        setIsLoadingCoachData(false);
      }
    }
  };

  useEffect(() => {
    selectedCoachRef.current = selectedCoach;
  }, [selectedCoach]);

  useEffect(() => {
    getBalagruhaList();
    getTasksList();
    getUsersList();
    getMachinesData();
    getCoachNameBasedonBalagruha();
  }, [selectedBalagruha]);

  useEffect(() => {
    if (!selectedCoach || isLoadingCoachData) return;

    fetchSelectedCoachSectionData(coachMenuSelected, selectedCoach);
  }, [coachMenuSelected]);

  // Handle student checkbox change
  // const handleStudentCheckboxChange = async (studentId, userId) => {
  //     setSelectedStudents(prevSelected => {
  //         if (prevSelected?.includes(studentId)) {
  //             return prevSelected.filter(id => id !== studentId);
  //         } else {
  //             return [...prevSelected, studentId];
  //         }
  //     });

  //     setStudentUserId(prevSelected => {
  //         if (prevSelected?.includes(userId)) {
  //             return prevSelected.filter(id => id !== userId);
  //         } else {
  //             return [...prevSelected, userId];
  //         }
  //     });

  //     // setSelectedStudents(studentId)
  //     // setStudentUserId(userId);

  //     const balagruhaIds = {
  //         balagruhaIds: [selectedBalagruha]
  //     }

  //     const response = await getMedicalConditionBasedOnBalagruha(balagruhaIds);
  //     const moodResponse = await getMoodBasedOnBalagruha(balagruhaIds);

  //     if (response.success) {
  //         setMedicalIssuesData(prev => {
  //             const selectedIds = [...selectedStudents]; // Using stale state here
  //             const filteredCheckIns = response.data.medicalCheckIns.filter(
  //                 checkIn => selectedIds.includes(checkIn.studentId)
  //             );
  //             return filteredCheckIns;
  //         });
  //     }

  //     if (moodResponse.success) {
  //         setMoodData(prev => {
  //             const selectedUserIds = [...studentUserId]; // Also stale
  //             const filteredMood = moodResponse.data.moodInfor.filter(
  //                 mood => selectedUserIds.includes(mood.userId)
  //             );
  //             return filteredMood;
  //         });
  //     }

  //     
  // };

  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);

    if (value.userId) return getId(value.userId);
    if (value._id) return getId(value._id);
    if (value.id) return getId(value.id);
    if (value.$oid) return value.$oid;

    return "";
  };

  const getStudentUserId = (student) =>
    getId(
      student?.userId ||
      student?.user?.userId ||
      student?.user?._id ||
      student?.user ||
      student?._id
    );
  const getObjectId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (value._id) return getObjectId(value._id);
    if (value.id) return getObjectId(value.id);
    if (value.$oid) return value.$oid;
    return "";
  };

  const getUserDisplayName = (user) => {
    if (!user) return "-";
    if (typeof user === "string") return user;
    return user.name || user.fullName || user.email || "-";
  };

  const loadSelectedStudentDetails = async (selectedStudentIds, selectedUserIds) => {
    if (!selectedBalagruha || selectedStudentIds.length === 0) {
      setMedicalIssuesData([]);
      setMoodData([]);
      return;
    }

    const payload = {
      balagruhaIds: [selectedBalagruha],
      userIds: selectedUserIds,
    };

    const [medicalResponse, moodResponse] = await Promise.all([
      getMedicalConditionBasedOnBalagruha(payload),
      getMoodBasedOnBalagruha(payload.balagruhaIds),
    ]);

    const medicalList =
      medicalResponse?.data?.medicalCheckIns ||
      medicalResponse?.data?.data?.medicalCheckIns ||
      medicalResponse?.medicalCheckIns ||
      [];

    const selectedIdSet = new Set(selectedStudentIds);
    const selectedUserIdSet = new Set(selectedUserIds);

    const filteredMedical = medicalList.filter((item) => {
      const itemStudentId = getId(item.studentId || item.student);
      return selectedIdSet.has(itemStudentId) || selectedUserIdSet.has(itemStudentId);
    });

    setMedicalIssuesData(filteredMedical);

    const moodList =
      moodResponse?.data?.moodInfo ||
      moodResponse?.data?.moodInfor ||
      moodResponse?.data?.data?.moodInfo ||
      moodResponse?.data?.data?.moodInfor ||
      [];

    const filteredMood = moodList.filter((mood) => {
      const moodUserId = getId(mood.userId || mood.user);
      const moodStudentId = getId(mood.studentId || mood.student);

      return (
        selectedUserIdSet.has(moodUserId) ||
        selectedIdSet.has(moodStudentId) ||
        selectedIdSet.has(moodUserId)
      );
    });

    setMoodData(filteredMood);
  };

  const handleStudentCheckboxChange = async (studentId, userId) => {
    const studentIdStr = getId(studentId);
    const userIdStr = getId(userId) || studentIdStr;

    const isSelected = selectedStudents.includes(studentIdStr);

    const newSelectedStudents = isSelected
      ? selectedStudents.filter((id) => id !== studentIdStr)
      : [...selectedStudents, studentIdStr];

    const newStudentUserIds = isSelected
      ? studentUserId.filter((id) => id !== userIdStr)
      : [...studentUserId, userIdStr].filter(Boolean);

    setSelectedStudents(newSelectedStudents);
    setStudentUserId(newStudentUserIds);
    await loadSelectedStudentDetails(newSelectedStudents, newStudentUserIds);
  };

  // Handle select all students
  const handleSelectAllStudents = async () => {
    if (selectedStudents.length === balagruhaStudents.length) {
      setSelectedStudents([]);
      setStudentUserId([]);
      setMedicalIssuesData([]);
      setMoodData([]);
    } else {
      const allStudentIds = balagruhaStudents.map((student) => getId(student._id));
      const allUserIds = balagruhaStudents.map(getStudentUserId).filter(Boolean);

      setSelectedStudents(allStudentIds);
      setStudentUserId(allUserIds);
      await loadSelectedStudentDetails(allStudentIds, allUserIds);
    }
  };

  const getTaskDetailsByTaskId = async (id) => {
    try {
      const response = await getTaskBytaskId(id);
      setSelectedTask(response);
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  // Handle task status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, JSON.stringify({ status: newStatus }));
      // Refresh tasks after update
      getTasksList();
      getTaskDetailsByTaskId(taskId);
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskId, updateData) => {
    try {
      await updateTask(taskId, JSON.stringify(updateData));
      // Refresh tasks after update
      getTasksList();
      getTaskDetailsByTaskId(taskId);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const adminMenus = [
    // { id: 1, name: "Subject wise progress" },
    // { id: 2, name: "Computer Usage" },
    { id: 3, name: "Medical Issues" },
    // { id: 4, name: "Balgruh & Children Details" },
    // { id: 5, name: "Performance Reports" },
    // { id: 6, name: "Attendance" },
    { id: 7, name: "Mood" },
  ];

  const coachMenus = [
    { id: 1, name: "Daily Schedule", count: schedules.length },
    { id: 2, name: "Task Tracker", count: coachTasks.length },
    { id: 3, name: "Medical", count: coachMedicalData.length },
    { id: 4, name: "Syllabus Tracker", count: coachAssignments.length },
    { id: 5, name: "Slow Learners", count: coachSlowLearners.length },
    { id: 6, name: "ISF Shop", count: coachShopData.length },
    { id: 7, name: "Suggestion", count: coachSuggestions.length },
    { id: 8, name: "Activities", count: 0 },
    { id: 9, name: "Events", count: 0 },
  ];

  const getDummyCoachData = (menuName) => {
    return Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      title: `${menuName} Item ${index + 1}`,
      status:
        index % 3 === 0 ? "New" : index % 3 === 1 ? "In Progress" : "Completed",
      metric: `${40 + index * 10}%`,
      date: new Date(Date.now() - index * 86400000).toLocaleDateString("en-GB"),
    }));
  };

  const getStudentDisplayName = (student) =>
    student?.name ||
    student?.studentName ||
    `${student?.firstName || ""} ${student?.lastName || ""}`.trim() ||
    "-";

  const normalizedStudentSearchQuery = studentSearchQuery.trim().toLowerCase();
  const filteredBalagruhaStudents = balagruhaStudents.filter((student) => {
    if (!normalizedStudentSearchQuery) return true;

    const searchableValues = [
      getStudentDisplayName(student),
      student?.userId,
      student?.studentId,
      student?.admissionNumber,
      student?.rollNumber,
      student?._id,
      getStudentUserId(student),
    ];

    return searchableValues.some((value) =>
      String(value || "").toLowerCase().includes(normalizedStudentSearchQuery)
    );
  });

  const getBalagruhaDisplayName = (item) => {
    if (Array.isArray(item?.balagruhaNames) && item.balagruhaNames.length > 0) {
      return item.balagruhaNames.join(", ");
    }
    if (Array.isArray(item?.balagruhaIds) && item.balagruhaIds.length > 0) {
      return item.balagruhaIds
        .map((balagruha) => balagruha?.name)
        .filter(Boolean)
        .join(", ") || "-";
    }
    if (Array.isArray(item?.assignedTo?.balagruhaIds) && item.assignedTo.balagruhaIds.length > 0) {
      return item.assignedTo.balagruhaIds
        .map((balagruha) => balagruha?.name)
        .filter(Boolean)
        .join(", ") || "-";
    }
    return (
      item?.balagruhaName ||
      item?.balagruhaId?.name ||
      item?.assignedTo?.balagruhaId?.name ||
      "-"
    );
  };



  const getAssignmentProgress = (assignment) =>
    assignment?.progress?.averageCompletionPercentage ??
    assignment?.averageCompletionPercentage ??
    assignment?.progressPercentage ??
    0;

  const formatDisplayDate = (value) => {
    if (!value) return "-";
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? "-" : parsedDate.toLocaleDateString("en-IN");
  };

  const getOrderItemsLabel = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return "-";
    const names = items
      .map((entry) => entry?.shopItemId?.name || entry?.name || entry?.productName)
      .filter(Boolean);
    if (names.length === 0) return "-";
    return names.length > 1 ? `${names[0]} +${names.length - 1} more` : names[0];
  };

  const getOrderQuantity = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return "-";
    return items.reduce((total, entry) => total + Number(entry?.quantity || entry?.requestedQuantity || 0), 0) || "-";
  };

  const getShopRequestStatus = (order) => {
    if (order?.deliveryStatus === "cancelled" || order?.status === "cancelled" || order?.status === "refunded") return "Rejected";
    if (order?.deliveryStatus === "pending_delivery" || order?.deliveryStatus === "delivered") return "Approved";
    return "Pending";
  };



  const getScheduleTimeSlot = (item) =>
    item?.timeSlot ||
    `${item?.startTime ? new Date(item.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-"} - ${item?.endTime ? new Date(item.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}`;

  const getTaskComputedStatus = (task) => {
    if (task?.status === "completed") return "Completed";
    if (task?.deadline && new Date(task.deadline) < new Date()) return "Overdue";
    if (task?.status === "in progress" || task?.status === "inprogress") return "In Progress";
    return task?.status || "Pending";
  };

  const getTaskRelation = (task) => {
    const creatorId = getObjectId(task?.createdBy);
    const assignedId = getObjectId(task?.assignedUser);
    if (creatorId === selectedCoach && assignedId === selectedCoach) return "Created and assigned";
    if (creatorId === selectedCoach) return "Created by coach";
    if (assignedId === selectedCoach) return "Assigned to coach";
    return "Related";
  };

  const getLatestFollowUp = (item) => {
    const followUps = Array.isArray(item?.followUps) ? item.followUps : [];
    return followUps.length > 0 ? followUps[followUps.length - 1] : item?.followUp;
  };

  const getLatestDoctorVisit = (item) => {
    const visits = Array.isArray(item?.doctorVisits) ? item.doctorVisits : [];
    return visits.length > 0 ? visits[visits.length - 1] : item?.doctorVisit;
  };

  const renderCoachMenuContent = () => {
    const menu = coachMenus.find((m) => m.id === coachMenuSelected);
    if (!menu) return null;

    if (isLoadingCoachData) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div style={{ padding: "20px", textAlign: "center" }}>
            Loading coach data...
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 1) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Assigned Activity</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length > 0 ? (
                  schedules.map((item, index) => (
                    <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{getScheduleTimeSlot(item)}</td>
                      <td>{item.title || "Scheduled item"}</td>
                      <td>{item.type || item.category || "Activity"}</td>
                      <td>{formatDisplayDate(item.date || item.startTime)}</td>
                      <td>{item.status || "pending"}</td>
                      <td>{item.description || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">No schedule items found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 2) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Relation</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Completion Date</th>
                </tr>
              </thead>
              <tbody>
                {coachTasks.length > 0 ? (
                  coachTasks.map((task, index) => (
                    <tr key={task._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{getTaskRelation(task)}</td>
                      <td>{task.title || "Untitled task"}</td>
                      <td>{task.description || "-"}</td>
                      <td>{task.priority || "-"}</td>
                      <td>{formatDisplayDate(task.deadline)}</td>
                      <td>{getTaskComputedStatus(task)}</td>
                      <td>{formatDisplayDate(task.completedAt || task.completionDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No tasks found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 3) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Recent Health Issue</th>
                  <th>Medical Records</th>
                  <th>Medication Follow-up</th>
                  <th>Doctor/Hospital Visit</th>
                  <th>Treatment Status</th>
                  <th>Pending Action</th>
                  <th>Next Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {coachMedicalData.length > 0 ? (
                  coachMedicalData.map((item, index) => {
                    const symptoms = Array.isArray(item.symptoms) && item.symptoms.length > 0
                      ? item.symptoms.join(", ").replaceAll("_", " ")
                      : item.customSymptom || item.notes || "-";
                    const followUp = getLatestFollowUp(item);
                    const doctorVisit = getLatestDoctorVisit(item);
                    return (
                      <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                        <td>{item.userName || item.studentName || item.name || "-"}</td>
                        <td>{symptoms}</td>
                        <td>{item.attachments?.length || item.medicalRecords?.length || 0}</td>
                        <td>{followUp?.status || "-"}</td>
                        <td>{doctorVisit?.doctorName || doctorVisit?.hospitalName || "-"}</td>
                        <td>{item.healthStatus || "-"}</td>
                        <td>{followUp?.notes || item.pendingAction || "-"}</td>
                        <td>{formatDisplayDate(followUp?.followUpDate || item.nextFollowUpDate)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8">No medical data found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 4) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Student/Class</th>
                  <th>Subject</th>
                  <th>Topic/Chapter</th>
                  <th>Completed Topics</th>
                  <th>Pending Topics</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {coachAssignments.length > 0 ? (
                  coachAssignments.map((assignment, index) => (
                    <tr key={assignment._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{getBalagruhaDisplayName(assignment)}</td>
                      <td>{assignment.courseId?.category || assignment.course?.category || "-"}</td>
                      <td>{assignment.courseId?.title || assignment.course?.title || "Untitled course"}</td>
                      <td>{assignment.progress?.studentsCompleted ?? assignment.completedTopics?.length ?? "-"}</td>
                      <td>{assignment.progress?.totalStudents ? Math.max(assignment.progress.totalStudents - (assignment.progress.studentsCompleted || 0), 0) : "-"}</td>
                      <td>{getAssignmentProgress(assignment)}%</td>
                      <td>{assignment.status || "-"}</td>
                      <td>{formatDisplayDate(assignment.updatedAt || assignment.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">No syllabus data found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 5) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Weak Subjects</th>
                  <th>Weak Topics / Difficulties</th>
                  <th>Identified Problems</th>
                  <th>Improvement Plan</th>
                  <th>Coach Actions</th>
                  <th>Current Progress</th>
                  <th>Remarks</th>
                  <th>Next Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {coachSlowLearners.length > 0 ? (
                  coachSlowLearners.map((student, index) => (
                    <tr key={student.studentId || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{getStudentDisplayName(student)}</td>
                      <td>{student.weakSubjects?.join?.(", ") || student.courseTitle || "-"}</td>
                      <td>{student.weakTopics?.join?.(", ") || student.learningDifficulties || "-"}</td>
                      <td>{student.identifiedProblems || "Low completion"}</td>
                      <td>{student.improvementPlan || "-"}</td>
                      <td>{student.actionsTaken || "-"}</td>
                      <td>{student.averageCompletion ?? student.currentProgress ?? 0}%</td>
                      <td>{student.remarks || "-"}</td>
                      <td>{formatDisplayDate(student.nextFollowUpDate)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9">No slow learners found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 6) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Item Requested</th>
                  <th>Quantity</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Distribution Date</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {coachShopData.length > 0 ? (
                  coachShopData.map((item, index) => (
                    <tr key={item._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{item.userId?.name || item.studentName || "-"}</td>
                      <td>{getOrderItemsLabel(item.items)}</td>
                      <td>{getOrderQuantity(item.items)}</td>
                      <td>{formatDisplayDate(item.placedAt || item.createdAt)}</td>
                      <td>{getShopRequestStatus(item)}</td>
                      <td>{formatDisplayDate(item.deliveredAt)}</td>
                      <td>{(item.deliveryStatus || item.status || "-").replaceAll("_", " ")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">No ISF shop data found for this coach in the selected Balagruha.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 7) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th>Admin Response</th>
                  <th>Resolution</th>
                  <th>Resolution Date</th>
                </tr>
              </thead>
              <tbody>
                {coachSuggestions.length > 0 ? (
                  coachSuggestions.map((suggestion, index) => (
                    <tr key={suggestion._id || index} className={index % 2 === 0 ? "even-row" : ""}>
                      <td>{suggestion.title || "Untitled suggestion"}</td>
                      <td>{suggestion.category || suggestion.type || "-"}</td>
                      <td>{suggestion.description || suggestion.content || suggestion.reason || "-"}</td>
                      <td>{formatDisplayDate(suggestion.submittedDate || suggestion.createdAt || suggestion.suggestedDate)}</td>
                      <td>{suggestion.status || "pending"}</td>
                      <td>{suggestion.adminResponse || suggestion.reviewNotes || "-"}</td>
                      <td>{suggestion.resolutionStatus || suggestion.status || "pending"}</td>
                      <td>{formatDisplayDate(suggestion.resolutionDate || suggestion.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8">No suggestions found for this coach.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 8) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Activity Name</th>
                  <th>Activity Date</th>
                  <th>Students Involved</th>
                  <th>Participants</th>
                  <th>Coach Role</th>
                  <th>Attendance</th>
                  <th>Status</th>
                  <th>Outcomes</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="9">No activities data found for this coach in the selected Balagruha.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (coachMenuSelected === 9) {
      return (
        <div className="data-display">
          <h3>{menu.name}</h3>
          <div className="table-container">
            <table className="data-table coach-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th>Participating Students</th>
                  <th>Coach Responsibility</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Outcome</th>
                  <th>Report</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="10">No events data found for this coach in the selected Balagruha.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return (
      <div className="data-display">
        <h3>{menu.name}</h3>
        <div style={{ padding: "20px" }}>
          No data is available for this section yet.
        </div>
      </div>
    );
  };

  // Convert tasks to calendar events
  // const getCalendarEvents = () => {
  //     if (!tasks || tasks.length === 0) {
  //         // If no tasks, use dummy data
  //         return [
  //             {
  //                 id: 1,
  //                 title: "Visit to Sampare",
  //                 location: "Shelpimplegaon",
  //                 date: "2025-03-20",
  //                 time: "09:00-11:00",
  //                 type: "visit",
  //                 description: "Regular visit to check on children's progress",
  //                 attendees: ["Coach 1", "Admin", "Local Volunteer"],
  //                 status: "Confirmed",
  //                 // Create a task-like object for the modal
  //                 taskData: {
  //                     _id: "1",
  //                     title: "Visit to Sampare",
  //                     description: "Regular visit to check on children's progress",
  //                     status: "pending",
  //                     priority: "High",
  //                     deadline: "2025-03-20T11:00:00",
  //                     createdAt: "2025-03-15T09:00:00",
  //                     assignedUser: "1",
  //                     createdBy: "2",
  //                     comments: [],
  //                     attachments: []
  //                 }
  //             }
  //         ];
  //     }

  //     return tasks?.map(task => ({
  //         id: task._id,
  //         title: task.title,
  //         location: task.location || "Not specified",
  //         date: task.deadline ? task.deadline.split('T')[0] : "2025-03-20",
  //         time: task.startTime || "All day",
  //         type: (task.priority || "medium").toLowerCase(),
  //         description: task.description,
  //         attendees: [
  //             users.find(u => u._id === task.assignedUser)?.name || "Unassigned",
  //             users.find(u => u._id === task.createdBy)?.name || "Unknown"
  //         ],
  //         status: task.status === "completed" ? "Completed" :
  //             task.status === "in progress" ? "In Progress" : "Pending",
  //         taskData: task
  //     }));
  // };

  // // Calendar events data
  // const calendarEvents = getCalendarEvents();

  // Function to handle event click - opens the task modal
  const handleEventClick = (event) => {
    setSelectedTask(event.taskData);
    setShowTaskModal(true);
  };

  // Dashboard stats for admin overview
  const dashboardStats = [
    {
      title: "Total Balagruhas",
      value: balagruhas.length || 12,
      icon: "🏠",
      color: "#8a7bff",
    },
    {
      title: "Active Coaches",
      value: coaches.length || 5,
      icon: "👨‍🏫",
      color: "#ff9966",
    },
    {
      title: "Total Children",
      value: students.length || 120,
      icon: "👧",
      color: "#4caf50",
    },
  ];

  // Subject progress data
  const subjectProgressData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      subject: "Mathematics",
      progress: 85,
      date: "2025-03-20",
    },
    {
      id: 2,
      studentName: "Priya Patel",
      subject: "Science",
      progress: 92,
      date: "2025-03-21",
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      subject: "English",
      progress: 78,
      date: "2025-03-19",
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      subject: "Hindi",
      progress: 88,
      date: "2025-03-22",
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      subject: "Social Studies",
      progress: 75,
      date: "2025-03-18",
    },
    {
      id: 6,
      studentName: "Neha Singh",
      subject: "Computer Science",
      progress: 95,
      date: "2025-03-23",
    },
    {
      id: 7,
      studentName: "Vikram Joshi",
      subject: "Art",
      progress: 90,
      date: "2025-03-21",
    },
    {
      id: 8,
      studentName: "Meera Reddy",
      subject: "Physical Education",
      progress: 82,
      date: "2025-03-20",
    },
  ];

  // Computer usage stats
  const computerUsageStats = [
    {
      title: "Active Computers",
      value: machines.filter((machine) => machine.status === "active").length,
      icon: "💻",
      color: "#4caf50",
    },
    {
      title: "Inactive Computers",
      value: machines.filter((machine) => machine.status === "inactive").length,
      icon: "🔌",
      color: "#ff9800",
    },
    {
      title: "In Maintenance",
      value: machines.filter((machine) => machine.status === "maintainence")
        .length,
      icon: "🔧",
      color: "#f44336",
    },
    {
      title: "Total Computers",
      value: machines.length,
      icon: "📦",
      color: "#9e9e9e",
    },
  ];

  // Medical issues data
  // const medicalIssuesData = [
  //     { id: 1, studentName: "Rahul Sharma", balagruhaName: "Balagruha 1", doctorName: "Dr. Mehta", disease: "Common Cold" },
  //     { id: 2, studentName: "Priya Patel", balagruhaName: "Balagruha 2", doctorName: "Dr. Sharma", disease: "Allergic Rhinitis" },
  //     { id: 3, studentName: "Amit Kumar", balagruhaName: "Balagruha 1", doctorName: "Dr. Gupta", disease: "Viral Fever" },
  //     { id: 4, studentName: "Sneha Gupta", balagruhaName: "Balagruha 3", doctorName: "Dr. Patel", disease: "Skin Rash" },
  //     { id: 5, studentName: "Raj Malhotra", balagruhaName: "Balagruha 2", doctorName: "Dr. Singh", disease: "Gastroenteritis" }
  // ];

  // Balagruha and children details
  const balagruhaDetailsData = [
    {
      id: 1,
      name: "Balagruha 1",
      childrenCount: 25,
      location: "Mumbai, Maharashtra",
    },
    {
      id: 2,
      name: "Balagruha 2",
      childrenCount: 32,
      location: "Pune, Maharashtra",
    },
    {
      id: 3,
      name: "Balagruha 3",
      childrenCount: 18,
      location: "Nagpur, Maharashtra",
    },
    {
      id: 4,
      name: "Balagruha 4",
      childrenCount: 27,
      location: "Nashik, Maharashtra",
    },
    {
      id: 5,
      name: "Balagruha 5",
      childrenCount: 22,
      location: "Aurangabad, Maharashtra",
    },
  ];

  // Performance reports data
  const performanceReportsData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      subject: "Mathematics",
      excellsIn: "Algebra",
      percentage: 92,
    },
    {
      id: 2,
      studentName: "Priya Patel",
      subject: "Science",
      excellsIn: "Biology",
      percentage: 88,
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      subject: "English",
      excellsIn: "Creative Writing",
      percentage: 85,
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      subject: "Computer Science",
      excellsIn: "Programming",
      percentage: 95,
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      subject: "Social Studies",
      excellsIn: "History",
      percentage: 82,
    },
    {
      id: 6,
      studentName: "Neha Singh",
      subject: "Art",
      excellsIn: "Painting",
      percentage: 90,
    },
  ];

  // Attendance data
  const attendanceData = [
    {
      id: 1,
      studentName: "Rahul Sharma",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 2,
      studentName: "Priya Patel",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 3,
      studentName: "Amit Kumar",
      date: new Date().toLocaleDateString(),
      status: "Absent",
    },
    {
      id: 4,
      studentName: "Sneha Gupta",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 5,
      studentName: "Raj Malhotra",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
    {
      id: 6,
      studentName: "Neha Singh",
      date: new Date().toLocaleDateString(),
      status: "Absent",
    },
    {
      id: 7,
      studentName: "Vikram Joshi",
      date: new Date().toLocaleDateString(),
      status: "Present",
    },
  ];

  return (
    <div className="admin-dashboard">
      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
          }}
          users={users}
          onStatusChange={handleStatusChange}
          onUpdateTask={handleUpdateTask}
        />
      )}

      {/* Dashboard Overview */}
      <div className="dashboard-overview">
        <div className="admin-main-content">
          {/* Left Panel */}
          <div className="admin-left-panel">
            {/* Balagruha Selection */}
            <div className="balagruha-selection">
              <h3>Balagruhas</h3>
              {/* <div className="scroll-container scrollable-menu">
                                {balagruhas?.map(bal => (
                                    <div
                                        key={bal._id}
                                        className={`balagruha-item ${selectedBalagruha === bal._id ? 'selected' : ''}`}
                                        onClick={() => {
                                            setSelectedStudents([]);
                                            setStudentUserId([]);
                                            setMoodData();
                                            setMedicalIssuesData();
                                            setSelectedBalagruha(bal._id);
                                            getStudentListBasedonDate(bal._id);
                                            // setAdminMenuSelected(3);
                                        }}
                                    >
                                        <div>{bal.name}</div>
                                    </div>
                                ))}
                            </div> */}
              <div className="scroll-wrapper">
                <button
                  className="scroll-button left"
                  onClick={() => scrollMenu("left")}
                >
                  &lt;
                </button>

                <div
                  className="scroll-container scrollable-menu"
                  ref={scrollRef}
                >
                  {balagruhas?.map((bal) => (
                    <div
                      key={bal._id}
                      className={`balagruha-item ${selectedBalagruha === bal._id ? "selected" : ""
                        }`}
                      onClick={() => {
                        setSelectedStudents([]);
                        setStudentUserId([]);
                        setMoodData();
                        setMedicalIssuesData();
                        clearCoachSelection();
                        setSelectedBalagruha(bal._id);
                        getStudentListBasedonDate(bal._id);
                      }}
                    >
                      <div>{bal.name}</div>
                    </div>
                  ))}
                </div>

                <button
                  className="scroll-button right"
                  onClick={() => scrollMenu("right")}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* Student Dropdown */}
            {/* {showStudentDropdown && (
                            
                        )} */}

            <div className="student-dropdown-container">
              <div
                className="student-dropdown-header"
                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              >
                <h3>Students</h3>
                <span className="dropdown-arrow">
                  {showStudentDropdown ? "▲" : "▼"}
                </span>
              </div>

              <div className={`drop-container`}>
                {/* <div className="select-all-option">
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={selectedStudents.length === balagruhaStudents.length && balagruhaStudents.length > 0}
                                            onChange={handleSelectAllStudents}
                                        />
                                        <span className="checkmark"></span>
                                        Select All
                                    </label>
                                </div> */}

                {showStudentDropdown && (
                  <>
                    <div className="student-search-container">
                      <input
                        type="search"
                        value={studentSearchQuery}
                        onChange={(event) => setStudentSearchQuery(event.target.value)}
                        placeholder="Search students"
                        aria-label="Search students"
                      />
                    </div>

                    <div className="student-list">
                      {filteredBalagruhaStudents.length > 0 ? (
                        filteredBalagruhaStudents.map((student) => (
                          <div key={student._id} className="student-item">
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={selectedStudents?.includes(getId(student._id))}
                                onChange={() =>
                                  handleStudentCheckboxChange(
                                    student._id,
                                    getStudentUserId(student)
                                  )
                                }
                              />
                              <span className="checkmark"></span>
                              {getStudentDisplayName(student)}
                            </label>
                          </div>
                        ))
                      ) : (
                        <div className="no-students-message">
                          {balagruhaStudents.length > 0
                            ? "No students match your search"
                            : "No students found for this balagruha"}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Admin Menus (shown when Balagruha is selected) */}
            {selectedBalagruha && (
              <div className="admin-menus">
                <h3>Management Options</h3>
                <div className="menu-grid scrollable-menu">
                  {adminMenus?.map((menu) => (
                    <div
                      key={menu.id}
                      className={`menu-item ${adminMenuSelected === menu.id ? "selected" : ""
                        }`}
                      onClick={() => setAdminMenuSelected(menu.id)}
                    >
                      {menu.name}
                    </div>
                  ))}
                </div>

                {/* {adminMenuSelected === 1 && (
                                    <div className="data-display">
                                        <h3>Subject Wise Progress</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Subject</th>
                                                        <th>Progress</th>
                                                        <th>Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectProgressData.map((item, index) => (
                                                        <tr key={item.id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{students[index]?.name || item.studentName}</td>
                                                            <td>{item.subject}</td>
                                                            <td>
                                                                <div className="progress-bar-bg">
                                                                    <div
                                                                        className="progress-bar-fill"
                                                                        style={{
                                                                            width: `${item.progress}%`,
                                                                            backgroundColor: item.progress > 70 ? "#4caf50" : item.progress > 40 ? "#ff9800" : "#f44336"
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                                <div className="progress-text">{item.progress}%</div>
                                                            </td>
                                                            <td>{item.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 2 && (
                                    <div className="data-display">
                                        <h3>Computer Usage</h3>
                                        <div className="computer-stats-container">
                                            {computerUsageStats.map((stat, index) => (
                                                <div className="computer-stat-card" key={index} style={{ backgroundColor: stat.color + '15', borderLeft: `4px solid ${stat.color}` }}>
                                                    <div className="stat-icon" style={{ backgroundColor: stat.color }}>{stat.icon}</div>
                                                    <div className="stat-info">
                                                        <div className="stat-value">{stat.value}</div>
                                                        <div className="stat-title">{stat.title}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )} */}

                {adminMenuSelected === 3 && (
                  <div className="data-display">
                    <h3>Medical Issues</h3>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>SI NO</th>
                            <th>Student Name</th>
                            <th>Medical Incharge</th>
                            <th>Temperature</th>
                            <th>Time Stamp</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {medicalIssuesData?.map((item, index) => (
                            <tr
                              key={item.id}
                              className={index % 2 === 0 ? "even-row" : ""}
                            >
                              <td>{index + 1}</td>
                              <td>{item?.userName}</td>
                              <td>{item.createdByUser || getUserDisplayName(item.createdBy)}</td>
                              <td>{item.temperature}</td>
                              <td>
                                {new Date(item.date).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </td>
                              <td>{item.healthStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* {adminMenuSelected === 4 && (
                                    <div className="data-display">
                                        <h3>Balagruha & Children Details</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Balagruha Name</th>
                                                        <th>Children Count</th>
                                                        <th>Location</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {balagruhas.map((item, index) => (
                                                        <tr key={item._id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{item.name}</td>
                                                            <td>25</td>
                                                            <td>{item.location}</td>

                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 5 && (
                                    <div className="data-display">
                                        <h3>Performance Reports</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Subject</th>
                                                        <th>Excels In</th>
                                                        <th>Percentage</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {performanceReportsData.map((item, index) => (
                                                        <tr key={item.id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{students[index]?.name || item.studentName}</td>
                                                            <td>{item.subject}</td>
                                                            <td>{item.excellsIn}</td>
                                                            <td>
                                                                <div className="percentage-badge" style={{
                                                                    backgroundColor: item.percentage > 85 ? "#4caf50" :
                                                                        item.percentage > 70 ? "#8bc34a" :
                                                                            item.percentage > 60 ? "#ff9800" : "#f44336"
                                                                }}>
                                                                    {item.percentage}%
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {/* {adminMenuSelected === 6 && (
                                    <div className="data-display">
                                        <h3>Attendance</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>Date</th>
                                                        <th>Status</th>

                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attendance.map((item, index) => (
                                                        <tr key={item._id} className={index % 2 === 0 ? 'even-row' : ''}>
                                                            <td>{item.name}</td>
                                                            <td>{new Date(item.updatedAt).toDateString()}</td>
                                                            <td>
                                                                <span className={`attendance-badge ${item.status?.toLowerCase() || (item.attendance && item.attendance[0]?.status?.toLowerCase())}`}>
                                                                    {item.status || (item.attendance && item.attendance[0]?.status) || "Unknown"}
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )} */}

                {adminMenuSelected === 7 && (
                  <div className="data-display">
                    <h3>Mood</h3>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>SI NO</th>
                            <th>Student Name</th>
                            <th>User ID</th>
                            <th>Mood</th>
                            <th>Time Stamp</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {moodData?.map((item, index) => (
                            <tr
                              key={item._id || item.id || index}
                              className={index % 2 === 0 ? "even-row" : ""}
                            >
                              <td>{index + 1}</td>
                              <td>{item.userName || item.studentName || "-"}</td>
                              <td>{item.loginUserId ?? item.userLoginId ?? item.studentUserId ?? getId(item.userId)}</td>
                              <td>{item.mood}</td>
                              <td>
                                {new Date(
                                  item.date || item.createdAt || item.updatedAt
                                ).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </td>
                              <td>{item.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="admin-right-panel">
            {/* Coach Selection */}
            {/* <div className="coach-selection">
                            <h3>Coaches</h3>
                            <div className="scroll-container scrollable-menu">
                                {coaches.length > 0 ?
                                    coaches.map(coach => (
                                        <div
                                            key={coach._id}
                                            className={`coach-item ${selectedCoach === coach._id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(coach._id);
                                                setCoachMenuSelected(1);
                                            }}
                                        >
                                            {coach.name}
                                        </div>
                                    )) :
                                    // Fallback to dummy data if no coaches found
                                    [1, 2, 3, 4, 5].map(id => (
                                        <div
                                            key={id}
                                            className={`coach-item ${selectedCoach === id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(id);
                                                setCoachMenuSelected(1);
                                            }}
                                        >
                                            Coach {id}
                                        </div>
                                    ))
                                }
                            </div>
                        </div> */}

            {/* Balagruha assigned to coach */}

            {/* <div className="coach-selection">
                            <h3>Coaches</h3>
                            <div className="scroll-container scrollable-menu">
                                {coaches.length > 0 ?
                                    coaches?.map(coach => (
                                        <div
                                            key={coach._id}
                                            className={`coach-item ${selectedCoach === coach._id ? 'selected' : ''}`}
                                            onClick={() => {
                                                setSelectedCoach(coach._id);
                                                setSelectedBalagruhaOfCoach();
                                                fetchBalagruhaByCoach(coach._id);
                                                // setCoachMenuSelected(1);
                                            }}
                                        >
                                            {coach.name}
                                        </div>
                                    )) :
                                    // Fallback to dummy data if no coaches found
                                    <p>Select a balagruha to view coaches</p>
                                }
                            </div>
                        </div> */}

            <div className="coach-selection">
              <h3>Coaches</h3>
              <div className="scroll-wrapper" style={{ position: "relative" }}>
                <button
                  className="scroll-button left"
                  onClick={() => {
                    document
                      .getElementById("coach-scroll-container")
                      .scrollBy({ left: -200, behavior: "smooth" });
                  }}
                >
                  &lt;
                </button>
                <div
                  id="coach-scroll-container"
                  className="scroll-container scrollable-menu"
                >
                  {coaches.length > 0 ? (
                    coaches.map((coach) => (
                      <div
                        key={coach._id}
                        className={`coach-item ${selectedCoach === coach._id ? "selected" : ""
                          }`}
                        onClick={() => handleCoachSelect(coach._id)}
                      >
                        <CoachName name={coach.name} />
                      </div>
                    ))
                  ) : (
                    <p>Select a balagruha to view coaches</p>
                  )}
                </div>
                <button
                  className="scroll-button right"
                  onClick={() => {
                    document
                      .getElementById("coach-scroll-container")
                      .scrollBy({ left: 200, behavior: "smooth" });
                  }}
                >
                  &gt;
                </button>
              </div>
            </div>

            {/* {balagruhaOfCoach.length > 0 && (
              <div className="assigned-balagruha">
                <h3>Assigned Balagruhas</h3>
                <div className="scroll-container scrollable-menu">
                  {balagruhaOfCoach?.map((bal) => (
                    <div
                      key={bal._id}
                      className={`balagruha-item ${
                        selectedBalagruhaOfCoach === bal._id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedBalagruhaOfCoach(bal._id);
                        // const today = new Date();
                        // const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

                        // // Get Monday (start of week)
                        // const startDate = new Date(today);
                        // startDate.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                        // startDate.setHours(0, 0, 0, 0);

                        // // Get Sunday (end of week)
                        // const endDate = new Date(startDate);
                        // endDate.setDate(startDate.getDate() + 6);
                        // endDate.setHours(23, 59, 59, 999);

                        // // Now call fetchSchedules
                        // fetchSchedules(bal._id, startDate, endDate);

                        const today = new Date();
                        const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

                        // Get Monday
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
                        monday.setHours(0, 0, 0, 0);

                        // Get Sunday
                        const sunday = new Date(monday);
                        sunday.setDate(monday.getDate() + 6);
                        sunday.setHours(23, 59, 59, 999);

                        // Format to 'YYYY-MM-DD'
                        const startDate = monday.toISOString().slice(0, 10);
                        const endDate = sunday.toISOString().slice(0, 10);

                        // Call your function
                        fetchSchedules(bal._id, startDate, endDate);
                        // getStudentListBasedonDate(bal._id);
                        // setAdminMenuSelected(3);
                      }}
                    >
                      <div>{bal.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {/* {balagruhaOfCoach.length > 0 && (
              <div className="assigned-balagruha">
                <h3>Assigned Balagruhas</h3>
                <div
                  className="scroll-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    className="scroll-button left"
                    onClick={() => {
                      document
                        .getElementById("balagruha-scroll-container")
                        .scrollBy({ left: -200, behavior: "smooth" });
                    }}
                  >
                    &lt;
                  </button>

                  <div
                    id="balagruha-scroll-container"
                    className="scroll-container scrollable-menu"
                  >
                    {balagruhaOfCoach.map((bal) => (
                      <div
                        key={bal._id}
                        className={`balagruha-item ${
                          selectedBalagruhaOfCoach === bal._id ? "selected" : ""
                        }`}
                        onClick={() => {
                          setSelectedBalagruhaOfCoach(bal._id);

                          const { startDate, endDate } = getCurrentWeekDateRange();
                          fetchSchedules(
                            bal._id,
                            startDate,
                            endDate,
                            selectedCoach
                          );
                        }}
                      >
                        <div>{bal.name}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="scroll-button right"
                    onClick={() => {
                      document
                        .getElementById("balagruha-scroll-container")
                        .scrollBy({ left: 200, behavior: "smooth" });
                    }}
                  >
                    &gt;
                  </button>
                </div>
              </div>
            )} */}

            {/* Coach Menus */}
            {selectedCoach && (
              <div className="coach-menus">
                {/* <h3>Coach Options</h3>
                <div
                  className="menu-grid scrollable-menu"
                  style={{ paddingTop: "15px", boxSizing: "border-box" }}
                >
                  {coachMenus?.map((menu) => (
                    <div style={{ position: "relative" }}>
                      <div
                        key={menu.id}
                        className={`menu-item ${
                          coachMenuSelected === menu.id ? "selected" : ""
                        }`}
                        onClick={() => setCoachMenuSelected(menu.id)}
                      >
                        {menu.name}
                      </div>
                      <div className="menu-bubble">
                        {menu.count ? menu.count : 0}
                      </div>
                    </div>
                  ))}
                </div> */}

                <h3>Coach Options</h3>
                <div
                  className="scroll-wrapper"
                  style={{ position: "relative" }}
                >
                  <button
                    className="scroll-button left"
                    onClick={() =>
                      document
                        .getElementById("coach-options-scroll")
                        .scrollBy({ left: -200, behavior: "smooth" })
                    }
                  >
                    &lt;
                  </button>

                  <div
                    id="coach-options-scroll"
                    className="menu-grid scrollable-menu"
                    style={{
                      paddingTop: "15px",
                      boxSizing: "border-box",
                      overflowX: "auto",
                      display: "flex",
                      gap: "1rem",
                    }}
                  >
                    {coachMenus?.map((menu) => (
                      <div key={menu.id} style={{ position: "relative" }}>
                        <div
                          className={`menu-item ${coachMenuSelected === menu.id ? "selected" : ""
                            }`}
                          onClick={() => setCoachMenuSelected(menu.id)}
                        >
                          {menu.name}
                        </div>
                        <div className="menu-bubble">{menu.count || 0}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="scroll-button right"
                    onClick={() =>
                      document
                        .getElementById("coach-options-scroll")
                        .scrollBy({ left: 200, behavior: "smooth" })
                    }
                  >
                    &gt;
                  </button>
                </div>

                {renderCoachMenuContent()}

                {/* Weekly Calendar (shown when Daily Schedule is selected) */}
                {coachMenuSelected === 1 && (
                  <div className="admin-weekly-calendar-wrapper">
                    <WeeklyCalendar
                      currentWeekOffset={currentWeekOffset}
                      setCurrentWeekOffset={setCurrentWeekOffset}
                      calendarEvents={schedules}
                      users={users}
                      onEventClick={handleEventClick}
                      fetchSchedules={fetchSchedules}
                      selectedBalagruhaOfCoach={selectedBalagruhaOfCoach}
                      selectedCoach={selectedCoach}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;