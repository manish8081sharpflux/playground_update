import React, { useState, useEffect, useCallback } from "react";
import {
  Eye,
  Heart,
  ThumbsUp,
  Play,
  Volume2,
  FileText,
  Camera,
  Settings,
  Plus,
  Palette,
  Upload,
  Loader,
  Mic,
  StopCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { useUserRole } from "../../hooks/useUserRole";
import { useSidebar } from "../Layout";
import {
  useWtfBackground,
  WtfBackgroundProvider,
} from "../../contexts/WtfBackgroundContext";

import CategoryButtons from "./CategoryButtons";
// S6-S4-BUG-003: Removed CoursesSection import - courses not required in WTF navigation
// import CoursesSection from "./CoursesSection";
import "./WtfDashboard.css";
import CreateNewPinModal from "./CreateNewPinModal";
import ImageViewer from "./modals/ImageViewer";
import VideoPlayer from "./modals/VideoPlayer";
import AudioPlayer from "./modals/AudioPlayer";
import TextReader from "./modals/TextReader";
import ArticleEditor from "./modals/ArticleEditor";
import { Badge } from "../ui/badge.jsx";
import { useAuth } from "../../contexts/AuthContext";
import {
  getActiveWtfPins,
  likeWtfPin,
  loveWtfPin,
  markWtfPinAsSeen,
  createWtfPin,
  createCoachSuggestion,
  getPendingSubmissionsCount,
  getCoachSuggestionsCount,
  submitVoiceNote,
  submitArticle,
  submitWtfMedia,
  updateWtfSettings,
  uploadWtfBackgroundImage,
  uploadWtfFont,
  getStudentInteractionHistory,
} from "../../api";
import showToast from "../../utils/toast";
import isfWallOfFameImage from "../../assets/IsfWallOfFame.png";

// Inline voice suggestion modal (see spec)
const VoiceSuggestionModal = ({ open, onClose }) => {
  const [recording, setRecording] = React.useState(false);
  const [permissionError, setPermissionError] = React.useState("");
  const [mediaRecorder, setMediaRecorder] = React.useState(null);
  const [chunks, setChunks] = React.useState([]);
  const [stream, setStream] = React.useState(null);
  const [timer, setTimer] = React.useState(0);
  const [timerId, setTimerId] = React.useState(null);
  const [audioUrl, setAudioUrl] = React.useState("");
  const [hasReviewed, setHasReviewed] = React.useState(false);

  const chunksRef = React.useRef([]);
  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(s);
      const mr = new MediaRecorder(s);
      chunksRef.current = [];
      setChunks([]);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          setChunks((p) => [...p, e.data]);
        }
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        // Enable submit by default once recording is ready
        setHasReviewed(true);
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
      setTimer(0);

      // Start timer with strict 1-minute limit
      const id = setInterval(() => {
        setTimer((t) => {
          const newTime = t + 1;
          // Force stop at exactly 60 seconds (1 minute)
          if (newTime >= 60) {
            clearInterval(id);
            mr.stop();
            s.getTracks().forEach((track) => track.stop());
            setRecording(false);
            return 60;
          }
          return newTime;
        });
      }, 1000);
      setTimerId(id);

      // Backup safety timeout in case the interval fails
      setTimeout(() => {
        if (recording) {
          stopRecording();
        }
      }, 60500); // Slightly longer than 60s as a backup

      // We avoid mouseup here because the button lives outside modal scope sometimes.
    } catch (err) {
      setPermissionError("Microphone permission denied or unavailable.");
    }
  };
  const stopRecording = () => {
    if (!recording) return;
    try {
      mediaRecorder?.stop();
    } catch (_) {}
    stream?.getTracks()?.forEach((t) => t.stop());
    if (timerId) clearInterval(timerId);
    setRecording(false);
  };
  const resetRecording = () => {
    setAudioUrl("");
    setHasReviewed(false);
    setTimer(0);
    setChunks([]);
    chunksRef.current = [];
  };
  // Safety effect: force stop if recording exceeds 60 seconds
  React.useEffect(() => {
    if (recording && timer >= 60) {
      stopRecording();
    }
  }, [recording, timer]);

  React.useEffect(() => {
    return () => {
      try {
        if (timerId) clearInterval(timerId);
        stream?.getTracks()?.forEach((t) => t.stop());
        mediaRecorder?.stop?.();
      } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [submitting, setSubmitting] = React.useState(false);
  const handleSubmit = async () => {
    try {
      if (!audioUrl) return;
      setSubmitting(true);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice_suggestion_${Date.now()}.webm`, {
        type: "audio/webm",
      });
      const form = new FormData();
      form.append("file", file);
      form.append("title", "Voice Suggestion");
      form.append("type", "audio");
      await submitVoiceNote(form);
      showToast("Thanks for sharing! We'll take a look.", "success");
      onClose();
    } catch (_) {
      showToast("Failed to submit your suggestion.", "error");
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <Mic className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold">Suggest a Topic for a Talk!</h3>
          <button className="ml-auto" onClick={onClose}>
            ×
          </button>
        </div>
        {permissionError && (
          <div className="mb-3 text-sm text-red-600">{permissionError}</div>
        )}
        <div className="mb-4 text-sm text-gray-600 text-center">
          Share your idea for a talk or something you'd like to learn more
          about. You have 1 minute to record your voice note.
        </div>
        {recording ? (
          <div className="text-center py-6">
            <button
              className="mx-auto mb-3 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
              onClick={stopRecording}
              aria-label="Stop recording"
            >
              <StopCircle className="w-8 h-8 text-red-500" />
            </button>
            <div className="font-medium">Recording...</div>
            <div className="text-sm text-gray-600 mt-1">
              {`${String(Math.floor((60 - timer) / 60)).padStart(
                2,
                "0",
              )}:${String((60 - timer) % 60).padStart(2, "0")}`}
            </div>
            <div className="mt-3">
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                onClick={stopRecording}
              >
                <StopCircle className="w-4 h-4" /> Stop Recording
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!audioUrl ? (
              <div className="text-center py-6">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  onClick={startRecording}
                >
                  <Mic className="w-4 h-4" /> Click to Record
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="font-medium mb-3">Your Recording is Ready!</h4>
                  <audio
                    controls
                    className="w-full mb-4"
                    src={audioUrl}
                    onPlay={() => setHasReviewed(true)}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => {
                      const audioElement = document.querySelector("audio");
                      if (audioElement) {
                        audioElement.play();
                        setHasReviewed(true);
                      }
                    }}
                  >
                    <Play className="w-4 h-4" /> Listen to My Suggestion
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={resetRecording}
                  >
                    <Trash2 className="w-4 h-4" />
                    <Mic className="w-4 h-4" /> Delete & Re-record
                  </button>
                  <button
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white ${
                      hasReviewed && !submitting
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-gray-300 cursor-not-allowed"
                    }`}
                    disabled={!hasReviewed || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />{" "}
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Suggestion
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  Please listen to your recording before submitting.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WallOfFameContent = ({ onToggleView }) => {
  const { user } = useAuth();
  const { isSidebarCollapsed } = useSidebar();
  const {
    backgroundSettings: contextBgSettings,
    updateBackgroundSettings,
    applyFontGlobally,
    getFontCategory,
    checkFontAvailability,
    forceRefreshFont,
  } = useWtfBackground();
  const [selectedContent, setSelectedContent] = useState(null);
  const [content, setContent] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({
    name: "All",
    isOfficial: false,
    category: null,
  });

  const [modalType, setModalType] = useState(null);
  const [adminCounts, setAdminCounts] = useState({
    pendingSuggestions: 0,
    newSubmissions: 0,
    reviewQueue: 0,
  });

  // Background customization state
  const [backgroundSettings] = useState({
    color: "from-green-400 via-green-500 to-green-600",
    image: null,
    opacity: 100,
  });

  // Monthly theme state
  const [monthlyTheme] = useState({
    id: "classroom",
    name: "Classic Classroom",
    emoji: "🎓",
    title: "January Learning Goals",
    subtitle: "New Year, New Knowledge!",
  });

  const { isAdmin, isCoach, isStudent } = useUserRole();

  // Remove this when role detection is working properly
  const forceShowAdminControls = false; // Set to false to use real role detection

  // Use context background settings for compact card (not used directly but kept for future)

  // Preview settings (applied immediately) vs saved settings (saved to backend)
  const [previewBgSettings, setPreviewBgSettings] = useState({
    backgroundType: "color",
    backgroundColor: "#f8fafc",
    backgroundImage: null,
    fontColor: "#0f172a",
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bgSuccess, setBgSuccess] = useState("");
  const [bgError, setBgError] = useState("");
  // Voice modal state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showArticleEditor, setShowArticleEditor] = useState(false);

  // Pin type filter and grouping state
  const TYPE_OPTIONS = [
    { key: "image", label: "Images" },
    { key: "video", label: "Videos" },
    { key: "audio", label: "Audio" },
    { key: "text", label: "Text" },
  ];

  const canonicalizeType = (type) => (type === "photo" ? "image" : type);

  const [activeTypeFilters, setActiveTypeFilters] = useState([]); // empty => all
  const [groupByType, setGroupByType] = useState(false);

  const toggleTypeFilter = (key) => {
    setActiveTypeFilters((prev) => {
      const exists = prev.includes(key);
      if (exists) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const filteredContent = content.filter((item) => {
    if (!activeTypeFilters.length) return true;
    const canonical = canonicalizeType(item.type);
    return activeTypeFilters.includes(canonical);
  });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: null, y: null });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });

  // Admin controls dragging state
  const [isAdminDragging, setIsAdminDragging] = useState(false);
  const [adminDragPosition, setAdminDragPosition] = useState({
    x: null,
    y: null,
  });
  const [adminInitialPosition, setAdminInitialPosition] = useState({
    x: 0,
    y: 0,
  });

  // Admin controls minimize state
  const [isAdminPanelMinimized, setIsAdminPanelMinimized] = useState(false);

  // Background settings panel minimize state
  const [isBgPanelMinimized, setIsBgPanelMinimized] = useState(false);

  // Sync preview settings with context settings
  useEffect(() => {
    if (contextBgSettings && !contextBgSettings.isLoading) {
      setPreviewBgSettings({
        backgroundType: contextBgSettings.backgroundType || "color",
        backgroundColor: contextBgSettings.backgroundColor || "#f8fafc",
        backgroundImage: contextBgSettings.backgroundImage || null,
        fontColor: contextBgSettings.fontColor || "#0f172a",
      });
    }
  }, [contextBgSettings]);

  useEffect(() => {
    const fetchPins = async () => {
      try {
        // Build query parameters based on selected category
        const queryParams = {};
        if (selectedCategory.isOfficial && selectedCategory.category) {
          queryParams.isOfficial = true;
          queryParams.officialCategory = selectedCategory.category;
        } else if (selectedCategory.isOfficial) {
          queryParams.isOfficial = true;
        }

        const response = await getActiveWtfPins(queryParams);

        if (response.success && response.data && response.data.pins) {
          const pins = response.data.pins;

          setContent(pins);
        } else {
          setContent([]);
        }
      } catch (error) {
        console.error("Error fetching pins:", error);
        setContent([]);
      }
    };

    const fetchAdminCounts = async () => {
      if (isAdmin) {
        try {
          const [coachCountResp, studentPendingResp] = await Promise.all([
            getCoachSuggestionsCount(),
            getPendingSubmissionsCount(),
          ]);

          const coachPending = coachCountResp?.data?.pendingCount || 0;
          const studentPending = studentPendingResp || 0;

          setAdminCounts({
            // As per requirement: show combined totals everywhere
            pendingSuggestions: coachPending + studentPending,
            newSubmissions: coachPending + studentPending,
            reviewQueue: coachPending + studentPending,
          });
        } catch (error) {
          console.error("Error fetching admin counts:", error);
        }
      }
    };

    fetchPins();
    fetchAdminCounts();

    const interval = setInterval(() => {
      fetchPins();
      fetchAdminCounts();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [isAdmin, selectedCategory]);

  // Track viewed pins per-user in current session to avoid duplicate view API calls
  const viewedPinsRef = React.useRef(new Set());

  // Track all pins the student has viewed (from backend)
  const [viewedPinsFromBackend, setViewedPinsFromBackend] = useState(new Set());

  useEffect(() => {
    try {
      const key = `wtf_viewed_${user?.id || "guest"}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          viewedPinsRef.current = new Set(ids);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [user?.id]);

  // Fetch student's interaction history to determine which pins have been viewed
  useEffect(() => {
    const fetchStudentInteractions = async () => {
      if (!user?.id || !isStudent) return;

      try {
        const response = await getStudentInteractionHistory(user.id, {
          limit: 1000,
          type: "seen",
        });
        if (response.success && response.data?.interactions) {
          const viewedPinIds = new Set(
            response.data.interactions
              .filter((interaction) => interaction.type === "seen")
              .map(
                (interaction) => interaction.pinId?._id || interaction.pinId,
              ),
          );
          setViewedPinsFromBackend(viewedPinIds);
        }
      } catch (error) {
        console.error("Error fetching student interactions:", error);
      }
    };

    fetchStudentInteractions();
  }, [user?.id, isStudent]);

  // Function to check if a pin has been viewed by the current student
  const hasStudentViewedPin = useCallback(
    (pinId) => {
      if (!pinId) return false;
      return (
        viewedPinsRef.current.has(pinId) || viewedPinsFromBackend.has(pinId)
      );
    },
    [viewedPinsFromBackend],
  );

  // Function to refresh viewed pins from backend
  const refreshViewedPins = useCallback(async () => {
    if (!user?.id || !isStudent) return;

    try {
      const response = await getStudentInteractionHistory(user.id, {
        limit: 1000,
        type: "seen",
      });
      if (response.success && response.data?.interactions) {
        const viewedPinIds = new Set(
          response.data.interactions
            .filter((interaction) => interaction.type === "seen")
            .map((interaction) => interaction.pinId?._id || interaction.pinId),
        );
        setViewedPinsFromBackend(viewedPinIds);
      }
    } catch (error) {
      console.error("Error refreshing viewed pins:", error);
    }
  }, [user?.id, isStudent]);

  // Sort so that unseen items appear first and seen items shift to the end (students only)
  const sortedContent = React.useMemo(() => {
    // For admins/coaches, preserve original ordering
    if (!isStudent) return filteredContent;

    const items = [...filteredContent];
    return items
      .map((item) => ({
        item,
        seen: hasStudentViewedPin(item._id || item.id),
        createdAtTs: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      }))
      .sort((a, b) => {
        // Unseen first, seen last
        if (a.seen !== b.seen) return a.seen ? 1 : -1;
        // Within same seen status, keep recent first (fallback to stable-ish by createdAt)
        return b.createdAtTs - a.createdAtTs;
      })
      .map(({ item }) => item);
    // Recompute when viewed pins set changes or the filtered list changes
  }, [filteredContent, hasStudentViewedPin, isStudent]);

  const groupedByType = TYPE_OPTIONS.reduce((acc, opt) => {
    acc[opt.key] = [];
    return acc;
  }, {});

  // Build groups using the sorted order so seen items are also last within each group
  sortedContent.forEach((item) => {
    const canonical = canonicalizeType(item.type);
    if (groupedByType[canonical]) groupedByType[canonical].push(item);
  });

  // Categories UI removed; keeping state for compatibility but no handler needed

  const handlePinClick = async (item) => {
    // Find the most up-to-date version of this pin from the current content state
    const currentPin = content.find(
      (pin) => (pin._id || pin.id) === (item._id || item.id),
    );

    if (currentPin) {
      setSelectedContent(currentPin);
    } else {
      setSelectedContent(item);
    }

    // Map backend types to frontend modal types
    const modalTypeMap = {
      image: "photo",
      video: "video",
      audio: "audio",
      text: "text",
      link: "text", // Links can be displayed in text modal
    };
    setModalType(modalTypeMap[item.type] || "text");

    // Mark as seen on first open per user/session
    const pinId = item._id || item.id;
    if (pinId && !viewedPinsRef.current.has(pinId)) {
      try {
        // Send minimal non-zero duration to satisfy backend validation
        const res = await markWtfPinAsSeen(pinId, 1);
        if (res?.success && res?.data?.action === "seen") {
          // Optimistically update UI counts
          setContent((prev) =>
            prev.map((p) =>
              (p._id || p.id) === pinId
                ? {
                    ...p,
                    engagementMetrics: {
                      ...p.engagementMetrics,
                      seen: (p.engagementMetrics?.seen || 0) + 1,
                    },
                  }
                : p,
            ),
          );
          setSelectedContent((prev) => {
            if (!prev) return prev;
            if ((prev._id || prev.id) !== pinId) return prev;
            return {
              ...prev,
              engagementMetrics: {
                ...prev.engagementMetrics,
                seen: (prev.engagementMetrics?.seen || 0) + 1,
              },
            };
          });
        }
      } catch (err) {
        console.error("Error marking WTF pin as seen:", err);
      } finally {
        viewedPinsRef.current.add(pinId);
        // Also update the backend viewed pins state
        setViewedPinsFromBackend((prev) => new Set([...prev, pinId]));
        try {
          const key = `wtf_viewed_${user?.id || "guest"}`;
          sessionStorage.setItem(
            key,
            JSON.stringify(Array.from(viewedPinsRef.current)),
          );
        } catch (_) {}
      }
    }
  };

  const closeModal = () => {
    setSelectedContent(null);
    setModalType(null);
  };

  // Background settings functions

  // Popular Google Fonts for the dropdown
  const googleFonts = [
    { name: "Roboto", category: "sans-serif" },
    { name: "Open Sans", category: "sans-serif" },
    { name: "Lato", category: "sans-serif" },
    { name: "Poppins", category: "sans-serif" },
    { name: "Montserrat", category: "sans-serif" },
    { name: "Source Sans Pro", category: "sans-serif" },
    { name: "Raleway", category: "sans-serif" },
    { name: "PT Sans", category: "sans-serif" },
    { name: "Ubuntu", category: "sans-serif" },
    { name: "Playfair Display", category: "serif" },
    { name: "Merriweather", category: "serif" },
    { name: "Lora", category: "serif" },
    { name: "Crimson Text", category: "serif" },
    { name: "Georgia", category: "serif" },
    { name: "Times New Roman", category: "serif" },
    { name: "Patrick Hand", category: "handwriting" },
    { name: "Indie Flower", category: "handwriting" },
    { name: "Shadows Into Light", category: "handwriting" },
    { name: "Caveat", category: "handwriting" },
    { name: "Dancing Script", category: "handwriting" },
    { name: "Pacifico", category: "handwriting" },
    { name: "Kalam", category: "handwriting" },
    { name: "Architects Daughter", category: "handwriting" },
    { name: "Gloria Hallelujah", category: "handwriting" },
    { name: "Permanent Marker", category: "handwriting" },
    { name: "Satisfy", category: "handwriting" },
    { name: "Bangers", category: "display" },
    { name: "Fredoka One", category: "display" },
    { name: "Righteous", category: "display" },
    { name: "Lobster", category: "display" },
    { name: "Bungee", category: "display" },
    { name: "Press Start 2P", category: "display" },
    { name: "Orbitron", category: "display" },
    { name: "Audiowide", category: "display" },
    { name: "Monoton", category: "display" },
    { name: "Faster One", category: "display" },
    { name: "Codystar", category: "display" },
    { name: "Freckle Face", category: "display" },
    { name: "Creepster", category: "display" },
    { name: "Butcherman", category: "display" },
    { name: "Nosifer", category: "display" },
    { name: "Griffy", category: "display" },
    { name: "Eater", category: "display" },
    { name: "Fascinate", category: "display" },
    { name: "Fascinate Inline", category: "display" },
    { name: "Flavors", category: "display" },
    { name: "Fondamento", category: "display" },
    { name: "Freckle Face", category: "display" },
    { name: "Frijole", category: "display" },
    { name: "Fruktur", category: "display" },
    { name: "Fugaz One", category: "display" },
    { name: "Goblin One", category: "display" },
    { name: "Gorditas", category: "display" },
    { name: "Graduate", category: "display" },
    { name: "Gravitas One", category: "display" },
    { name: "Great Vibes", category: "handwriting" },
    { name: "Griffy", category: "display" },
    { name: "Gruppo", category: "display" },
    { name: "Holtwood One SC", category: "display" },
    { name: "Homemade Apple", category: "handwriting" },
    { name: "Iceberg", category: "display" },
    { name: "Iceland", category: "display" },
    { name: "Imprima", category: "sans-serif" },
    { name: "Inconsolata", category: "monospace" },
    { name: "Inder", category: "sans-serif" },
    { name: "Indie Flower", category: "handwriting" },
    { name: "Inika", category: "serif" },
    { name: "Irish Grover", category: "display" },
    { name: "Istok Web", category: "sans-serif" },
    { name: "Italiana", category: "serif" },
    { name: "Italianno", category: "handwriting" },
    { name: "Jacques Francois", category: "serif" },
    { name: "Jacques Francois Shadow", category: "display" },
    { name: "Jim Nightshade", category: "handwriting" },
    { name: "Jockey One", category: "display" },
    { name: "Jolly Lodger", category: "display" },
    { name: "Josefin Sans", category: "sans-serif" },
    { name: "Josefin Slab", category: "serif" },
    { name: "Joti One", category: "display" },
    { name: "Judson", category: "serif" },
    { name: "Julee", category: "handwriting" },
    { name: "Julius Sans One", category: "display" },
    { name: "Junge", category: "serif" },
    { name: "Jura", category: "sans-serif" },
    { name: "Just Another Hand", category: "handwriting" },
    { name: "Just Me Again Down Here", category: "handwriting" },
    { name: "Kalam", category: "handwriting" },
    { name: "Kameron", category: "serif" },
    { name: "Kantumruy", category: "sans-serif" },
    { name: "Karla", category: "sans-serif" },
    { name: "Karma", category: "serif" },
    { name: "Kaushan Script", category: "handwriting" },
    { name: "Kavoon", category: "display" },
    { name: "Kdam Thmor", category: "display" },
    { name: "Keania One", category: "display" },
    { name: "Kelly Slab", category: "display" },
    { name: "Kenia", category: "display" },
    { name: "Khand", category: "sans-serif" },
    { name: "Khmer", category: "display" },
    { name: "Kite One", category: "display" },
    { name: "Knewave", category: "display" },
    { name: "Kotta One", category: "serif" },
    { name: "Koulen", category: "display" },
    { name: "Kranky", category: "display" },
    { name: "Kreon", category: "serif" },
    { name: "Kristi", category: "handwriting" },
    { name: "Krona One", category: "display" },
    { name: "La Belle Aurore", category: "handwriting" },
    { name: "Lancelot", category: "display" },
    { name: "Lato", category: "sans-serif" },
    { name: "League Script", category: "handwriting" },
    { name: "Leckerli One", category: "handwriting" },
    { name: "Ledger", category: "serif" },
    { name: "Lekton", category: "sans-serif" },
    { name: "Lemon", category: "display" },
    { name: "Libre Baskerville", category: "serif" },
    { name: "Life Savers", category: "display" },
    { name: "Lilita One", category: "display" },
    { name: "Lily Script One", category: "display" },
    { name: "Limelight", category: "display" },
    { name: "Linden Hill", category: "serif" },
    { name: "Lobster", category: "display" },
    { name: "Lobster Two", category: "display" },
    { name: "Londrina Outline", category: "display" },
    { name: "Londrina Shadow", category: "display" },
    { name: "Londrina Sketch", category: "display" },
    { name: "Londrina Solid", category: "display" },
    { name: "Lora", category: "serif" },
    { name: "Love Ya Like A Sister", category: "display" },
    { name: "Loved by the King", category: "handwriting" },
    { name: "Lovers Quarrel", category: "handwriting" },
    { name: "Luckiest Guy", category: "display" },
    { name: "Lusitana", category: "serif" },
    { name: "Lustria", category: "serif" },
    { name: "Macondo", category: "display" },
    { name: "Macondo Swash Caps", category: "display" },
    { name: "Magra", category: "sans-serif" },
    { name: "Maiden Orange", category: "display" },
    { name: "Mako", category: "sans-serif" },
    { name: "Mallanna", category: "sans-serif" },
    { name: "Mandali", category: "sans-serif" },
    { name: "Marcellus", category: "serif" },
    { name: "Marcellus SC", category: "serif" },
    { name: "Marck Script", category: "handwriting" },
    { name: "Margarine", category: "display" },
    { name: "Marko One", category: "serif" },
    { name: "Marmelad", category: "sans-serif" },
    { name: "Marvel", category: "sans-serif" },
    { name: "Mate", category: "serif" },
    { name: "Mate SC", category: "serif" },
    { name: "Maven Pro", category: "sans-serif" },
    { name: "McLaren", category: "display" },
    { name: "Meddon", category: "handwriting" },
    { name: "MedievalSharp", category: "display" },
    { name: "Medula One", category: "display" },
    { name: "Megrim", category: "display" },
    { name: "Meie Script", category: "handwriting" },
    { name: "Merienda", category: "handwriting" },
    { name: "Merienda One", category: "handwriting" },
    { name: "Merriweather", category: "serif" },
    { name: "Metal", category: "display" },
    { name: "Metal Mania", category: "display" },
    { name: "Metamorphous", category: "display" },
    { name: "Metrophobic", category: "sans-serif" },
    { name: "Michroma", category: "sans-serif" },
    { name: "Milonga", category: "display" },
    { name: "Miltonian", category: "display" },
    { name: "Miltonian Tattoo", category: "display" },
    { name: "Miniver", category: "display" },
    { name: "Miss Fajardose", category: "handwriting" },
    { name: "Modern Antiqua", category: "display" },
    { name: "Molengo", category: "sans-serif" },
    { name: "Monofett", category: "display" },
    { name: "Monoton", category: "display" },
    { name: "Monsieur La Doulaise", category: "handwriting" },
    { name: "Montaga", category: "serif" },
    { name: "Montez", category: "handwriting" },
    { name: "Montserrat", category: "sans-serif" },
    { name: "Moul", category: "display" },
    { name: "Moulpali", category: "display" },
    { name: "Mountains of Christmas", category: "display" },
    { name: "Mouse Memoirs", category: "sans-serif" },
    { name: "Mr Bedfort", category: "handwriting" },
    { name: "Mr Dafoe", category: "handwriting" },
    { name: "Mr De Haviland", category: "handwriting" },
    { name: "Mrs Saint Delafield", category: "handwriting" },
    { name: "Mrs Sheppards", category: "handwriting" },
    { name: "Muli", category: "sans-serif" },
    { name: "Mystery Quest", category: "display" },
    { name: "Neucha", category: "handwriting" },
    { name: "Neuton", category: "serif" },
    { name: "New Rocker", category: "display" },
    { name: "News Cycle", category: "sans-serif" },
    { name: "Niconne", category: "handwriting" },
    { name: "Nixie One", category: "display" },
    { name: "Nobile", category: "sans-serif" },
    { name: "Nokora", category: "serif" },
    { name: "Norican", category: "handwriting" },
    { name: "Nosifer", category: "display" },
    { name: "Nothing You Could Do", category: "handwriting" },
    { name: "Noticia Text", category: "serif" },
    { name: "Noto Sans", category: "sans-serif" },
    { name: "Noto Serif", category: "serif" },
    { name: "Nova Cut", category: "display" },
    { name: "Nova Flat", category: "display" },
    { name: "Nova Mono", category: "monospace" },
    { name: "Nova Oval", category: "display" },
    { name: "Nova Round", category: "display" },
    { name: "Nova Script", category: "display" },
    { name: "Nova Slim", category: "display" },
    { name: "Nova Square", category: "display" },
    { name: "Numans", category: "sans-serif" },
    { name: "Nunito", category: "sans-serif" },
    { name: "Odor Mean Chey", category: "display" },
    { name: "Offside", category: "display" },
    { name: "Old Standard TT", category: "serif" },
    { name: "Oldenburg", category: "display" },
    { name: "Oleo Script", category: "display" },
    { name: "Oleo Script Swash Caps", category: "display" },
    { name: "Open Sans", category: "sans-serif" },
    { name: "Open Sans Condensed", category: "sans-serif" },
    { name: "Oranienbaum", category: "serif" },
    { name: "Orbitron", category: "display" },
    { name: "Oregano", category: "display" },
    { name: "Orienta", category: "sans-serif" },
    { name: "Original Surfer", category: "display" },
    { name: "Oswald", category: "sans-serif" },
    { name: "Over the Rainbow", category: "handwriting" },
    { name: "Overlock", category: "display" },
    { name: "Overlock SC", category: "display" },
    { name: "Ovo", category: "serif" },
    { name: "Oxygen", category: "sans-serif" },
    { name: "Oxygen Mono", category: "monospace" },
    { name: "Pacifico", category: "handwriting" },
    { name: "Paprika", category: "display" },
    { name: "Parisienne", category: "handwriting" },
    { name: "Passero One", category: "display" },
    { name: "Passion One", category: "display" },
    { name: "Patrick Hand", category: "handwriting" },
    { name: "Patua One", category: "display" },
    { name: "Paytone One", category: "sans-serif" },
    { name: "Peralta", category: "display" },
    { name: "Permanent Marker", category: "handwriting" },
    { name: "Petit Formal Script", category: "handwriting" },
    { name: "Petrona", category: "serif" },
    { name: "Philosopher", category: "serif" },
    { name: "Piedra", category: "display" },
    { name: "Pinyon Script", category: "handwriting" },
    { name: "Pirata One", category: "display" },
    { name: "Plaster", category: "display" },
    { name: "Play", category: "sans-serif" },
    { name: "Playball", category: "display" },
    { name: "Playfair Display", category: "serif" },
    { name: "Playfair Display SC", category: "serif" },
    { name: "Podkova", category: "serif" },
    { name: "Poiret One", category: "display" },
    { name: "Poller One", category: "display" },
    { name: "Poly", category: "serif" },
    { name: "Pompiere", category: "display" },
    { name: "Pontano Sans", category: "sans-serif" },
    { name: "Poppins", category: "sans-serif" },
    { name: "Port Lligat Sans", category: "sans-serif" },
    { name: "Port Lligat Slab", category: "serif" },
    { name: "Prata", category: "serif" },
    { name: "Preahvihear", category: "display" },
    { name: "Press Start 2P", category: "display" },
    { name: "Princess Sofia", category: "handwriting" },
    { name: "Prociono", category: "serif" },
    { name: "Prosto One", category: "display" },
    { name: "PT Sans", category: "sans-serif" },
    { name: "PT Sans Caption", category: "sans-serif" },
    { name: "PT Sans Narrow", category: "sans-serif" },
    { name: "PT Serif", category: "serif" },
    { name: "PT Serif Caption", category: "serif" },
    { name: "Puritan", category: "sans-serif" },
    { name: "Purple Purse", category: "display" },
    { name: "Quando", category: "serif" },
    { name: "Quantico", category: "sans-serif" },
    { name: "Quattrocento", category: "serif" },
    { name: "Quattrocento Sans", category: "sans-serif" },
    { name: "Questrial", category: "sans-serif" },
    { name: "Quicksand", category: "sans-serif" },
    { name: "Quintessential", category: "handwriting" },
    { name: "Qwigley", category: "handwriting" },
    { name: "Racing Sans One", category: "display" },
    { name: "Radley", category: "serif" },
    { name: "Raleway", category: "sans-serif" },
    { name: "Raleway Dots", category: "display" },
    { name: "Rambla", category: "sans-serif" },
    { name: "Rammetto One", category: "display" },
    { name: "Ranchers", category: "display" },
    { name: "Rancho", category: "handwriting" },
    { name: "Rationale", category: "sans-serif" },
    { name: "Redressed", category: "handwriting" },
    { name: "Reenie Beanie", category: "handwriting" },
    { name: "Revalia", category: "display" },
    { name: "Ribeye", category: "display" },
    { name: "Ribeye Marrow", category: "display" },
    { name: "Righteous", category: "display" },
    { name: "Risque", category: "display" },
    { name: "Roboto", category: "sans-serif" },
    { name: "Roboto Condensed", category: "sans-serif" },
    { name: "Roboto Mono", category: "monospace" },
    { name: "Roboto Slab", category: "serif" },
    { name: "Rochester", category: "handwriting" },
    { name: "Rock Salt", category: "handwriting" },
    { name: "Rokkitt", category: "serif" },
    { name: "Romanesco", category: "handwriting" },
    { name: "Ropa Sans", category: "sans-serif" },
    { name: "Rosario", category: "sans-serif" },
    { name: "Rosarivo", category: "serif" },
    { name: "Rouge Script", category: "handwriting" },
    { name: "Rozha One", category: "serif" },
    { name: "Rubik", category: "sans-serif" },
    { name: "Rubik Mono One", category: "display" },
    { name: "Rubik One", category: "display" },
    { name: "Ruda", category: "sans-serif" },
    { name: "Rufina", category: "serif" },
    { name: "Ruge Boogie", category: "handwriting" },
    { name: "Ruluko", category: "sans-serif" },
    { name: "Rum Raisin", category: "sans-serif" },
    { name: "Ruslan Display", category: "display" },
    { name: "Russo One", category: "sans-serif" },
    { name: "Ruthie", category: "handwriting" },
    { name: "Rye", category: "display" },
    { name: "Sacramento", category: "handwriting" },
    { name: "Sail", category: "display" },
    { name: "Salsa", category: "display" },
    { name: "Sanchez", category: "serif" },
    { name: "Sancreek", category: "display" },
    { name: "Sansita One", category: "display" },
    { name: "Sarina", category: "display" },
    { name: "Satisfy", category: "handwriting" },
    { name: "Scada", category: "sans-serif" },
    { name: "Schoolbell", category: "handwriting" },
    { name: "Seaweed Script", category: "display" },
    { name: "Sevillana", category: "display" },
    { name: "Seymour One", category: "sans-serif" },
    { name: "Shadows Into Light", category: "handwriting" },
    { name: "Shadows Into Light Two", category: "handwriting" },
    { name: "Shanti", category: "sans-serif" },
    { name: "Share", category: "display" },
    { name: "Share Tech", category: "sans-serif" },
    { name: "Share Tech Mono", category: "monospace" },
    { name: "Shojumaru", category: "display" },
    { name: "Short Stack", category: "handwriting" },
    { name: "Siemreap", category: "display" },
    { name: "Sigmar One", category: "display" },
    { name: "Signika", category: "sans-serif" },
    { name: "Signika Negative", category: "sans-serif" },
    { name: "Simonetta", category: "serif" },
    { name: "Sintony", category: "sans-serif" },
    { name: "Sirin Stencil", category: "display" },
    { name: "Six Caps", category: "sans-serif" },
    { name: "Skranji", category: "display" },
    { name: "Slabo 13px", category: "serif" },
    { name: "Slabo 27px", category: "serif" },
    { name: "Slackey", category: "display" },
    { name: "Smokum", category: "display" },
    { name: "Smythe", category: "display" },
    { name: "Sniglet", category: "display" },
    { name: "Snippet", category: "sans-serif" },
    { name: "Snowburst One", category: "display" },
    { name: "Sofadi One", category: "display" },
    { name: "Sofia", category: "handwriting" },
    { name: "Sonsie One", category: "display" },
    { name: "Sorts Mill Goudy", category: "serif" },
    { name: "Source Code Pro", category: "monospace" },
    { name: "Source Sans Pro", category: "sans-serif" },
    { name: "Source Serif Pro", category: "serif" },
    { name: "Special Elite", category: "display" },
    { name: "Spicy Rice", category: "display" },
    { name: "Spinnaker", category: "sans-serif" },
    { name: "Spirax", category: "display" },
    { name: "Squada One", category: "display" },
    { name: "Stalemate", category: "handwriting" },
    { name: "Stalinist One", category: "display" },
    { name: "Stardos Stencil", category: "display" },
    { name: "Stint Ultra Condensed", category: "display" },
    { name: "Stint Ultra Expanded", category: "display" },
    { name: "Stoke", category: "serif" },
    { name: "Strait", category: "sans-serif" },
    { name: "Sue Ellen Francisco", category: "handwriting" },
    { name: "Sunshiney", category: "handwriting" },
    { name: "Supermercado One", category: "display" },
    { name: "Suwannaphum", category: "display" },
    { name: "Swanky and Moo Moo", category: "display" },
    { name: "Syncopate", category: "sans-serif" },
    { name: "Tangerine", category: "handwriting" },
    { name: "Taprom", category: "display" },
    { name: "Tauri", category: "sans-serif" },
    { name: "Teko", category: "sans-serif" },
    { name: "Telex", category: "sans-serif" },
    { name: "Tenali Ramakrishna", category: "sans-serif" },
    { name: "Tenor Sans", category: "sans-serif" },
    { name: "Text Me One", category: "sans-serif" },
    { name: "The Girl Next Door", category: "handwriting" },
    { name: "Tienne", category: "serif" },
    { name: "Tinos", category: "serif" },
    { name: "Titan One", category: "display" },
    { name: "Titillium Web", category: "sans-serif" },
    { name: "Trade Winds", category: "display" },
    { name: "Trocchi", category: "serif" },
    { name: "Trochut", category: "display" },
    { name: "Trykker", category: "serif" },
    { name: "Tulpen One", category: "display" },
    { name: "Ubuntu", category: "sans-serif" },
    { name: "Ubuntu Condensed", category: "sans-serif" },
    { name: "Ubuntu Mono", category: "monospace" },
    { name: "Ultra", category: "serif" },
    { name: "UnifrakturCook", category: "display" },
    { name: "UnifrakturMaguntia", category: "display" },
    { name: "Unkempt", category: "display" },
    { name: "Unlock", category: "display" },
    { name: "Unna", category: "serif" },
    { name: "VT323", category: "monospace" },
    { name: "Vampiro One", category: "display" },
    { name: "Varela", category: "sans-serif" },
    { name: "Varela Round", category: "sans-serif" },
    { name: "Vast Shadow", category: "display" },
    { name: "Vibur", category: "handwriting" },
    { name: "Vidaloka", category: "serif" },
    { name: "Viga", category: "sans-serif" },
    { name: "Voces", category: "display" },
    { name: "Volkhov", category: "serif" },
    { name: "Vollkorn", category: "serif" },
    { name: "Voltaire", category: "sans-serif" },
    { name: "Waiting for the Sunrise", category: "handwriting" },
    { name: "Wallpoet", category: "display" },
    { name: "Walter Turncoat", category: "handwriting" },
    { name: "Warnes", category: "display" },
    { name: "Wellfleet", category: "display" },
    { name: "Wendy One", category: "sans-serif" },
    { name: "Wire One", category: "sans-serif" },
    { name: "Yanone Kaffeesatz", category: "sans-serif" },
    { name: "Yellowtail", category: "handwriting" },
    { name: "Yeseva One", category: "display" },
    { name: "Yesteryear", category: "handwriting" },
    { name: "Zeyada", category: "handwriting" },
  ];

  // Function to handle font selection
  const handleFontSelection = (fontName) => {
    if (!fontName) return;

    // Update preview settings
    const settings = {
      ...previewBgSettings,
      fontFamily: fontName,
      fontUrl: null, // Clear any uploaded font URL
    };
    setPreviewBgSettings(settings);
    setHasUnsavedChanges(true);

    // Apply font globally using context
    applyFontGlobally(fontName);

    // Check if font was applied successfully
    setTimeout(() => {
      const isAvailable = checkFontAvailability(fontName);

      if (!isAvailable) {
        forceRefreshFont(fontName);
      }
    }, 500);
  };

  // Function to manually trigger font application
  const manualApplyFont = () => {
    const currentFont = previewBgSettings.fontFamily;
    if (!currentFont) {
      alert("No font selected");
      return;
    }

    // Force apply the font
    applyFontGlobally(currentFont);

    // Also force refresh
    setTimeout(() => {
      forceRefreshFont(currentFont);
    }, 200);

    alert(`Font ${currentFont} manually applied. Check console for details.`);
  };

  // Function to test current font application
  const testCurrentFont = () => {
    const currentFont = previewBgSettings.fontFamily;
    if (!currentFont) {
      alert("No font selected");
      return;
    }

    // Check if font is available
    const isAvailable = checkFontAvailability(currentFont);

    // Check current CSS custom property
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue(
      "--wtf-font-family",
    );

    // Check body font
    const bodyFont = getComputedStyle(document.body).fontFamily;

    // Check html font
    const htmlFont = getComputedStyle(document.documentElement).fontFamily;

    // Show results
    alert(`Font Test Results:
Font: ${currentFont}
Available: ${isAvailable}
CSS Variable: ${cssVar}
Body Font: ${bodyFont}
HTML Font: ${htmlFont}`);
  };

  // Load selected font on component mount and when font changes
  useEffect(() => {
    if (previewBgSettings.fontFamily) {
      // Apply font immediately
      applyFontGlobally(previewBgSettings.fontFamily);

      // Also check and force refresh after a delay
      setTimeout(() => {
        const isAvailable = checkFontAvailability(previewBgSettings.fontFamily);
        if (!isAvailable) {
          forceRefreshFont(previewBgSettings.fontFamily);
        }
      }, 1000);
    }
  }, [
    previewBgSettings.fontFamily,
    applyFontGlobally,
    checkFontAvailability,
    forceRefreshFont,
  ]);

  const handleColorChange = (color) => {
    // Only apply preview, don't save to backend yet
    const settings = {
      backgroundType: "color",
      backgroundColor: color,
      backgroundImage: null,
      fontColor: previewBgSettings.fontColor,
    };
    setPreviewBgSettings(settings);
    setHasUnsavedChanges(true);
    setBgError(""); // Clear any previous errors
  };

  const handleFontColorChange = (color) => {
    setPreviewBgSettings((prev) => ({ ...prev, fontColor: color }));
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setBgError("");

      const response = await updateWtfSettings(previewBgSettings);

      // Update the context with saved settings
      updateBackgroundSettings(previewBgSettings);
      setHasUnsavedChanges(false);
      setBgSuccess("Background saved successfully!");
      setTimeout(() => setBgSuccess(""), 3000);
    } catch (error) {
      console.error("Error saving background:", error);
      console.error("Error details:", error.response?.data || error.message);
      setBgError(
        `Failed to save background: ${
          error.response?.data?.message || error.message
        }`,
      );
      setTimeout(() => setBgError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Dragging functions
  const handleMouseDown = (e) => {
    setIsDragging(true);

    // If this is the first drag, use the current computed position
    const currentX =
      dragPosition.x !== null ? dragPosition.x : window.innerWidth - 320 - 24;
    const currentY = dragPosition.y !== null ? dragPosition.y : 385;

    setInitialPosition({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setDragPosition({
          x: e.clientX - initialPosition.x,
          y: e.clientY - initialPosition.y,
        });
      }
    },
    [isDragging, initialPosition.x, initialPosition.y],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Dragging functions for Admin Controls panel
  const handleAdminMouseDown = (e) => {
    setIsAdminDragging(true);

    const currentX =
      adminDragPosition.x !== null
        ? adminDragPosition.x
        : window.innerWidth - 320 - 24; // default aligns with right-6
    const currentY = adminDragPosition.y !== null ? adminDragPosition.y : 96; // top-24 => 96px

    setAdminInitialPosition({
      x: e.clientX - currentX,
      y: e.clientY - currentY,
    });
  };

  const handleAdminMouseMove = useCallback(
    (e) => {
      if (isAdminDragging) {
        setAdminDragPosition({
          x: e.clientX - adminInitialPosition.x,
          y: e.clientY - adminInitialPosition.y,
        });
      }
    },
    [isAdminDragging, adminInitialPosition.x, adminInitialPosition.y],
  );

  const handleAdminMouseUp = useCallback(() => {
    setIsAdminDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add global mouse event listeners for admin dragging
  useEffect(() => {
    if (isAdminDragging) {
      document.addEventListener("mousemove", handleAdminMouseMove);
      document.addEventListener("mouseup", handleAdminMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleAdminMouseMove);
        document.removeEventListener("mouseup", handleAdminMouseUp);
      };
    }
  }, [isAdminDragging, handleAdminMouseMove, handleAdminMouseUp]);

  // Custom background style that uses preview settings
  const getPreviewBackgroundStyle = () => {
    if (
      previewBgSettings.backgroundType === "image" &&
      previewBgSettings.backgroundImage
    ) {
      return {
        backgroundImage: `url(${previewBgSettings.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: previewBgSettings.fontColor || undefined,
        fontFamily: previewBgSettings.fontFamily
          ? `"${previewBgSettings.fontFamily}", ${getFontCategory(
              previewBgSettings.fontFamily,
            )}`
          : undefined,
      };
    } else {
      return {
        backgroundColor: previewBgSettings.backgroundColor,
        color: previewBgSettings.fontColor || undefined,
        fontFamily: previewBgSettings.fontFamily
          ? `"${previewBgSettings.fontFamily}", ${getFontCategory(
              previewBgSettings.fontFamily,
            )}`
          : undefined,
      };
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setBgError(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed",
      );
      setTimeout(() => setBgError(""), 3000);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setBgError("File size too large. Maximum size is 5MB");
      setTimeout(() => setBgError(""), 3000);
      return;
    }

    try {
      setIsUploadingBg(true);
      setBgError("");

      const uploadResponse = await uploadWtfBackgroundImage(file);

      const imageUrl = uploadResponse.data?.imageUrl || uploadResponse.imageUrl;

      if (!imageUrl) {
        throw new Error("No image URL returned from upload");
      }

      const settings = {
        backgroundType: "image",
        backgroundColor: "#f8fafc",
        backgroundImage: imageUrl,
      };

      // Only set as preview, don't save yet
      setPreviewBgSettings(settings);
      setHasUnsavedChanges(true);
      setBgSuccess("Image uploaded! Click Save to apply.");
      setTimeout(() => setBgSuccess(""), 3000);
    } catch (error) {
      console.error("Image upload error:", error);
      console.error("Error details:", error.response?.data || error.message);
      setBgError(
        `Failed to upload image: ${
          error.response?.data?.message || error.message
        }`,
      );
      setTimeout(() => setBgError(""), 5000);
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleCreatePin = async (newPin) => {
    if (isCoach && newPin.studentId) {
      // This is a coach suggestion
      const suggestionData = {
        title: newPin.title,
        content: newPin.content,
        type: newPin.contentType,
        studentName: newPin.studentName,
        studentId: newPin.studentId,
        balagruha: newPin.balagruha,
        reason: newPin.reason,
        file: newPin.file,
      };
      const response = await createCoachSuggestion(suggestionData);
      if (!response.success) {
        throw new Error(response.message || "Failed to submit suggestion");
      }
      showToast("Suggestion submitted successfully! Admin will review it soon.", "success");
      setShowCreateModal(false);
    } else if (isStudent) {
      // This is a student submission
      const submissionData = {
        title: newPin.title,
        content: newPin.content || newPin.title,
        type: newPin.contentType,
        file: newPin.file,
        language: "english",
        tags: newPin.tags || [],
      };

      // Call appropriate submission API based on content type
      let response;
      if (newPin.contentType === "audio") {
        response = await submitVoiceNote(submissionData);
      } else if (
        newPin.contentType === "image" ||
        newPin.contentType === "video"
      ) {
        // Use multipart/form-data for media
        if (!(newPin.file instanceof File)) {
          throw new Error(
            "Please upload a valid file for image/video content.",
          );
        }
        const fd = new FormData();
        fd.append("title", newPin.title);
        fd.append("type", newPin.contentType);
        fd.append("file", newPin.file);
        // Optional fields
        fd.append("language", "english");
        (newPin.tags || []).forEach((t) => fd.append("tags[]", t));
        response = await submitWtfMedia(fd);
      } else {
        response = await submitArticle(submissionData);
      }

      if (!response.success) {
        throw new Error(response.message || "Failed to submit article");
      }

      alert(
        "Submission created successfully! It will be reviewed for the Wall of Fame.",
      );
      setShowCreateModal(false);
    } else {
      // This is an admin pin creation
      const response = await createWtfPin(newPin);
      if (!response.success) {
        throw new Error(response.message || "Failed to create pin");
      }
      setContent((prev) => [response.data, ...prev]);
      setShowCreateModal(false);
    }
  };

  const handleLikePin = async (pinId) => {
    try {
      const resp = await likeWtfPin(pinId, "thumbs_up");

      setContent((prev) => {
        return prev.map((pin) => {
          const currentId = pin.id || pin._id;
          if (currentId !== pinId) return pin;
          const currentLikes = pin.engagementMetrics?.likes ?? 0;
          const delta = resp?.data?.action === "unliked" ? -1 : 1;
          const newLikes = Math.max(0, currentLikes + delta);

          return {
            ...pin,
            engagementMetrics: {
              ...pin.engagementMetrics,
              likes: newLikes,
            },
          };
        });
      });

      // Update modal state if the liked pin is currently open
      setSelectedContent((prev) => {
        if (!prev) return prev;
        const currentId = prev.id || prev._id;
        if (currentId !== pinId) return prev;
        const currentLikes = prev.engagementMetrics?.likes ?? 0;
        const delta = resp?.data?.action === "unliked" ? -1 : 1;
        const newLikes = Math.max(0, currentLikes + delta);
        return {
          ...prev,
          engagementMetrics: {
            ...prev.engagementMetrics,
            likes: newLikes,
          },
        };
      });
    } catch (error) {
      console.error("Error liking pin:", error);
    }
  };

  const handleHeartPin = async (pinId) => {
    try {
      const resp = await loveWtfPin(pinId);

      setContent((prev) => {
        return prev.map((pin) => {
          const currentId = pin.id || pin._id;
          if (currentId !== pinId) return pin;
          const currentLoves = pin.engagementMetrics?.loves ?? 0;
          const delta = resp?.data?.action === "unloved" ? -1 : 1;
          const newLoves = Math.max(0, currentLoves + delta);

          return {
            ...pin,
            engagementMetrics: {
              ...pin.engagementMetrics,
              loves: newLoves,
            },
          };
        });
      });

      // Update modal state if the loved pin is currently open
      setSelectedContent((prev) => {
        if (!prev) return prev;
        const currentId = prev.id || prev._id;
        if (currentId !== pinId) return prev;
        const currentLoves = prev.engagementMetrics?.loves ?? 0;
        const delta = resp?.data?.action === "unloved" ? -1 : 1;
        const newLoves = Math.max(0, currentLoves + delta);
        return {
          ...prev,
          engagementMetrics: {
            ...prev.engagementMetrics,
            loves: newLoves,
          },
        };
      });
    } catch (error) {
      console.error("Error hearting pin:", error);
    }
  };

  const handleMarkAsSeen = async (pinId) => {
    try {
      await markWtfPinAsSeen(pinId, 1);
      setContent((prev) =>
        prev.map((pin) => {
          const currentId = pin.id || pin._id;
          if (currentId !== pinId) return pin;
          if (pin.engagementMetrics) {
            const currentSeen = pin.engagementMetrics.seen ?? 0;
            return {
              ...pin,
              engagementMetrics: {
                ...pin.engagementMetrics,
                seen: currentSeen + 1,
              },
            };
          }
          return { ...pin, isSeen: true };
        }),
      );
    } catch (error) {
      console.error("Error marking pin as seen:", error);
    }
  };

  const renderTypeIcon = (type) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case "photo":
      case "image":
        return <Camera className={`${iconClass} text-blue-600`} />;
      case "video":
        return <Play className={`${iconClass} text-blue-600`} />;
      case "audio":
        return <Volume2 className={`${iconClass} text-blue-600`} />;
      case "text":
        return <FileText className={`${iconClass} text-blue-600`} />;
      default:
        return null;
    }
  };

  const getCardBackground = (type, thumbnail, mediaUrl) => {
    switch (type) {
      case "photo":
      case "image":
        // Use thumbnail first, then mediaUrl, or default to gray background
        const imageUrl = thumbnail || mediaUrl;

        return imageUrl
          ? {
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "#f3f4f6" };
      case "video":
        // Use thumbnail first, then fallback to blue background
        const videoThumbnail = thumbnail || mediaUrl;

        return videoThumbnail
          ? {
              backgroundImage: `url(${videoThumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: "#dbeafe" };
      case "audio":
        return { backgroundColor: "#fce7f3" };
      case "text":
        return { backgroundColor: "#f0fdf4" };
      default:
        return { backgroundColor: "#f3f4f6" };
    }
  };

  const getPostageStampStyle = () => ({
    backgroundImage: `
      radial-gradient(circle at 0% 50%, transparent 3px, #fefce8 3px),
      radial-gradient(circle at 100% 50%, transparent 3px, #fefce8 3px),
      radial-gradient(circle at 50% 0%, transparent 3px, #fefce8 3px),
      radial-gradient(circle at 50% 100%, transparent 3px, #fefce8 3px)
    `,
    backgroundSize: "8px 100%, 8px 100%, 100% 8px, 100% 8px",
    backgroundPosition: "left center, right center, center top, center bottom",
    backgroundRepeat: "repeat-y, repeat-y, repeat-x, repeat-x",
    border: "2px solid #d1d5db",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  });

  const renderCard = (item) => {
    const pinId = item._id || item.id;
    const isViewed = hasStudentViewedPin(pinId);

    return (
      <div
        key={pinId}
        className={`bg-yellow-50 p-4 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-xl relative ${
          isViewed
            ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
            : ""
        }`}
        title={
          isViewed
            ? "Pin already viewed - click to view again"
            : "Click to view pin"
        }
        style={{
          transform: `rotate(${Math.random() * 6 - 3}deg)`,
          ...getPostageStampStyle(),
          ...(isViewed && { borderColor: "#9ca3af" }), // Subtle border color change for viewed pins
          filter: isViewed ? "grayscale(100%)" : "none", // Ensure grayscale works
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePinClick(item);
        }}
      >
        {item.isOfficial && (
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
            <Badge className="bg-purple-600 text-white text-xs px-2 py-1">
              ISF Official
            </Badge>
            {item.officialCategory && (
              <Badge
                className={`text-white text-xs px-2 py-1 ${
                  item.officialCategory === "mann-ki-baat"
                    ? "bg-purple-700"
                    : item.officialCategory === "op-ed"
                      ? "bg-indigo-600"
                      : item.officialCategory === "isf-updates"
                        ? "bg-teal-600"
                        : "bg-gray-600"
                }`}
              >
                {item.officialCategory === "mann-ki-baat"
                  ? "🎙️ Mann Ki Baat"
                  : item.officialCategory === "op-ed"
                    ? "📝 Op Ed"
                    : item.officialCategory === "isf-updates"
                      ? "📢 ISF Updates"
                      : "Official"}
              </Badge>
            )}
          </div>
        )}
        {isViewed && (
          <div className="absolute top-2 right-2 z-20">
            <Badge className="bg-gray-500 text-white text-xs">Viewed</Badge>
          </div>
        )}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-red-600 shadow-lg z-10"></div>

        <div
          className="w-full h-32 mb-3 rounded border-2 border-gray-300 overflow-hidden flex items-center justify-center relative"
          style={getCardBackground(item.type, item.thumbnailUrl, item.mediaUrl)}
        >
          {/* Show placeholder only when no thumbnail/image is available */}
          {!item.thumbnailUrl && !(item.type === "image" && item.mediaUrl) ? (
            <div className="text-center">
              <div className="mb-2 flex justify-center opacity-60">
                {renderTypeIcon(item.type)}
              </div>
              <p className="text-xs text-gray-600 font-medium">{item.title}</p>
            </div>
          ) : null}

          {/* Show play button overlay for video thumbnails */}
          {item.type === "video" && item.thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-0 h-0 border-l-[12px] border-l-blue-600 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1"></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-2 text-xs">
          <div className="flex items-center gap-1 bg-transparent p-0">
            <Eye className="w-3 h-3 text-gray-600" />
            <span className="text-gray-700 font-medium">
              {item.engagementMetrics?.seen ?? item.views ?? 0}
            </span>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 hover:opacity-80 bg-transparent border-0 p-0 shadow-none outline-none focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleHeartPin(item.id || item._id);
            }}
            aria-label="Love"
          >
            <Heart className="w-3 h-3 text-green-500" />
            <span className="text-gray-700 font-medium">
              {item.engagementMetrics?.loves ?? 0}
            </span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 hover:opacity-80 bg-transparent border-0 p-0 shadow-none outline-none focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLikePin(item.id || item._id);
            }}
            aria-label="Like"
          >
            <ThumbsUp className="w-3 h-3 text-pink-500" />
            <span className="text-gray-700 font-medium">
              {item.engagementMetrics?.likes ?? 0}
            </span>
          </button>
        </div>

        {item.type === "photo" && (
          <h3 className="text-center text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
            {item.title}
          </h3>
        )}
      </div>
    );
  };

  // Dynamic background style based on settings
  const backgroundStyle = backgroundSettings.image
    ? {
        backgroundImage: `linear-gradient(to bottom right, rgba(34, 197, 94, ${
          backgroundSettings.opacity / 100
        }), rgba(34, 197, 94, ${backgroundSettings.opacity / 100})), url(${
          backgroundSettings.image
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `linear-gradient(to bottom right, ${backgroundSettings.color
          .replace("from-", "")
          .replace("via-", "")
          .replace("to-", "")
          .split(" ")
          .join(", ")})`,
      };

  // Function to check computed styles for font application
  const checkComputedStyles = () => {
    const currentFont = previewBgSettings.fontFamily;
    if (!currentFont) {
      alert("No font selected");
      return;
    }

    // Check various elements
    const elements = [
      { name: "HTML", element: document.documentElement },
      { name: "Body", element: document.body },
      {
        name: "Main WTF div",
        element: document.querySelector("[data-wtf-section]"),
      },
      { name: "WTF content", element: document.querySelector(".wtf-content") },
      { name: "First h1", element: document.querySelector("h1") },
      { name: "First p", element: document.querySelector("p") },
    ];

    elements.forEach(({ name, element }) => {
      if (element) {
        const computedStyle = getComputedStyle(element);
        const fontFamily = computedStyle.fontFamily;

        // Check if our font is in the computed style
        if (fontFamily.includes(currentFont)) {
        } else {
        }
      }
    });

    // Show summary
    const hasFont = elements.some(({ name, element }) => {
      if (element) {
        const computedStyle = getComputedStyle(element);
        return computedStyle.fontFamily.includes(currentFont);
      }
      return false;
    });

    alert(`Computed Styles Check:
Font: ${currentFont}
Font Applied: ${hasFont ? "YES" : "NO"}
Check console for detailed results.`);
  };

  return (
    <div
      className="min-h-screen flex w-full h-screen transition-all duration-300"
      style={getPreviewBackgroundStyle()}
      data-wtf-section="true"
    >
      {/* Left Sidebar - CLIENT REQUEST: Temporarily hidden until further notice */}
      {/* Client wants ability to restore this later, so commenting out instead of deleting */}
      {/*
      <div
        className={`${
          isSidebarCollapsed ? "w-16" : "w-64"
        } bg-white border-r flex-shrink-0 transition-all duration-300`}
      >
        <CoursesSection isCollapsed={isSidebarCollapsed} />
      </div>
      */}

      {/* Main content area */}
      <div className="flex-1 relative wtf-content">
        {/* Admin Controls - Only show for admins */}
        {(isAdmin || forceShowAdminControls) && (
          <div
            className={`fixed z-40 bg-white rounded-lg shadow-xl border-2 border-purple-200 p-4 w-80 ${
              isAdminDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              top: adminDragPosition.y !== null ? adminDragPosition.y : 96, // top-24
              left:
                adminDragPosition.x !== null
                  ? adminDragPosition.x
                  : window.innerWidth - 320 - 24, // right-6
              transition: isAdminDragging ? "none" : "all 0.2s ease",
            }}
          >
            <div
              className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleAdminMouseDown}
            >
              <span className="text-xs text-gray-400 select-none">⠿</span>
              <Settings className="w-5 h-5" />
              Admin Controls
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsAdminPanelMinimized((v) => !v)}
                  className="p-1 rounded hover:bg-purple-50 text-purple-800"
                  title={isAdminPanelMinimized ? "Expand" : "Minimize"}
                >
                  {isAdminPanelMinimized ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isAdminPanelMinimized && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-base px-4 py-3 rounded-md flex items-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create New Pin
                </button>

                {onToggleView && (
                  <button
                    onClick={onToggleView}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white text-base px-4 py-3 rounded-md flex items-center gap-2 font-medium"
                  >
                    <Settings className="w-5 h-5" />
                    Full Management
                  </button>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Pending Suggestions:</span>
                      <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded font-medium">
                        {adminCounts.pendingSuggestions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>New Submissions:</span>
                      <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded font-medium">
                        {adminCounts.newSubmissions}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Review Queue ({adminCounts.reviewQueue})
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={refreshViewedPins}
                      className="w-full bg-gray-500 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded flex items-center gap-2 justify-center"
                      title="Refresh viewed pins from backend"
                    >
                      <Eye className="w-4 h-4" />
                      Refresh Viewed Pins
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Background Settings Card - Only show for admins */}
        {(isAdmin || forceShowAdminControls) && (
          <div
            className={`fixed z-40 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-4 w-80 ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              top: dragPosition.y !== null ? dragPosition.y : 385, // default to top-96 equivalent (384px)
              left:
                dragPosition.x !== null
                  ? dragPosition.x
                  : window.innerWidth - 320 - 24, // default to right-6
              transition: isDragging ? "none" : "all 0.2s ease",
            }}
          >
            <div
              className="text-md font-semibold text-blue-800 mb-3 flex items-center gap-2 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <span className="text-xs text-gray-400 select-none">⠿</span>
              <Palette className="w-4 h-4" />
              Quick Background Settings
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsBgPanelMinimized((v) => !v)}
                  className="p-1 rounded hover:bg-blue-50 text-blue-800"
                  title={isBgPanelMinimized ? "Expand" : "Minimize"}
                >
                  {isBgPanelMinimized ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isBgPanelMinimized && (
              <>
                {/* Success/Error Messages */}
                {bgSuccess && (
                  <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded text-green-700 text-xs">
                    {bgSuccess}
                  </div>
                )}
                {bgError && (
                  <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">
                    {bgError}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Color Picker */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={previewBgSettings.backgroundColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                        title="Choose any background color"
                      />
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded border">
                        {previewBgSettings.backgroundColor}
                      </span>
                    </div>
                    {/* Font Color */}
                    <div className="flex items-center gap-2 mt-3">
                      <label className="text-xs text-gray-600">
                        Font Color:
                      </label>
                      <input
                        type="color"
                        value={previewBgSettings.fontColor || "#0f172a"}
                        onChange={(e) => handleFontColorChange(e.target.value)}
                        className="w-10 h-6 border border-gray-300 rounded cursor-pointer"
                        title="Choose text color"
                      />
                      <span className="text-[10px] font-mono text-gray-500">
                        {previewBgSettings.fontColor || "#0f172a"}
                      </span>
                    </div>
                  </div>

                  {/* Font Controls */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Font
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={previewBgSettings.fontFamily || ""}
                        onChange={(e) => handleFontSelection(e.target.value)}
                        className="flex-1 text-xs px-2 py-1 border rounded"
                      >
                        <option value="">Select a font</option>
                        {[
                          ...new Map(
                            googleFonts.map((f) => [f.name, f]),
                          ).values(),
                        ].map((font) => (
                          <option key={font.name} value={font.name}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font Debug Info */}
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-xs text-yellow-700 mb-1">
                        Debug Info:
                      </div>
                      <div className="text-xs text-yellow-600 space-y-1">
                        <div>
                          Selected Font:{" "}
                          {previewBgSettings.fontFamily || "None"}
                        </div>
                        <div>
                          CSS Variable:{" "}
                          {typeof window !== "undefined"
                            ? getComputedStyle(
                                document.documentElement,
                              ).getPropertyValue("--wtf-font-family")
                            : "N/A"}
                        </div>
                        <div>
                          Body Font:{" "}
                          {typeof window !== "undefined"
                            ? getComputedStyle(document.body).fontFamily
                            : "N/A"}
                        </div>
                      </div>
                      <button
                        onClick={manualApplyFont}
                        className="mt-2 w-full text-xs px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                      >
                        Manual Apply Font
                      </button>
                      <button
                        onClick={checkComputedStyles}
                        className="mt-2 w-full text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded hover:bg-orange-300"
                      >
                        Check Computed Styles
                      </button>
                    </div>

                    {/* Selected Font Preview */}
                    {previewBgSettings.fontFamily && (
                      <div className="mt-2 p-2 bg-gray-50 rounded border">
                        <div className="text-xs text-gray-600 mb-1">
                          Preview:
                        </div>
                        <div
                          className="text-sm"
                          style={{
                            fontFamily: `"${
                              previewBgSettings.fontFamily
                            }", ${getFontCategory(
                              previewBgSettings.fontFamily,
                            )}`,
                          }}
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {previewBgSettings.fontFamily} (
                          {getFontCategory(previewBgSettings.fontFamily)})
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              forceRefreshFont(previewBgSettings.fontFamily)
                            }
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Force Apply Font
                          </button>
                          <button
                            onClick={() => {
                              const isAvailable = checkFontAvailability(
                                previewBgSettings.fontFamily,
                              );

                              alert(
                                `Font ${previewBgSettings.fontFamily} is ${
                                  isAvailable ? "available" : "not available"
                                }`,
                              );
                            }}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Check Font Status
                          </button>
                          <button
                            onClick={testCurrentFont}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Test Font
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Background Image
                    </label>
                    <div className="border border-dashed border-gray-300 rounded p-3 text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="bg-image-upload-compact"
                        disabled={isUploadingBg}
                      />
                      <label
                        htmlFor="bg-image-upload-compact"
                        className={`cursor-pointer flex flex-col items-center ${
                          isUploadingBg ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        {isUploadingBg ? (
                          <Loader className="w-5 h-5 animate-spin text-blue-600 mb-1" />
                        ) : (
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        )}
                        <span className="text-xs text-gray-600">
                          {isUploadingBg ? "Uploading..." : "Upload Image"}
                        </span>
                      </label>
                    </div>

                    {/* Inline Preview of selected (unsaved) background image */}
                    {previewBgSettings.backgroundType === "image" &&
                      previewBgSettings.backgroundImage && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">
                              Preview
                            </span>
                            <span className="text-[10px] text-amber-600">
                              Unsaved
                            </span>
                          </div>
                          <div
                            className="w-full h-24 rounded border bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${previewBgSettings.backgroundImage})`,
                            }}
                          />
                        </div>
                      )}

                    {/* Image Controls */}
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => {
                          const testImageUrl =
                            "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop";
                          const settings = {
                            backgroundType: "image",
                            backgroundColor: "#f8fafc",
                            backgroundImage: testImageUrl,
                          };
                          setPreviewBgSettings(settings);
                          setHasUnsavedChanges(true);
                          setBgSuccess(
                            "Test image applied! Click Save to apply.",
                          );
                          setTimeout(() => setBgSuccess(""), 3000);
                        }}
                        className="w-full text-xs py-1 px-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                      >
                        Test with Sample Image
                      </button>

                      {/* Remove Image Button - only show if image is applied */}
                      {previewBgSettings.backgroundType === "image" &&
                        previewBgSettings.backgroundImage && (
                          <button
                            onClick={() => {
                              const settings = {
                                backgroundType: "color",
                                backgroundColor: "#f8fafc", // Default color
                                backgroundImage: null,
                              };
                              setPreviewBgSettings(settings);
                              setHasUnsavedChanges(true);
                              setBgSuccess("Background image removed!");
                              setTimeout(() => setBgSuccess(""), 2000);
                            }}
                            className="w-full text-xs py-1 px-2 bg-red-50 hover:bg-red-100 rounded text-red-600 transition-colors flex items-center justify-center gap-1"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Remove Image
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Save Button and Status */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {hasUnsavedChanges && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                            Unsaved changes
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleSaveSettings}
                        disabled={!hasUnsavedChanges || isSaving}
                        className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                          hasUnsavedChanges && !isSaving
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {isSaving ? (
                          <div className="flex items-center gap-2">
                            <Loader className="w-4 h-4 animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          "Save Background"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col h-screen w-full">
          {/* Fixed Header */}
          <div className="p-6 space-y-6 bg-white flex-shrink-0">
            {/* Categories Section - CLIENT REQUEST: Temporarily hidden until further notice */}
            {/* Client wants ability to restore this later, so commenting out instead of deleting */}
            {/*
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <CategoryButtons
                  onCategoryChange={(category) => setSelectedCategory(category)}
                  selectedCategory={selectedCategory.name}
                  hiddenNames={["All", "Mann Ki Baat", "Op Ed", "ISF Updates"]}
                />
              </div>
            </div>
            */}

            {/* Moved type filter bar into the former Levels section and placed action buttons here */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTypeFilters([])}
                className={`px-3 py-1 rounded-full border text-sm ${
                  activeTypeFilters.length === 0
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                All
              </button>
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggleTypeFilter(opt.key)}
                  className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${
                    activeTypeFilters.includes(opt.key)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  {renderTypeIcon(opt.key === "image" ? "photo" : opt.key)}
                  {opt.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGroupByType((v) => !v)}
                  className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${
                    groupByType
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                  title="Group pins by type"
                >
                  {groupByType ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {groupByType ? "Grouped by type" : "Group by type"}
                </button>
                {isStudent && (
                  <>
                    <button
                      id="btn-wtf-share-voice"
                      onClick={() => {
                        setShowVoiceModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      title="Suggest a Topic for a Talk!"
                    >
                      <Mic className="w-4 h-4" /> Suggest a Topic!
                    </button>
                    <button
                      id="btn-wtf-write-story"
                      onClick={() => setShowArticleEditor(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      title="Write a Story"
                    >
                      <FileText className="w-4 h-4" /> Write a Story
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div
            className="flex-1 p-6 relative overflow-y-auto"
            style={backgroundStyle}
          >
            {/* Decorative icons scattered around */}
            <div className="absolute top-8 left-8 opacity-30">
              <div className="w-8 h-8 border-4 border-green-700 rounded-full"></div>
            </div>
            <div className="absolute top-12 right-12 opacity-30">
              <div className="w-6 h-6 border-3 border-green-700 rounded"></div>
            </div>
            <div className="absolute bottom-8 left-12 opacity-30">
              <Camera className="w-8 h-8 text-green-700" />
            </div>
            <div className="absolute bottom-12 right-8 opacity-30">
              <FileText className="w-6 h-6 text-green-700" />
            </div>

            <div className="text-center mb-8">
              {/* My Wall of FAME Main Image */}
              <img
                src="/mywalloffamemain.png"
                alt="My Wall of FAME"
                className="mx-auto mb-2 relative z-10 w-[420px] max-w-full drop-shadow-lg"
              />

              {/* Category Indicator */}
              {selectedCategory.isOfficial && (
                <div className="mt-4">
                  <Badge
                    className={`text-white text-lg px-4 py-2 ${
                      selectedCategory.category === "mann-ki-baat"
                        ? "bg-purple-700"
                        : selectedCategory.category === "op-ed"
                          ? "bg-indigo-600"
                          : selectedCategory.category === "isf-updates"
                            ? "bg-teal-600"
                            : "bg-purple-600"
                    }`}
                  >
                    {selectedCategory.category === "mann-ki-baat"
                      ? "🎙️ Mann Ki Baat"
                      : selectedCategory.category === "op-ed"
                        ? "📝 Op Ed"
                        : selectedCategory.category === "isf-updates"
                          ? "📢 ISF Updates"
                          : "📢 Official Content"}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedCategory.category === "mann-ki-baat"
                      ? "Official podcasts and audio content from ISF"
                      : selectedCategory.category === "op-ed"
                        ? "Opinion editorial content and articles"
                        : selectedCategory.category === "isf-updates"
                          ? "Official ISF announcements and updates"
                          : "Official ISF content curated for the community"}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full mx-auto px-4 mb-8">
              {/* Filter Bar moved to header; removed here */}

              {/* Content Count and Filter Status */}

              {filteredContent.length > 0 ? (
                !groupByType ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center pb-8">
                    {sortedContent.map((item, index) => (
                      <div
                        key={item._id || item.id}
                        className="w-[180px]"
                        style={{
                          marginTop: `${(index % 4) * 10}px`,
                        }}
                      >
                        {renderCard(item)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-10 pb-8">
                    {TYPE_OPTIONS.map((opt) => {
                      const items = groupedByType[opt.key] || [];
                      if (!items.length) return null;
                      return (
                        <div key={opt.key}>
                          <div className="flex items-center gap-2 mb-3">
                            {renderTypeIcon(
                              opt.key === "image" ? "photo" : opt.key,
                            )}
                            <h3 className="text-xl font-semibold">
                              {opt.label} ({items.length})
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
                            {items.map((item, index) => (
                              <div
                                key={item._id || item.id}
                                className="w-[180px]"
                                style={{
                                  marginTop: `${(index % 4) * 10}px`,
                                }}
                              >
                                {renderCard(item)}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
                    <div className="text-6xl mb-4">📌</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {activeTypeFilters.length
                        ? "No pins for selected filters"
                        : "No Pins Yet"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {activeTypeFilters.length
                        ? "Try clearing or changing the filters at the top."
                        : "The Wall of Fame is waiting for amazing content! "}
                      {isAdmin || forceShowAdminControls ? (
                        <span>
                          Create the first pin to get started, or review pending
                          submissions.
                        </span>
                      ) : isCoach ? (
                        <span>
                          Suggest student work to be featured on the Wall of
                          Fame.
                        </span>
                      ) : (
                        <span>
                          Submit your work to be featured on the Wall of Fame.
                        </span>
                      )}
                    </p>
                    {(isAdmin || forceShowAdminControls) && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        <Plus className="w-5 h-5 inline mr-2" />
                        Create First Pin
                      </button>
                    )}
                    {isCoach && (
                      <>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-3"
                        >
                          <Plus className="w-5 h-5 inline mr-2" />
                          Suggest Pin
                        </button>
                        <div className="text-sm text-gray-500">
                          💡 Tip: Review student work and suggest exceptional
                          pieces for the Wall of Fame
                        </div>
                      </>
                    )}
                    {/* {isStudent && (
                      <>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mb-3"
                        >
                          <Plus className="w-5 h-5 inline mr-2" />
                          Create Pin
                        </button>
                        <div className="text-sm text-gray-500">
                          💡 Share your amazing work, voice notes, or articles!
                        </div>
                      </>
                    )} */}
                    {!isAdmin && !isCoach && !isStudent && (
                      <div className="text-sm text-gray-500">
                        💡 Tip: Submit your voice notes or articles to be
                        featured here
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Floating Action Buttons remain visible */}
              {isCoach && (
                <div className="fixed bottom-8 right-8 z-50">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    title="Suggest student work for the Wall of Fame"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )}
              {/* {isStudent && (
                <div className="fixed bottom-8 right-8 z-50">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    title="Create your own pin for the Wall of Fame"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              )} */}
            </div>
          </div>
          {/* Voice suggestion modal */}
          <VoiceSuggestionModal
            open={showVoiceModal}
            onClose={() => {
              setShowVoiceModal(false);
            }}
          />

          {/* Article editor modal */}
          <ArticleEditor
            isOpen={showArticleEditor}
            onClose={() => setShowArticleEditor(false)}
          />
        </div>
      </div>

      {/* Sophisticated Modals */}
      {selectedContent && modalType === "photo" && (
        <>
          {/* Debug info */}

          <ImageViewer
            isOpen={true}
            onClose={closeModal}
            imageSrc={selectedContent.mediaUrl || selectedContent.content}
            title={selectedContent.title}
            author={selectedContent.author}
            caption={selectedContent.caption}
            likes={selectedContent.engagementMetrics?.likes || 0}
            hearts={selectedContent.engagementMetrics?.loves || 0}
            views={selectedContent.engagementMetrics?.seen || 0}
            isOfficial={selectedContent.isOfficial}
            officialCategory={selectedContent.officialCategory}
            onLike={() =>
              handleLikePin(selectedContent.id || selectedContent._id)
            }
            onHeart={() =>
              handleHeartPin(selectedContent.id || selectedContent._id)
            }
            isStudent={isStudent}
            studentName={selectedContent.studentName}
            balagruha={selectedContent.balagruha}
            metadata={selectedContent.metadata}
            createdAt={selectedContent.createdAt}
          />
        </>
      )}

      {selectedContent && modalType === "video" && (
        <VideoPlayer
          isOpen={true}
          onClose={closeModal}
          videoSrc={selectedContent.mediaUrl || selectedContent.content}
          title={selectedContent.title}
          author={selectedContent.author}
          caption={selectedContent.caption}
          likes={selectedContent.engagementMetrics?.likes || 0}
          hearts={selectedContent.engagementMetrics?.loves || 0}
          views={selectedContent.engagementMetrics?.seen || 0}
          isOfficial={selectedContent.isOfficial}
          officialCategory={selectedContent.officialCategory}
          onLike={() =>
            handleLikePin(selectedContent.id || selectedContent._id)
          }
          onHeart={() =>
            handleHeartPin(selectedContent.id || selectedContent._id)
          }
          isStudent={isStudent}
          studentName={selectedContent.studentName}
          balagruha={selectedContent.balagruha}
          metadata={selectedContent.metadata}
          createdAt={selectedContent.createdAt}
        />
      )}

      {selectedContent && modalType === "audio" && (
        <AudioPlayer
          isOpen={true}
          onClose={closeModal}
          audioSrc={selectedContent.mediaUrl || selectedContent.content}
          title={selectedContent.title}
          author={selectedContent.author}
          caption={selectedContent.caption}
          // Pass persisted duration if available for accurate seekbar init
          durationSeconds={selectedContent.duration}
          likes={selectedContent.engagementMetrics?.likes || 0}
          hearts={selectedContent.engagementMetrics?.loves || 0}
          views={selectedContent.engagementMetrics?.seen || 0}
          isOfficial={selectedContent.isOfficial}
          officialCategory={selectedContent.officialCategory}
          onLike={() =>
            handleLikePin(selectedContent.id || selectedContent._id)
          }
          onHeart={() =>
            handleHeartPin(selectedContent.id || selectedContent._id)
          }
          isStudent={isStudent}
          studentName={selectedContent.studentName}
          balagruha={selectedContent.balagruha}
          metadata={selectedContent.metadata}
          createdAt={selectedContent.createdAt}
        />
      )}

      {selectedContent && modalType === "text" && (
        <TextReader
          isOpen={true}
          onClose={closeModal}
          title={selectedContent.title}
          content={selectedContent.content}
          author={selectedContent.author}
          caption={selectedContent.caption}
          likes={selectedContent.engagementMetrics?.likes || 0}
          hearts={selectedContent.engagementMetrics?.loves || 0}
          views={selectedContent.engagementMetrics?.seen || 0}
          isOfficial={selectedContent.isOfficial}
          officialCategory={selectedContent.officialCategory}
          onLike={() =>
            handleLikePin(selectedContent.id || selectedContent._id)
          }
          onHeart={() =>
            handleHeartPin(selectedContent.id || selectedContent._id)
          }
          isStudent={isStudent}
          studentName={selectedContent.studentName}
          balagruha={selectedContent.balagruha}
          metadata={selectedContent.metadata}
          createdAt={selectedContent.createdAt}
        />
      )}

      {/* Create New Pin Modal */}
      <CreateNewPinModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreatePin={handleCreatePin}
        isCoachMode={isCoach}
        isStudentMode={isStudent}
        userRole={isAdmin ? "admin" : isCoach ? "coach" : "student"}
      />
    </div>
  );
};

// Wrapper component with background provider
const WallOfFame = (props) => {
  return (
    <WtfBackgroundProvider>
      <WallOfFameContent {...props} />
    </WtfBackgroundProvider>
  );
};

export default WallOfFame;
