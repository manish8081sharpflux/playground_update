import React, { useState, useEffect, useMemo } from "react";
import {
  Star,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  User,
  Heart,
  ThumbsUp,
  Search,
  Bell,
  Archive,
  FileText,
  Image as ImageIcon,
  Video,
  Volume2,
  ExternalLink,
  Calendar,
  CheckCircle,
  Coins,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button.jsx";
import { Badge } from "../ui/badge.jsx";
import CreateNewPinModal from "./CreateNewPinModal";
import PinEditModal from "./PinEditModal";
import ReviewModal from "./ReviewModal";
import CoachSuggestionReviewModal from "./CoachSuggestionReviewModal";
import DraftsModal from "./DraftsModal";
import { useAuth } from "../../contexts/AuthContext";
import BackgroundSettings from "./BackgroundSettings";
import showToast from "../../utils/toast";
import { getWtfCoinReward, updateWtfCoinReward } from "../../api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  useWtfBackground,
  WtfBackgroundProvider,
} from "../../contexts/WtfBackgroundContext";
import {
  createWtfPin,
  getActiveWtfPins,
  updateWtfPin,
  deleteWtfPin,
  changeWtfPinStatus,
  getSubmissionsForReview,
  reviewSubmission,
  getWtfAnalytics,
  getWtfDashboardCounts,
  getCoachSuggestions,
  getArchivedSubmissions,
  unarchiveSubmission,
  getAllCoinTransactions,
  reorderWtfPins,
} from "../../api";

const WTFManagementContent = ({ onToggleView }) => {
  const { user } = useAuth(); // reserved for role-based tweaks
  const { getBackgroundStyle, refreshBackgroundSettings } = useWtfBackground();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [submissionTab, setSubmissionTab] = useState("voice");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedCoachSuggestion, setSelectedCoachSuggestion] = useState(null);
  const [showCoachSuggestionModal, setShowCoachSuggestionModal] =
    useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // ISF Coin Rules - WTF Reward Configuration (UI only for now)
  const [wtfCoinReward, setWtfCoinReward] = useState(25);
  const [isSavingCoinReward, setIsSavingCoinReward] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Coach suggestions pagination
  const [coachSuggestionsPage, setCoachSuggestionsPage] = useState(1);
  const [coachSuggestionsPerPage, setCoachSuggestionsPerPage] = useState(10);

  // Student submissions pagination
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsPerPage, setSubmissionsPerPage] = useState(10);

  // Coin transactions state
  const [coinTransactions, setCoinTransactions] = useState([]);
  const [coinTransactionsLoading, setCoinTransactionsLoading] = useState(false);
  const [coinTransactionsPage, setCoinTransactionsPage] = useState(1);
  const [coinTransactionsPerPage, setCoinTransactionsPerPage] = useState(20);
  const [coinTransactionsTotal, setCoinTransactionsTotal] = useState(0);
  const [coinTransactionsFilters, setCoinTransactionsFilters] = useState({
    source: "",
    pinType: "",
    dateFrom: "",
    dateTo: "",
  });

  // Real data from API
  const [activePins, setActivePins] = useState([]);
  const [pendingSuggestions, setPendingSuggestions] = useState([]); // legacy; kept for metrics fallback only
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [pendingVoiceCount, setPendingVoiceCount] = useState(0);
  const [pendingArticleCount, setPendingArticleCount] = useState(0);
  const [analytics, setAnalytics] = useState({}); // reserved for analytics tab
  const [dashboardMetrics, setDashboardMetrics] = useState({
    activePins: 0,
    coachSuggestions: 0,
    studentSubmissions: 0,
    totalEngagement: 0,
  });
  const [loading, setLoading] = useState(false); // reserved for loading states
  const [error, setError] = useState(null); // reserved for error toasts
  const [isReordering, setIsReordering] = useState(false);

  // Archived lists
  const [archivedSubmissions, setArchivedSubmissions] = useState([]);
  const [archivedPage, setArchivedPage] = useState(1);
  const [archivedPerPage, setArchivedPerPage] = useState(10);

  // Pin management filters
  const [pinFilters, setPinFilters] = useState({
    source: "all",
    pinType: "all",
    dateFrom: "",
    dateTo: "",
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchWtfData();
  }, []);

  // Refresh active pins when filters change
  useEffect(() => {
    if (activeTab === "dashboard") {
      refreshActivePins();
    }
  }, [pinFilters, filterType]);

  // Function to refresh data when switching tabs
  const refreshTabData = async (tabId) => {
    try {
      switch (tabId) {
        case "dashboard":
          // Refresh active pins for Pin Management tab
          const pinsResponse = await getActiveWtfPins({
            page: 1,
            limit: 20,
            type: filterType === "all" ? null : filterType,
            source: pinFilters.source === "all" ? null : pinFilters.source,
            pinType: pinFilters.pinType === "all" ? null : pinFilters.pinType,
            dateFrom: pinFilters.dateFrom || null,
            dateTo: pinFilters.dateTo || null,
          });
          if (
            pinsResponse.success &&
            pinsResponse.data &&
            pinsResponse.data.pins
          ) {
            setActivePins(pinsResponse.data.pins);
            setTotalItems(
              pinsResponse.data.pagination?.total ||
                pinsResponse.data.pins.length
            );
          }
          break;

        case "coach-suggestions":
          // Refresh coach suggestions
          const coachSuggestionsResponse = await getCoachSuggestions({
            page: 1,
            limit: 20,
          });
          if (coachSuggestionsResponse.success) {
            const fetchedSuggestions = coachSuggestionsResponse.data || [];
            setCoachSuggestions(fetchedSuggestions);
            setPendingSuggestions(fetchedSuggestions);
          }
          break;

        case "submissions":
          // Refresh student submissions
          const submissionsResponse = await getSubmissionsForReview({
            page: 1,
            limit: 20,
            type: submissionTab,
            isCoachSuggestion: false,
          });
          if (submissionsResponse.success) {
            const fetchedSubmissions =
              submissionsResponse.data?.submissions || [];
            setStudentSubmissions(fetchedSubmissions);
          }

          // Refresh submission counts
          const [voiceResp, articleResp] = await Promise.all([
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "voice",
              isCoachSuggestion: false,
              status: "pending",
            }),
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "article",
              isCoachSuggestion: false,
              status: "pending",
            }),
          ]);

          const voiceTotal = voiceResp?.success
            ? voiceResp?.data?.pagination?.total || 0
            : 0;
          const articleTotal = articleResp?.success
            ? articleResp?.data?.pagination?.total || 0
            : 0;

          setPendingVoiceCount(voiceTotal);
          setPendingArticleCount(articleTotal);
          break;

        case "archive":
          // Refresh archived submissions
          const archivedResp = await getArchivedSubmissions({
            page: 1,
            limit: 50,
          });
          if (archivedResp?.success) {
            setArchivedSubmissions(archivedResp.data?.submissions || []);
          }
          break;

        default:
          break;
      }

      // Always refresh dashboard counts when switching tabs
      const countsResp = await getWtfDashboardCounts();
      if (countsResp.success) {
        setDashboardMetrics(countsResp.data);
      }
    } catch (error) {
      console.error("Error refreshing tab data:", error);
    }
  };

  // Handle tab switching with data refresh
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    refreshTabData(tabId);
  };

  // Fetch coin transactions
  const fetchCoinTransactions = async () => {
    try {
      setCoinTransactionsLoading(true);
      const params = {
        page: coinTransactionsPage,
        limit: coinTransactionsPerPage,
        ...coinTransactionsFilters,
      };




      const response = await getAllCoinTransactions(params);
      if (response.success) {
        setCoinTransactions(response.data.transactions);
        setCoinTransactionsTotal(response.data.totalTransactions);

      }
    } catch (error) {
      console.error("Error fetching coin transactions:", error);
      showToast("Error fetching coin transactions", "error");
    } finally {
      setCoinTransactionsLoading(false);
    }
  };

  // Fetch coin transactions when filters or page changes
  useEffect(() => {

    if (activeTab === "coin-transactions") {
      fetchCoinTransactions();
    }
  }, [activeTab, coinTransactionsPage, coinTransactionsFilters]);

  // Handle coin transactions filter changes
  const handleCoinTransactionsFilterChange = (key, value) => {


    setCoinTransactionsFilters((prev) => {
      const newFilters = { ...prev, [key]: value };

      return newFilters;
    });
    setCoinTransactionsPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearCoinTransactionsFilters = () => {

    setCoinTransactionsFilters({
      source: "",
      pinType: "",
      dateFrom: "",
      dateTo: "",
    });
    setCoinTransactionsPage(1);
  };

  // Refetch submissions when switching between Voice and Articles
  useEffect(() => {
    fetchWtfData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionTab]);

  // Fetch submission counts when landing on Student Submissions tab
  useEffect(() => {
    if (activeTab === "submissions") {
      (async () => {
        try {
          const [voiceResp, articleResp] = await Promise.all([
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "voice",
              isCoachSuggestion: false,
              status: "pending",
            }),
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "article",
              isCoachSuggestion: false,
              status: "pending",
            }),
          ]);

          const voiceTotal = voiceResp?.success
            ? voiceResp?.data?.pagination?.total || 0
            : 0;
          const articleTotal = articleResp?.success
            ? articleResp?.data?.pagination?.total || 0
            : 0;

          setPendingVoiceCount(voiceTotal);
          setPendingArticleCount(articleTotal);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("Failed to fetch submission counts:", e);
          setPendingVoiceCount(0);
          setPendingArticleCount(0);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Initialize coin reward from localStorage to persist admin's chosen value until backend is wired
  useEffect(() => {
    // Load from backend; fallback to default if not available
    (async () => {
      try {
        const res = await getWtfCoinReward();
        const value = res?.data?.wtfCoinReward;
        if (typeof value === "number") setWtfCoinReward(value);
      } catch (e) {
        // silent fallback; UI keeps default 25
      }
    })();
  }, []);

  const fetchWtfData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch active pins
      const pinsResponse = await getActiveWtfPins({
        page: 1,
        limit: 20,
        type: filterType === "all" ? null : filterType,
        source: pinFilters.source === "all" ? null : pinFilters.source,
        pinType: pinFilters.pinType === "all" ? null : pinFilters.pinType,
        dateFrom: pinFilters.dateFrom || null,
        dateTo: pinFilters.dateTo || null,
      });
      if (pinsResponse.success && pinsResponse.data && pinsResponse.data.pins) {
        const pins = pinsResponse.data.pins;
        setActivePins(pins);
        setTotalItems(pinsResponse.data.pagination?.total || pins.length);
      } else {
        setActivePins([]);
        setTotalItems(0);
      }

      // Fetch submissions for review
      let fetchedSubmissions = [];
      try {
        const submissionsResponse = await getSubmissionsForReview({
          page: 1,
          limit: 20,
          type: submissionTab,
          isCoachSuggestion: false,
        });
        if (submissionsResponse.success) {
          fetchedSubmissions =
            (submissionsResponse.data &&
              submissionsResponse.data.submissions) ||
            [];
          setStudentSubmissions(fetchedSubmissions);
        } else {
          setStudentSubmissions([]);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
        setStudentSubmissions([]);
      }

      // Fetch coach suggestions
      let fetchedSuggestions = [];
      try {
        const coachSuggestionsResponse = await getCoachSuggestions({
          page: 1,
          limit: 20,
        });
        if (coachSuggestionsResponse.success) {
          fetchedSuggestions = coachSuggestionsResponse.data || [];
          // Use the real coach suggestions for the table
          setCoachSuggestions(fetchedSuggestions);
          // Keep legacy state for fallback metrics (optional)
          setPendingSuggestions(fetchedSuggestions);
        } else {
          setCoachSuggestions([]);
          setPendingSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching coach suggestions:", error);
        setCoachSuggestions([]);
        setPendingSuggestions([]);
      }

      // Fetch analytics
      const analyticsResponse = await getWtfAnalytics();
      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data || {});
      }

      // Fetch archived submissions (for both student submissions and coach suggestions)
      try {
        const archivedResp = await getArchivedSubmissions({
          page: 1,
          limit: 50,
        });
        if (archivedResp?.success) {
          setArchivedSubmissions(archivedResp.data?.submissions || []);
        } else {
          setArchivedSubmissions([]);
        }
      } catch (e) {
        setArchivedSubmissions([]);
      }

      // Calculate dashboard metrics after all data is fetched
      const totalActivePins = activePins.length;
      const totalCoachSuggestions = fetchedSuggestions.length;
      const totalStudentSubmissions = fetchedSubmissions.length;
      const totalEngagement =
        totalActivePins + totalCoachSuggestions + totalStudentSubmissions;

      setDashboardMetrics({
        activePins: totalActivePins,
        coachSuggestions: totalCoachSuggestions,
        studentSubmissions: totalStudentSubmissions,
        totalEngagement,
      });
    } catch (error) {
      console.error("Error fetching WTF data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh active pins with current filters
  const refreshActivePins = async () => {
    try {
      const params = {
        page: 1,
        limit: 20,
        type: filterType === "all" ? null : filterType,
        source: pinFilters.source === "all" ? null : pinFilters.source,
        pinType: pinFilters.pinType === "all" ? null : pinFilters.pinType,
        dateFrom: pinFilters.dateFrom || null,
        dateTo: pinFilters.dateTo || null,
      };

      const pinsResponse = await getActiveWtfPins(params);
      if (pinsResponse.success && pinsResponse.data && pinsResponse.data.pins) {
        setActivePins(pinsResponse.data.pins);
        setTotalItems(
          pinsResponse.data.pagination?.total || pinsResponse.data.pins.length
        );
        setCurrentPage(1); // Reset to first page
      } else {
        setActivePins([]);
        setTotalItems(0);
      }
    } catch (error) {
      console.error("Error refreshing active pins:", error);
      showToast("Error refreshing pins", "error");
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Volume2 className="w-4 h-4" />;
      case "text":
        return <FileText className="w-4 h-4" />;
      case "link":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleUnpin = async (pinId) => {
    if (window.confirm("Are you sure you want to unpin this content?")) {
      try {
        const response = await changeWtfPinStatus(pinId, "unpinned");
        if (response.success) {
          setActivePins((prev) =>
            prev.map((pin) =>
              pin._id === pinId ? { ...pin, status: "unpinned" } : pin
            )
          );

          // Refresh dashboard counts so the Active Pins card updates immediately
          try {
            const countsResp = await getWtfDashboardCounts();
            if (countsResp.success) {
              setDashboardMetrics(countsResp.data);
            } else {
              // Fallback optimistic update
              setDashboardMetrics((prev) => ({
                ...prev,
                activePins: Math.max(0, (prev.activePins || 1) - 1),
              }));
            }
          } catch (e) {
            setDashboardMetrics((prev) => ({
              ...prev,
              activePins: Math.max(0, (prev.activePins || 1) - 1),
            }));
          }
        }
      } catch (error) {
        console.error("Error unpinning pin:", error);
        setError("Failed to unpin content. Please try again.");
      }
    }
  };

  const handleDelete = async (pinId) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this pin? This action cannot be undone."
      )
    ) {
      try {
        const response = await deleteWtfPin(pinId);
        if (response.success) {
          setActivePins((prev) => prev.filter((pin) => pin._id !== pinId));
          // Refresh dashboard counts so the Active Pins card updates immediately
          try {
            const countsResp = await getWtfDashboardCounts();
            if (countsResp.success) {
              setDashboardMetrics(countsResp.data);
            } else {
              // Fallback optimistic update
              setDashboardMetrics((prev) => ({
                ...prev,
                activePins: Math.max(0, (prev.activePins || 1) - 1),
              }));
            }
          } catch (e) {
            setDashboardMetrics((prev) => ({
              ...prev,
              activePins: Math.max(0, (prev.activePins || 1) - 1),
            }));
          }
        }
      } catch (error) {
        console.error("Error deleting pin:", error);
        setError("Failed to delete pin. Please try again.");
      }
    }
  };

  const handleEdit = (pin) => {
    setSelectedPin(pin);
    setShowEditModal(true);
  };

  const handleCreatePin = async (newPin) => {
    const response = await createWtfPin(newPin);
    if (!response.success) {
      throw new Error(response.message || "Failed to create pin");
    }

    // If this was a draft being published, remove it from drafts
    if (editingDraft) {
      setEditingDraft(null);
    }

    setActivePins((prev) => [response.data, ...prev]);
    setShowCreateModal(false);

    // Refresh dashboard counts so the Active Pins card updates immediately
    try {
      const countsResp = await getWtfDashboardCounts();
      if (countsResp.success) {
        setDashboardMetrics(countsResp.data);
      } else {
        setDashboardMetrics((prev) => ({
          ...prev,
          activePins: (prev.activePins || 0) + 1,
        }));
      }
    } catch (e) {
      setDashboardMetrics((prev) => ({
        ...prev,
        activePins: (prev.activePins || 0) + 1,
      }));
    }
  };

  const handleSelectDraft = (draft) => {
    setEditingDraft(draft);
    setShowDraftsModal(false);
    setShowCreateModal(true);
  };

  const handleDraftDeleted = (draftId) => {
    // If we were editing this draft, clear it
    if (editingDraft && editingDraft._id === draftId) {
      setEditingDraft(null);
    }
  };

  const handleUpdatePin = async (updatedPin) => {
    try {
      const response = await updateWtfPin(updatedPin._id, updatedPin);
      if (response.success) {
        setActivePins((prev) =>
          prev.map((p) => (p._id === updatedPin._id ? response.data : p))
        );
        setShowEditModal(false);
        setSelectedPin(null);
      }
    } catch (error) {
      console.error("Error updating pin:", error);
      setError("Failed to update pin. Please try again.");
    }
  };

  const handleReviewSubmission = (submission) => {
    setSelectedSubmission(submission);
    setShowReviewModal(true);
  };

  const handlePinToWTF = async (submission) => {
    try {
      // First approve the submission
      const reviewResponse = await reviewSubmission(submission._id, {
        action: "approve",
        notes: "Approved and pinned to WTF",
      });

      if (reviewResponse.success) {
        // Backend already auto-creates a pin on approval and returns it as approvedPin
        const approvedPin = reviewResponse?.data?.approvedPin;
        if (approvedPin) {
          setActivePins((prev) => [approvedPin, ...prev]);
        }

        // Remove from submissions list and close modal
        setStudentSubmissions((prev) =>
          prev.filter((s) => s._id !== submission._id)
        );
        setShowReviewModal(false);
        setSelectedSubmission(null);

        // Refresh all data to ensure consistency across tabs
        try {
          // Refresh dashboard counts
          const countsResp = await getWtfDashboardCounts();
          if (countsResp.success) {
            setDashboardMetrics(countsResp.data);
          } else if (approvedPin) {
            setDashboardMetrics((prev) => ({
              ...prev,
              activePins: (prev.activePins || 0) + 1,
            }));
          }

          // Refresh active pins list to ensure Pin Management tab shows updated data
          const pinsResponse = await getActiveWtfPins({
            page: 1,
            limit: 20,
            type: filterType === "all" ? null : filterType,
          });
          if (
            pinsResponse.success &&
            pinsResponse.data &&
            pinsResponse.data.pins
          ) {
            setActivePins(pinsResponse.data.pins);
            setTotalItems(
              pinsResponse.data.pagination?.total ||
                pinsResponse.data.pins.length
            );
          }

          // Refresh submission counts for the current tab
          if (submissionTab === "voice" || submissionTab === "article") {
            const submissionsResponse = await getSubmissionsForReview({
              page: 1,
              limit: 20,
              type: submissionTab,
              isCoachSuggestion: false,
            });
            if (submissionsResponse.success) {
              const updatedSubmissions =
                submissionsResponse.data?.submissions || [];
              setStudentSubmissions(updatedSubmissions);

              // Update pending counts
              if (submissionTab === "voice") {
                setPendingVoiceCount(
                  updatedSubmissions.filter(
                    (s) => (s.status || "").toString() === "pending"
                  ).length
                );
              } else {
                setPendingArticleCount(
                  updatedSubmissions.filter(
                    (s) => (s.status || "").toString() === "pending"
                  ).length
                );
              }
            }
          }

          // Refresh coach suggestions if we're on that tab
          if (activeTab === "coach-suggestions") {
            const coachSuggestionsResponse = await getCoachSuggestions({
              page: 1,
              limit: 20,
            });
            if (coachSuggestionsResponse.success) {
              const fetchedSuggestions = coachSuggestionsResponse.data || [];
              setCoachSuggestions(fetchedSuggestions);
              setPendingSuggestions(fetchedSuggestions);
            }
          }
        } catch (e) {
          console.error("Error refreshing data after pin approval:", e);
          // Fallback optimistic updates if refresh fails
          if (approvedPin) {
            setDashboardMetrics((prev) => ({
              ...prev,
              activePins: (prev.activePins || 0) + 1,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error pinning submission to WTF:", error);
      setError("Failed to pin submission to WTF. Please try again.");
    }
  };

  const handleArchiveSubmission = async (submissionId) => {
    try {
      const response = await reviewSubmission(submissionId, {
        action: "archive",
        notes: "Archived by admin",
      });

      if (response.success) {
        setStudentSubmissions((prev) =>
          prev.filter((s) => s._id !== submissionId)
        );
        setShowReviewModal(false);
        setSelectedSubmission(null);

        // Refresh unified dashboard counts so the badge updates immediately
        try {
          const countsResp = await getWtfDashboardCounts();
          if (countsResp?.success) {
            setDashboardMetrics(countsResp.data);
          }
        } catch (e) {
          // Fallback optimistic decrement if counts API fails
          setDashboardMetrics((prev) => ({
            ...prev,
            studentSubmissions: Math.max(0, (prev.studentSubmissions || 1) - 1),
          }));
        }

        // Refresh per-tab pending counts and archive list
        try {
          const [voiceResp, articleResp, archivedResp] = await Promise.all([
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "voice",
              isCoachSuggestion: false,
            }),
            getSubmissionsForReview({
              page: 1,
              limit: 1,
              type: "article",
              isCoachSuggestion: false,
            }),
            getArchivedSubmissions({ page: 1, limit: 50 }),
          ]);

          const voiceTotal = voiceResp?.success
            ? voiceResp?.data?.pagination?.total || 0
            : 0;
          const articleTotal = articleResp?.success
            ? articleResp?.data?.pagination?.total || 0
            : 0;

          setPendingVoiceCount(voiceTotal);
          setPendingArticleCount(articleTotal);
          if (archivedResp?.success) {
            setArchivedSubmissions(archivedResp.data?.submissions || []);
          }
        } catch (e) {
          // If refresh fails, adjust the count for the active tab optimistically
          setPendingVoiceCount((prev) =>
            submissionTab === "voice" ? Math.max(0, (prev || 1) - 1) : prev
          );
          setPendingArticleCount((prev) =>
            submissionTab === "article" ? Math.max(0, (prev || 1) - 1) : prev
          );
        }
      }
    } catch (error) {
      console.error("Error archiving submission:", error);
      setError("Failed to archive submission. Please try again.");
    }
  };

  // Coach Suggestions Data
  const [coachSuggestions, setCoachSuggestions] = useState([]);
  const archivedCoachSuggestions = coachSuggestions.filter(
    (s) => (s?.status ?? "").toString().toLowerCase() !== "pending"
  );

  const handleReviewCoachSuggestion = (suggestion) => {
    setSelectedCoachSuggestion(suggestion);
    setShowCoachSuggestionModal(true);
  };

  const handlePinCoachSuggestion = async (suggestion) => {
    try {
      // Approve (pin) via backend; this also creates the WTF pin server-side
      const response = await reviewSubmission(suggestion._id || suggestion.id, {
        action: "approve",
        notes: "Approved and pinned to WTF",
      });

      if (response && response.success) {
        // Remove the suggestion from the pending list
        setCoachSuggestions((prev) =>
          prev.filter(
            (s) => (s._id || s.id) !== (suggestion._id || suggestion.id)
          )
        );

        // If backend returned the created pin, prepend it; else refetch active pins
        const approvedPin = response.data?.approvedPin;
        if (approvedPin) {
          setActivePins((prev) => [approvedPin, ...prev]);
        } else {
          try {
            const pinsResp = await getActiveWtfPins();
            if (pinsResp.success && pinsResp.data?.pins) {
              setActivePins(pinsResp.data.pins);
            }
          } catch (e) {
            console.error("Failed to refresh active pins:", e);
          }
        }

        // Refresh all data to ensure consistency across tabs
        try {
          // Refresh dashboard counts using the unified counts API
          const countsResp = await getWtfDashboardCounts();
          if (countsResp.success) {
            setDashboardMetrics(countsResp.data);
          } else {
            // Fallback update if counts API fails
            setDashboardMetrics((prev) => ({
              ...prev,
              activePins: (prev.activePins || 0) + 1,
              coachSuggestions: Math.max(0, (prev.coachSuggestions || 1) - 1),
            }));
          }

          // Refresh active pins list to ensure Pin Management tab shows updated data
          const pinsResponse = await getActiveWtfPins({
            page: 1,
            limit: 20,
            type: filterType === "all" ? null : filterType,
          });
          if (
            pinsResponse.success &&
            pinsResponse.data &&
            pinsResponse.data.pins
          ) {
            setActivePins(pinsResponse.data.pins);
            setTotalItems(
              pinsResponse.data.pagination?.total ||
                pinsResponse.data.pins.length
            );
          }

          // Refresh coach suggestions list
          const coachSuggestionsResponse = await getCoachSuggestions({
            page: 1,
            limit: 20,
          });
          if (coachSuggestionsResponse.success) {
            const fetchedSuggestions = coachSuggestionsResponse.data || [];
            setCoachSuggestions(fetchedSuggestions);
            setPendingSuggestions(fetchedSuggestions);
          }

          // Refresh submission counts if we're on the submissions tab
          if (activeTab === "submissions") {
            const submissionsResponse = await getSubmissionsForReview({
              page: 1,
              limit: 20,
              type: submissionTab,
              isCoachSuggestion: false,
            });
            if (submissionsResponse.success) {
              const updatedSubmissions =
                submissionsResponse.data?.submissions || [];
              setStudentSubmissions(updatedSubmissions);

              // Update pending counts
              if (submissionTab === "voice") {
                setPendingVoiceCount(
                  updatedSubmissions.filter(
                    (s) => (s.status || "").toString() === "pending"
                  ).length
                );
              } else {
                setPendingArticleCount(
                  updatedSubmissions.filter(
                    (s) => (s.status || "").toString() === "pending"
                  ).length
                );
              }
            }
          }
        } catch (e) {
          console.error(
            "Error refreshing data after coach suggestion approval:",
            e
          );
          // Fallback optimistic updates if refresh fails
          setDashboardMetrics((prev) => ({
            ...prev,
            activePins: (prev.activePins || 0) + 1,
            coachSuggestions: Math.max(0, (prev.coachSuggestions || 1) - 1),
          }));
        }
      }
    } catch (error) {
      console.error("Error pinning coach suggestion:", error);
    } finally {
      setShowCoachSuggestionModal(false);
      setSelectedCoachSuggestion(null);
    }
  };

  const handleArchiveCoachSuggestion = async (suggestionId) => {
    try {
      const response = await reviewSubmission(suggestionId, {
        action: "archive",
        notes: "Archived by admin",
      });

      if (response && response.success) {
        setCoachSuggestions((prev) =>
          prev.filter((s) => s.id !== suggestionId)
        );
        setDashboardMetrics((prev) => ({
          ...prev,
          coachSuggestions: Math.max(0, (prev.coachSuggestions || 1) - 1),
        }));
        try {
          const [archivedResp, suggestionsResp, countsResp] = await Promise.all(
            [
              getArchivedSubmissions({ page: 1, limit: 50 }),
              getCoachSuggestions({ page: 1, limit: 20 }),
              getWtfDashboardCounts(),
            ]
          );
          if (archivedResp?.success) {
            setArchivedSubmissions(archivedResp.data?.submissions || []);
          }
          if (suggestionsResp?.success) {
            setCoachSuggestions(suggestionsResp.data || []);
          }
          if (countsResp?.success) {
            setDashboardMetrics(countsResp.data);
          }
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error archiving coach suggestion:", error);
    } finally {
      setShowCoachSuggestionModal(false);
      setSelectedCoachSuggestion(null);
    }
  };

  const filteredPins = Array.isArray(activePins)
    ? activePins.filter((pin) => {
        const matchesSearch =
          pin.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pin.caption?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === "all" || pin.type === filterType;
        return matchesSearch && matchesFilter && pin.status === "active";
      })
    : [];

  // Pagination logic
  const paginatedPins = useMemo(() => {
    if (isReordering) return filteredPins;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPins.slice(startIndex, endIndex);
  }, [filteredPins, currentPage, itemsPerPage, isReordering]);

  const totalPages = Math.ceil(filteredPins.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  // Drag and drop: compute new order and persist
  const onDragEnd = async (result) => {
    const { source, destination } = result || {};
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    // Work on a copy of the currently displayed list (when reordering, this is all filtered pins)
    const workingList = Array.from(paginatedPins);
    const [moved] = workingList.splice(source.index, 1);
    workingList.splice(destination.index, 0, moved);

    // Rebuild activePins preserving non-filtered order, replacing filtered subset with workingList order
    const reorderedIds = new Set(workingList.map((p) => p._id));
    const rebuilt = activePins.map((p) => (reorderedIds.has(p._id) ? null : p));
    // Fill nulls by iterating and placing reordered items in sequence where they originally appeared
    let insertIdx = 0;
    const finalList = rebuilt.map((p) => {
      if (p === null) {
        const next = workingList[insertIdx];
        insertIdx += 1;
        return next;
      }
      return p;
    });

    setActivePins(finalList);

    // Persist full active pins order to backend so all visible active items get positions
    try {
      const orderedPinIds = finalList
        .filter((p) => p?.status === "active")
        .map((p) => p._id);
      await reorderWtfPins(orderedPinIds);
      showToast("Pins reordered", "success");
    } catch (e) {
      console.error("Failed to persist pin order", e);
      showToast("Failed to save order", "error");
    }
  };

  // Update total items when filtered pins change
  useEffect(() => {
    setTotalItems(filteredPins.length);
  }, [filteredPins]);

  // Coach suggestions pagination logic
  const paginatedCoachSuggestions = useMemo(() => {
    if (!Array.isArray(coachSuggestions)) return [];
    const pendingSuggestions = coachSuggestions.filter(
      (s) => (s?.status ?? "").toString().toLowerCase() === "pending"
    );
    const startIndex = (coachSuggestionsPage - 1) * coachSuggestionsPerPage;
    const endIndex = startIndex + coachSuggestionsPerPage;
    return pendingSuggestions.slice(startIndex, endIndex);
  }, [coachSuggestions, coachSuggestionsPage, coachSuggestionsPerPage]);

  const totalCoachSuggestionsPages = Math.ceil(
    (Array.isArray(coachSuggestions)
      ? coachSuggestions.filter(
          (s) => (s?.status ?? "").toString().toLowerCase() === "pending"
        ).length
      : 0) / coachSuggestionsPerPage
  );

  // Student submissions pagination logic
  // Keep for future use; currently not used directly in the UI
  const paginatedStudentSubmissions = useMemo(() => {
    if (!Array.isArray(studentSubmissions)) return [];
    const startIndex = (submissionsPage - 1) * submissionsPerPage;
    const endIndex = startIndex + submissionsPerPage;
    return studentSubmissions.slice(startIndex, endIndex);
  }, [studentSubmissions, submissionsPage, submissionsPerPage]);

  const totalSubmissionsPages = Math.ceil(
    (Array.isArray(studentSubmissions) ? studentSubmissions.length : 0) /
      submissionsPerPage
  );

  const newSubmissionsCount =
    (dashboardMetrics?.studentSubmissions ?? 0) > 0
      ? dashboardMetrics.studentSubmissions
      : (pendingVoiceCount || 0) + (pendingArticleCount || 0);
  const pendingCoachSuggestionsCount = Array.isArray(coachSuggestions)
    ? coachSuggestions.filter(
        (s) => (s?.status ?? "").toString().toLowerCase() === "pending"
      ).length
    : 0; // Real data from API

  return (
    <div
      className="min-h-screen p-6 w-full pb-8 transition-all duration-300"
      style={getBackgroundStyle()}
    >
      <div className="max-w-screen-xl mx-auto pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold flex items-center gap-3"
              style={{ color: getBackgroundStyle()?.color }}
            >
              <Star className="w-8 h-8 text-yellow-500" />
              WTF Management Dashboard
            </h1>
            <p className="mt-2" style={{ color: getBackgroundStyle()?.color }}>
              Curate and manage Wall of Fame content
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onToggleView && (
              <Button
                onClick={onToggleView}
                variant="outline"
                className="text-gray-600 hover:text-gray-900"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Wall of Fame
              </Button>
            )}
            <Button
              onClick={() => {
                fetchWtfData();
                showToast("Refreshing data...", "info");
              }}
              variant="outline"
              className="text-gray-600 hover:text-gray-900"
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            {user?.role === "admin" && (
              <Button
                onClick={() => setShowDraftsModal(true)}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                Check Drafts
              </Button>
            )}
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Pin
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Pins</p>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardMetrics.activePins}
                </div>
                <p className="text-xs text-gray-500 mt-1">of 20 maximum</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Coach Suggestions
                </p>
                <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
                  {dashboardMetrics.coachSuggestions}
                  {dashboardMetrics.coachSuggestions > 0 && (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">from coaches</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Student Submissions
                </p>
                <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                  {dashboardMetrics.studentSubmissions}
                  {dashboardMetrics.studentSubmissions > 0 && (
                    <Bell className="w-4 h-4" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">awaiting review</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Engagement
                </p>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardMetrics.totalEngagement}
                </div>
                <p className="text-xs text-gray-500 mt-1">total views</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ThumbsUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow border">
          <div className="border-b">
            <div className="flex space-x-8 p-6">
              {[
                { id: "dashboard", label: "Pin Management", count: null },
                {
                  id: "coach-suggestions",
                  label: "Coach Suggestions",
                  count:
                    pendingCoachSuggestionsCount > 0
                      ? pendingCoachSuggestionsCount
                      : null,
                },
                {
                  id: "submissions",
                  label: "Student Submissions",
                  count: newSubmissionsCount > 0 ? newSubmissionsCount : null,
                },
                { id: "archive", label: "Archive", count: null },
                {
                  id: "background-settings",
                  label: "Background Settings",
                  count: null,
                },
                {
                  id: "coin-rules",
                  label: "ISF Coin Rules",
                  count: null,
                },
                {
                  id: "coin-transactions",
                  label: "Student Coin Transactions",
                  count: null,
                },
                { id: "analytics", label: "Analytics", count: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.count && tab.count > 0 && (
                    <Badge
                      className={`text-xs ${
                        tab.id === "coach-suggestions"
                          ? "bg-orange-500 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "dashboard" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Active WTF Pins</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search pins..."
                        value={searchTerm}
                        onChange={async (e) => {
                          const newSearchTerm = e.target.value;
                          setSearchTerm(newSearchTerm);
                          // Refresh active pins to ensure search results are current
                          try {
                            const pinsResponse = await getActiveWtfPins({
                              page: 1,
                              limit: 20,
                              type: filterType === "all" ? null : filterType,
                              source:
                                pinFilters.source === "all"
                                  ? null
                                  : pinFilters.source,
                              pinType:
                                pinFilters.pinType === "all"
                                  ? null
                                  : pinFilters.pinType,
                              dateFrom: pinFilters.dateFrom || null,
                              dateTo: pinFilters.dateTo || null,
                            });
                            if (
                              pinsResponse.success &&
                              pinsResponse.data &&
                              pinsResponse.data.pins
                            ) {
                              setActivePins(pinsResponse.data.pins);
                              setTotalItems(
                                pinsResponse.data.pagination?.total ||
                                  pinsResponse.data.pins.length
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error refreshing pins for search:",
                              error
                            );
                          }
                        }}
                        className="pl-14 pr-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        style={{
                          width: "300px",
                          minWidth: "300px",
                          textIndent: "28px",
                        }}
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={async (e) => {
                        const newFilterType = e.target.value;
                        setFilterType(newFilterType);
                        // Refresh active pins with new filter
                        try {
                          const pinsResponse = await getActiveWtfPins({
                            page: 1,
                            limit: 20,
                            type:
                              newFilterType === "all" ? null : newFilterType,
                            source:
                              pinFilters.source === "all"
                                ? null
                                : pinFilters.source,
                            pinType:
                              pinFilters.pinType === "all"
                                ? null
                                : pinFilters.pinType,
                            dateFrom: pinFilters.dateFrom || null,
                            dateTo: pinFilters.dateTo || null,
                          });
                          if (
                            pinsResponse.success &&
                            pinsResponse.data &&
                            pinsResponse.data.pins
                          ) {
                            setActivePins(pinsResponse.data.pins);
                            setTotalItems(
                              pinsResponse.data.pagination?.total ||
                                pinsResponse.data.pins.length
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Error refreshing pins with filter:",
                            error
                          );
                        }
                      }}
                      className="px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-32"
                    >
                      <option value="all">All Types</option>
                      <option value="text">Text</option>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="audio">Audio</option>
                      <option value="link">Link</option>
                    </select>
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Filters
                    </h4>
                    <button
                      onClick={() => {
                        setPinFilters({
                          source: "all",
                          pinType: "all",
                          dateFrom: "",
                          dateTo: "",
                        });
                        // Refresh with cleared filters
                        refreshActivePins();
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear Filters
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Source
                      </label>
                      <select
                        value={pinFilters.source}
                        onChange={(e) => {
                          setPinFilters((prev) => ({
                            ...prev,
                            source: e.target.value,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="all">All Sources</option>
                        <option value="wtf">WTF Content</option>
                        <option value="official">Official Content</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pin Type
                      </label>
                      <select
                        value={pinFilters.pinType}
                        onChange={(e) => {
                          setPinFilters((prev) => ({
                            ...prev,
                            pinType: e.target.value,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="all">All Pin Types</option>
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="link">Link</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date From
                      </label>
                      <input
                        type="date"
                        value={pinFilters.dateFrom}
                        onChange={(e) => {
                          setPinFilters((prev) => ({
                            ...prev,
                            dateFrom: e.target.value,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date To
                      </label>
                      <input
                        type="date"
                        value={pinFilters.dateTo}
                        onChange={(e) => {
                          setPinFilters((prev) => ({
                            ...prev,
                            dateTo: e.target.value,
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={refreshActivePins}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>

                                {/* Table and Related Elements */}
                <div>
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="pins-table">
                        {(provided) => (
                          <table className="w-full" ref={provided.innerRef} {...provided.droppableProps}>
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Content
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Type
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Author
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Pinned Date
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Expires
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Engagement
                                </th>
                                <th className="text-left py-3 px-4 font-medium text-gray-900">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedPins.map((pin, index) => (
                                <Draggable
                                  key={pin._id}
                                  draggableId={pin._id}
                                  index={index}
                                >
                                  {(draggableProvided, snapshot) => (
                                    <tr
                                      ref={draggableProvided.innerRef}
                                      {...draggableProvided.draggableProps}
                                      {...draggableProvided.dragHandleProps}
                                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                                        snapshot.isDragging
                                          ? "bg-purple-50"
                                          : ""
                                      }`}
                                    >
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                          {pin.thumbnail ? (
                                            <img
                                              src={pin.thumbnail}
                                              alt=""
                                              className="w-10 h-10 rounded object-cover"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded border border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                                              {getContentTypeIcon(
                                                pin.type
                                              )}
                                            </div>
                                          )}
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {pin.title}
                                            </div>
                                            {pin.caption && (
                                              <div className="text-sm text-gray-500">
                                                {pin.caption}
                                              </div>
                                            )}
                                            {pin.isOfficial && (
                                              <Badge className="mt-1 bg-purple-100 text-purple-800">
                                                ISF Official
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                          {getContentTypeIcon(pin.type)}
                                          <span className="capitalize text-gray-700">
                                            {pin.type}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4">
                                        <div>
                                          <div className="font-medium text-gray-900">
                                            {pin.author?.name || "Admin"}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            by{" "}
                                            {pin.author?.name || "Admin"}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4 text-gray-700">
                                        {new Date(
                                          pin.createdAt
                                        ).toLocaleDateString()}
                                      </td>
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-1 text-orange-600">
                                          <Clock className="w-4 h-4" />
                                          <span className="text-sm">
                                            {new Date(
                                              pin.expiresAt
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-4 text-sm">
                                          <div className="flex items-center gap-1">
                                            <Eye className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-700">
                                              {pin.engagementMetrics
                                                ?.seen || 0}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Heart className="w-4 h-4 text-green-600" />
                                            <span className="text-gray-700">
                                              {pin.engagementMetrics
                                                ?.loves ?? 0}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <ThumbsUp className="w-4 h-4 text-blue-500" />
                                            <span className="text-gray-700">
                                              {pin.engagementMetrics
                                                ?.likes ?? 0}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleEdit(pin)
                                            }
                                            className="text-gray-600 hover:text-gray-900"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleUnpin(pin._id)
                                            }
                                            className="text-gray-600 hover:text-gray-900"
                                          >
                                            <Archive className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handleDelete(pin._id)
                                            }
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </tbody>
                          </table>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>

                  {/* Pagination Controls */}
                  {filteredPins.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-700">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                          {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                          {totalItems} results
                        </div>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: totalPages },
                            (_, i) => i + 1
                          ).map((page) => (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="px-3 py-1 min-w-[40px]"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* No Data State */}
                  {filteredPins.length === 0 && (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                        <div className="text-6xl mb-4">📌</div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                          No Active Pins Yet
                        </h3>
                        <p className="text-gray-600 mb-6">
                          The Wall of Fame is waiting for amazing content!
                          Create the first pin to get started, or review pending
                          submissions to add them to the Wall of Fame.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create First Pin
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("coach-suggestions")}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review Submissions
                          </Button>
                        </div>
                        <div className="text-sm text-gray-500 mt-4">
                          💡 Tip: You can also review student submissions and
                          coach suggestions to add content to the Wall of Fame
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "archive" && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Archive className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Archived Items</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Unarchive coach suggestions and student submissions to return
                  them to the review queues.
                </p>
                <div className="overflow-x-auto bg-white rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Title
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Details
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Archived On
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivedSubmissions
                        .slice(
                          (archivedPage - 1) * archivedPerPage,
                          archivedPage * archivedPerPage
                        )
                        .map((item) => {
                          const isCoachSuggestion =
                            item?.metadata?.isCoachSuggestion === true;
                          const typeLabel =
                            item.type === "voice" ? "Voice" : "Article";
                          const archivedAt =
                            item.updatedAt || item.reviewedAt || item.createdAt;
                          return (
                            <tr
                              key={item._id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium text-gray-900">
                                  {item.title}
                                </div>
                                {isCoachSuggestion && (
                                  <Badge className="mt-1 bg-orange-100 text-orange-800">
                                    Coach Suggestion
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {getContentTypeIcon(
                                    item.type === "voice" ? "audio" : "text"
                                  )}
                                  <span className="text-gray-700">
                                    {typeLabel}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {isCoachSuggestion ? (
                                  <div className="space-y-1">
                                    <div>
                                      Coach:{" "}
                                      {item?.metadata?.suggestedBy || "Coach"}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Student: {item?.studentName || "-"}
                                      {item?.balagruha
                                        ? ` (${item.balagruha})`
                                        : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div>
                                      Student: {item?.studentName || "-"}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Balagruha: {item?.balagruha || "-"}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {archivedAt
                                  ? new Date(archivedAt).toLocaleDateString()
                                  : "-"}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const resp = await unarchiveSubmission(
                                        item._id
                                      );
                                      if (resp?.success) {
                                        setArchivedSubmissions((prev) =>
                                          prev.filter((s) => s._id !== item._id)
                                        );
                                        // Optionally, refresh queues
                                        await fetchWtfData();
                                      }
                                    } catch (e) {
                                      console.error("Failed to unarchive:", e);
                                      setError(
                                        "Failed to unarchive. Please try again."
                                      );
                                    }
                                  }}
                                >
                                  Unarchive
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      {archivedSubmissions.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-gray-600"
                          >
                            No archived items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {archivedSubmissions.length > 0 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="text-sm text-gray-700">
                        Showing {(archivedPage - 1) * archivedPerPage + 1} to{" "}
                        {Math.min(
                          archivedPage * archivedPerPage,
                          archivedSubmissions.length
                        )}{" "}
                        of {archivedSubmissions.length} results
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setArchivedPage(Math.max(1, archivedPage - 1))
                          }
                          disabled={archivedPage === 1}
                          className="px-3 py-1"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setArchivedPage(archivedPage + 1)}
                          disabled={
                            archivedPage * archivedPerPage >=
                            archivedSubmissions.length
                          }
                          className="px-3 py-1"
                        >
                          Next
                        </Button>
                        <select
                          value={archivedPerPage}
                          onChange={(e) => {
                            setArchivedPerPage(Number(e.target.value));
                            setArchivedPage(1);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "coach-suggestions" && (
              <div className="space-y-6">
                {/* Coach Suggestions Queue */}
                <div className="bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">
                      Coach Suggestions for WTF (
                      {
                        coachSuggestions.filter(
                          (s) =>
                            (s?.status ?? "").toString().toLowerCase() ===
                            "pending"
                        ).length
                      }{" "}
                      Pending)
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Review student work suggested by coaches for the Wall of
                    Fame
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Student Work
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Work Type
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Student & Balagruha
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Suggested By
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCoachSuggestions.map((suggestion) => (
                          <tr
                            key={suggestion.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-start gap-3">
                                {suggestion.thumbnail ? (
                                  <img
                                    src={suggestion.thumbnail}
                                    alt=""
                                    className="w-12 h-12 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded border border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400">
                                    {getContentTypeIcon(suggestion.type)}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">
                                    {suggestion.title}
                                  </div>
                                  <div className="text-sm text-gray-500 line-clamp-2">
                                    {suggestion.content.length > 100
                                      ? `${suggestion.content.substring(
                                          0,
                                          100
                                        )}...`
                                      : suggestion.content}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                                <FileText className="w-3 h-3" />
                                {suggestion.workType}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                <div className="font-medium flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {suggestion.studentName}
                                </div>
                                <div className="text-gray-500">
                                  {suggestion.balagruha}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm">
                                <div className="font-medium">
                                  {suggestion.coachName}
                                </div>
                                <div className="text-gray-500">Coach</div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Calendar className="w-3 h-3" />
                                {new Date(
                                  suggestion.suggestedDate
                                ).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() =>
                                    handleReviewCoachSuggestion(suggestion)
                                  }
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review & Pin
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleArchiveCoachSuggestion(
                                      suggestion._id || suggestion.id
                                    )
                                  }
                                >
                                  <Archive className="w-4 h-4 mr-1" />
                                  Archive
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Coach Suggestions Pagination Controls */}
                    {Array.isArray(coachSuggestions) &&
                      coachSuggestions.filter((s) => s.status === "PENDING")
                        .length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700">
                              Showing{" "}
                              {(coachSuggestionsPage - 1) *
                                coachSuggestionsPerPage +
                                1}{" "}
                              to{" "}
                              {Math.min(
                                coachSuggestionsPage * coachSuggestionsPerPage,
                                coachSuggestions.filter(
                                  (s) =>
                                    (s?.status ?? "")
                                      .toString()
                                      .toLowerCase() === "pending"
                                ).length
                              )}{" "}
                              of{" "}
                              {
                                coachSuggestions.filter(
                                  (s) =>
                                    (s?.status ?? "")
                                      .toString()
                                      .toLowerCase() === "pending"
                                ).length
                              }{" "}
                              results
                            </div>
                            <select
                              value={coachSuggestionsPerPage}
                              onChange={(e) => {
                                setCoachSuggestionsPerPage(
                                  Number(e.target.value)
                                );
                                setCoachSuggestionsPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value={5}>5 per page</option>
                              <option value={10}>10 per page</option>
                              <option value={20}>20 per page</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCoachSuggestionsPage(
                                  coachSuggestionsPage - 1
                                )
                              }
                              disabled={coachSuggestionsPage === 1}
                              className="px-3 py-1"
                            >
                              Previous
                            </Button>

                            <div className="flex items-center gap-1">
                              {totalCoachSuggestionsPages > 0 &&
                                Array.from(
                                  { length: totalCoachSuggestionsPages },
                                  (_, i) => i + 1
                                ).map((page) => (
                                  <Button
                                    key={page}
                                    variant={
                                      coachSuggestionsPage === page
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      setCoachSuggestionsPage(page)
                                    }
                                    className="px-3 py-1 min-w-[40px]"
                                  >
                                    {page}
                                  </Button>
                                ))}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCoachSuggestionsPage(
                                  coachSuggestionsPage + 1
                                )
                              }
                              disabled={
                                coachSuggestionsPage ===
                                totalCoachSuggestionsPages
                              }
                              className="px-3 py-1"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* No Coach Suggestions State */}
                    {coachSuggestions.filter(
                      (s) =>
                        (s?.status ?? "").toString().toLowerCase() === "pending"
                    ).length === 0 && (
                      <div className="text-center py-12">
                        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                          <div className="text-6xl mb-4">🎯</div>
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            No Coach Suggestions Yet
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Coaches haven't suggested any student work for the
                            Wall of Fame yet. When they do, you'll see them here
                            for review.
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              onClick={() => setShowCreateModal(true)}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Pin Manually
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("submissions")}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Check Student Submissions
                            </Button>
                          </div>
                          <div className="text-sm text-gray-500 mt-4">
                            💡 Tip: Coaches can suggest exceptional student work
                            to be featured on the Wall of Fame
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                {archivedCoachSuggestions.length > 0 && (
                  <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h3 className="text-lg font-semibold">
                        Recent Coach Suggestion Activity
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {archivedCoachSuggestions
                        .slice(0, 5)
                        .map((suggestion) => (
                          <div
                            key={suggestion._id || suggestion.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  suggestion.status === "PINNED"
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                              />
                              <div>
                                <span className="font-medium">
                                  {suggestion.title}
                                </span>
                                <span className="text-gray-500 text-sm ml-2">
                                  by {suggestion.studentName} • suggested by{" "}
                                  {suggestion.coachName}
                                </span>
                              </div>
                            </div>
                            <Badge
                              className={
                                (suggestion?.status ?? "")
                                  .toString()
                                  .toLowerCase() === "approved"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {(suggestion?.status ?? "")
                                .toString()
                                .toLowerCase() === "approved"
                                ? "Pinned"
                                : "Archived"}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">
                      How Coach Suggestions Work
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      • Coaches can suggest student work by clicking the
                      "Suggest for WTF" button while reviewing assignments
                    </div>
                    <div>
                      • Suggested content appears here for admin review and
                      approval
                    </div>
                    <div>
                      • Clicking "Review & Pin" will feature the content on the
                      Wall of Fame
                    </div>
                    <div>
                      • Both the student and suggesting coach receive
                      notifications when content is pinned
                    </div>
                    <div>
                      • Students earn ISF coins when their work is featured
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "submissions" && (
              <div className="space-y-6">
                {/* Student Submissions Queue */}
                <div className="bg-white">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">
                      Student Submissions Queue
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Review student-submitted voice notes and articles for
                    potential WTF featuring
                  </p>

                  {/* Sub-tabs */}
                  <div className="flex space-x-1 mb-6">
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        submissionTab === "voice"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={async () => {
                        setSubmissionTab("voice");
                        // Refresh data for voice tab
                        try {
                          const submissionsResponse =
                            await getSubmissionsForReview({
                              page: 1,
                              limit: 20,
                              type: "voice",
                              isCoachSuggestion: false,
                            });
                          if (submissionsResponse.success) {
                            const fetchedSubmissions =
                              submissionsResponse.data?.submissions || [];
                            setStudentSubmissions(fetchedSubmissions);
                            setPendingVoiceCount(
                              fetchedSubmissions.filter(
                                (s) => (s.status || "").toString() === "pending"
                              ).length
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Error refreshing voice submissions:",
                            error
                          );
                        }
                      }}
                    >
                      ▷ Voice Notes
                      {pendingVoiceCount > 0 ? (
                        <Badge className="ml-2 bg-red-500 text-white text-xs">
                          {pendingVoiceCount}
                        </Badge>
                      ) : null}
                    </button>
                    <button
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        submissionTab === "article"
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={async () => {
                        setSubmissionTab("article");
                        // Refresh data for article tab
                        try {
                          const submissionsResponse =
                            await getSubmissionsForReview({
                              page: 1,
                              limit: 20,
                              type: "article",
                              isCoachSuggestion: false,
                            });
                          if (submissionsResponse.success) {
                            const fetchedSubmissions =
                              submissionsResponse.data?.submissions || [];
                            setStudentSubmissions(fetchedSubmissions);
                            setPendingArticleCount(
                              fetchedSubmissions.filter(
                                (s) => (s.status || "").toString() === "pending"
                              ).length
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Error refreshing article submissions:",
                            error
                          );
                        }
                      }}
                    >
                      Articles
                      {pendingArticleCount > 0 ? (
                        <Badge className="ml-2 bg-red-500 text-white text-xs">
                          {pendingArticleCount}
                        </Badge>
                      ) : null}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    {submissionTab === "voice" ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Voice Note
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Student
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Balagruha
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Submitted
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(studentSubmissions)
                            ? studentSubmissions.filter(
                                (s) =>
                                  [
                                    "pending",
                                    "reviewed",
                                    "considered",
                                  ].includes((s.status || "").toString()) &&
                                  s.type === "voice"
                              )
                            : []
                          ).map((submission) => (
                            <tr
                              key={submission._id || submission.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-4 px-4">
                                <div className="font-medium">
                                  {submission.title}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm">
                                  {submission.studentName}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm">
                                  {submission.balagruha}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(
                                    submission.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge className="bg-green-100 text-green-800">
                                  {submission.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() =>
                                      handleReviewSubmission(submission)
                                    }
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Review
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleArchiveSubmission(
                                        submission._id || submission.id
                                      )
                                    }
                                  >
                                    <Archive className="w-4 h-4 mr-1" />
                                    Archive
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Article
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Student
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Balagruha
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Submitted
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(studentSubmissions)
                            ? studentSubmissions.filter(
                                (s) =>
                                  [
                                    "pending",
                                    "reviewed",
                                    "considered",
                                  ].includes((s.status || "").toString()) &&
                                  s.type === "article"
                              )
                            : []
                          ).map((submission) => (
                            <tr
                              key={submission._id || submission.id}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="py-4 px-4">
                                <div className="font-medium">
                                  {submission.title}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm">
                                  {submission.studentName}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="text-sm">
                                  {submission.balagruha}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(
                                    submission.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge className="bg-green-100 text-green-800">
                                  {submission.status}
                                </Badge>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() =>
                                      handleReviewSubmission(submission)
                                    }
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    Review
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleArchiveSubmission(
                                        submission._id || submission.id
                                      )
                                    }
                                  >
                                    <Archive className="w-4 h-4 mr-1" />
                                    Archive
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Student Submissions Pagination Controls */}
                    {Array.isArray(studentSubmissions) &&
                      studentSubmissions.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700">
                              Showing{" "}
                              {(submissionsPage - 1) * submissionsPerPage + 1}{" "}
                              to{" "}
                              {Math.min(
                                submissionsPage * submissionsPerPage,
                                studentSubmissions.length
                              )}{" "}
                              of {studentSubmissions.length} results
                            </div>
                            <select
                              value={submissionsPerPage}
                              onChange={(e) => {
                                setSubmissionsPerPage(Number(e.target.value));
                                setSubmissionsPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value={5}>5 per page</option>
                              <option value={10}>10 per page</option>
                              <option value={20}>20 per page</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSubmissionsPage(submissionsPage - 1)
                              }
                              disabled={submissionsPage === 1}
                              className="px-3 py-1"
                            >
                              Previous
                            </Button>

                            <div className="flex items-center gap-1">
                              {totalSubmissionsPages > 0 &&
                                Array.from(
                                  { length: totalSubmissionsPages },
                                  (_, i) => i + 1
                                ).map((page) => (
                                  <Button
                                    key={page}
                                    variant={
                                      submissionsPage === page
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setSubmissionsPage(page)}
                                    className="px-3 py-1 min-w-[40px]"
                                  >
                                    {page}
                                  </Button>
                                ))}
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSubmissionsPage(submissionsPage + 1)
                              }
                              disabled={
                                submissionsPage === totalSubmissionsPages
                              }
                              className="px-3 py-1"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* No Student Submissions State */}
                    {(Array.isArray(studentSubmissions)
                      ? studentSubmissions.filter((s) =>
                          ["pending", "reviewed", "considered"].includes(
                            (s.status || "").toString()
                          )
                        ).length
                      : 0) === 0 && (
                      <div className="text-center py-12">
                        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
                          <div className="text-6xl mb-4">📝</div>
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            No Student Submissions Yet
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Students haven't submitted any voice notes or
                            articles for review yet. When they do, you'll see
                            them here to potentially feature on the Wall of
                            Fame.
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              onClick={() => setShowCreateModal(true)}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Pin Manually
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setActiveTab("coach-suggestions")}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Check Coach Suggestions
                            </Button>
                          </div>
                          <div className="text-sm text-gray-500 mt-4">
                            💡 Tip: Students can submit voice notes and articles
                            through their learning interfaces
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Process */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">
                      Student Submission Review Process
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm text-green-700">
                    <div>
                      • Students can submit voice notes and articles through
                      their learning interfaces
                    </div>
                    <div>
                      • All submissions appear here for admin review and
                      approval
                    </div>
                    <div>
                      • Use the embedded players/readers to experience the
                      content as students intended
                    </div>
                    <div>
                      • Pin exceptional content to the WTF or archive
                      submissions that don't meet criteria
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "background-settings" && (
              <div className="p-6">
                <BackgroundSettings
                  onSettingsChange={(newSettings) => {
                    // Refresh background settings when they change
                    refreshBackgroundSettings();
                  }}
                />
              </div>
            )}

            {activeTab === "coin-rules" && (
              <div className="p-6">
                <div className="bg-white rounded-lg shadow border p-6 max-w-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="w-5 h-5 text-yellow-600" />
                    <h3 className="text-lg font-semibold">
                      WTF Reward Configuration
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Set how many ISF Coins a student earns automatically when
                    their content is featured on the WTF.
                  </p>
                  <label
                    htmlFor="num-wtf-coin-award"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    ISF Coins to award for any student content featured on WTF
                  </label>
                  <input
                    id="num-wtf-coin-award"
                    type="number"
                    min={0}
                    className="w-40 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={wtfCoinReward}
                    onChange={(e) =>
                      setWtfCoinReward(parseInt(e.target.value || "0", 10))
                    }
                  />
                  <div className="mt-4">
                    <Button
                      onClick={async () => {
                        setIsSavingCoinReward(true);
                        try {
                          await updateWtfCoinReward(
                            Number.isFinite(wtfCoinReward) ? wtfCoinReward : 25
                          );
                          showToast("WTF Reward setting saved", "success");
                        } catch (e) {
                          // eslint-disable-next-line no-console
                          console.error("Failed to save coin rule:", e);
                          showToast("Failed to save reward setting", "error");
                        } finally {
                          setIsSavingCoinReward(false);
                        }
                      }}
                      disabled={isSavingCoinReward}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSavingCoinReward ? "Saving..." : "Save Setting"}
                    </Button>
                  </div>
                  <div className="mt-6 text-xs text-gray-500">
                    Backend hook will automatically credit coins to the
                    student's balance when an Admin pins content. This UI only
                    stores the value until API is connected.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "coin-transactions" && (
              <div className="p-6">
                <div className="bg-white rounded-lg shadow border">
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="w-5 h-5 text-yellow-600" />
                      <h3 className="text-lg font-semibold">
                        Student Coin Transactions
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      View student ISF coin transactions. Students earn coins
                      when their WTF content is approved by admins/coaches, and
                      spend coins on purchases. Admins and coaches do not earn
                      coins.
                    </p>

                    {/* Business Logic Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 text-xs font-bold">
                              i
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 mb-1">
                            How the Coin System Works
                          </h4>
                          <ul className="text-xs text-blue-800 space-y-1">
                            <li>
                              • <strong>Students earn coins</strong> when their
                              WTF content (pins, submissions) gets approved
                            </li>
                            <li>
                              • <strong>Students spend coins</strong> on
                              purchases, repairs, and other services
                            </li>
                            <li>
                              • <strong>Admins/Coaches</strong> manage the
                              system but don't earn coins
                            </li>
                            <li>
                              • <strong>Coin rewards</strong> are automatically
                              given upon content approval
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Clear Filters Button */}
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={clearCoinTransactionsFilters}
                          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      {/* Transaction Type filter hidden as Type column is hidden */}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Source
                        </label>
                        <select
                          value={coinTransactionsFilters.source}
                          onChange={(e) =>
                            handleCoinTransactionsFilterChange(
                              "source",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">All Sources</option>
                          <option value="wtf">WTF</option>
                          <option value="attendance">Attendance</option>
                          <option value="task">Task</option>
                          <option value="medical">Medical</option>
                          <option value="sports">Sports</option>
                          <option value="music">Music</option>
                          <option value="general">General</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pin Type
                        </label>
                        <select
                          value={coinTransactionsFilters.pinType || ""}
                          onChange={(e) =>
                            handleCoinTransactionsFilterChange(
                              "pinType",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">All Pin Types</option>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                          <option value="audio">Audio</option>
                          <option value="text">Text</option>
                          <option value="link">Link</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date From
                        </label>
                        <input
                          type="date"
                          value={coinTransactionsFilters.dateFrom}
                          onChange={(e) =>
                            handleCoinTransactionsFilterChange(
                              "dateFrom",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date To
                        </label>
                        <input
                          type="date"
                          value={coinTransactionsFilters.dateTo}
                          onChange={(e) =>
                            handleCoinTransactionsFilterChange(
                              "dateTo",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="p-6">
                    {coinTransactionsLoading ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    ) : coinTransactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No transactions found
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  User
                                </th>
                                {/* Type column hidden as requested */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Date
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {coinTransactions.map((transaction, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="flex-shrink-0 h-8 w-8">
                                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                                          <User className="h-4 w-4 text-purple-600" />
                                        </div>
                                      </div>
                                      <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                          {transaction.userName ||
                                            "Unknown User"}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {transaction.userRole ||
                                            "Unknown Role"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  {/* Type column data hidden as requested */}
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {transaction.pinType ? (
                                      <div className="flex items-center space-x-2">
                                        <div className="flex items-center space-x-1">
                                          {transaction.pinType === "image" && (
                                            <ImageIcon className="h-3 w-3 text-blue-600" />
                                          )}
                                          {transaction.pinType === "video" && (
                                            <Video className="h-3 w-3 text-red-600" />
                                          )}
                                          {transaction.pinType === "audio" && (
                                            <Volume2 className="h-3 w-3 text-green-600" />
                                          )}
                                          {transaction.pinType === "text" && (
                                            <FileText className="h-3 w-3 text-purple-600" />
                                          )}
                                          {transaction.pinType === "link" && (
                                            <ExternalLink className="h-3 w-3 text-orange-600" />
                                          )}
                                          <Badge className="text-xs bg-purple-100 text-purple-800">
                                            {transaction.pinType
                                              .charAt(0)
                                              .toUpperCase() +
                                              transaction.pinType.slice(1)}
                                          </Badge>
                                        </div>
                                        {transaction.pinTitle && (
                                          <span
                                            className="text-xs text-gray-600 max-w-24 truncate"
                                            title={transaction.pinTitle}
                                          >
                                            {transaction.pinTitle}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">
                                        -
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`text-sm font-medium ${
                                        transaction.amount > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }`}
                                    >
                                      {transaction.amount > 0 ? "+" : ""}
                                      {transaction.amount} coins
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge className="text-xs bg-blue-100 text-blue-800">
                                      {transaction.source}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 max-w-xs truncate">
                                      {transaction.type ===
                                        "wtf_pin_creation" &&
                                      transaction.pinTitle
                                        ? `Created ${transaction.pinType} pin: ${transaction.pinTitle}`
                                        : transaction.description}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(
                                      transaction.createdAt
                                    ).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-6 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Showing{" "}
                            {(coinTransactionsPage - 1) *
                              coinTransactionsPerPage +
                              1}{" "}
                            to{" "}
                            {Math.min(
                              coinTransactionsPage * coinTransactionsPerPage,
                              coinTransactionsTotal
                            )}{" "}
                            of {coinTransactionsTotal} results
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                setCoinTransactionsPage((prev) =>
                                  Math.max(1, prev - 1)
                                )
                              }
                              disabled={coinTransactionsPage === 1}
                              variant="outline"
                              size="sm"
                            >
                              Previous
                            </Button>
                            <Button
                              onClick={() =>
                                setCoinTransactionsPage((prev) => prev + 1)
                              }
                              disabled={
                                coinTransactionsPage *
                                  coinTransactionsPerPage >=
                                coinTransactionsTotal
                              }
                              variant="outline"
                              size="sm"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-lg font-semibold">
                    WTF Analytics & Insights
                  </h3>
                </div>
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    Analytics dashboard coming soon...
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Track engagement, popular content types, and user
                    interactions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create New Pin Modal */}
      <CreateNewPinModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDraft(null);
        }}
        onCreatePin={handleCreatePin}
        userRole={user?.role}
        editingDraft={editingDraft}
      />

      {/* Drafts Modal */}
      <DraftsModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleSelectDraft}
        onDraftDeleted={handleDraftDeleted}
      />

      {/* Edit Pin Modal */}
      <PinEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPin(null);
        }}
        pin={selectedPin}
        onUpdatePin={handleUpdatePin}
      />

      {/* Review Submission Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        onPinToWTF={handlePinToWTF}
        onArchive={handleArchiveSubmission}
        onStatusChange={(newStatus) => {
          if (!selectedSubmission) return;
          const id = selectedSubmission._id || selectedSubmission.id;
          setStudentSubmissions((prev) =>
            Array.isArray(prev)
              ? prev.map((s) =>
                  (s._id || s.id) === id ? { ...s, status: newStatus } : s
                )
              : prev
          );
        }}
      />

      {/* Coach Suggestion Review Modal */}
      <CoachSuggestionReviewModal
        isOpen={showCoachSuggestionModal}
        onClose={() => {
          setShowCoachSuggestionModal(false);
          setSelectedCoachSuggestion(null);
        }}
        suggestion={selectedCoachSuggestion}
        onPinToWTF={handlePinCoachSuggestion}
        onArchive={handleArchiveCoachSuggestion}
      />
    </div>
  );
};

// Wrapper component with background provider
const WTFManagement = (props) => {
  return (
    <WtfBackgroundProvider>
      <WTFManagementContent {...props} />
    </WtfBackgroundProvider>
  );
};

export default WTFManagement;
