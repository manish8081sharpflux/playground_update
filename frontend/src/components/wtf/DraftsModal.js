import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  Volume2,
  ExternalLink,
  Calendar,
  Clock,
  Edit,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { getWtfDrafts, deleteWtfPin } from "../../api";
import { useAuth } from "../../contexts/AuthContext";

const DraftsModal = ({ isOpen, onClose, onSelectDraft, onDraftDeleted }) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch drafts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDrafts();
    }
  }, [isOpen]);

  const fetchDrafts = async () => {
    setLoading(true);
    setError("");
    try {
      // Backend will use the authenticated user's ID from JWT token
      const response = await getWtfDrafts({ limit: 50 });

      if (response.success) {
        setDrafts(response.data?.pins || response.data || []);
      } else {
        setError(response.message || "Failed to fetch drafts");
      }
    } catch (error) {
      console.error("Error fetching drafts:", error);
      setError("Failed to fetch drafts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) {
      return;
    }

    try {
      const response = await deleteWtfPin(draftId);
      if (response.success) {
        setDrafts((prev) => prev.filter((draft) => draft._id !== draftId));
        if (onDraftDeleted) {
          onDraftDeleted(draftId);
        }
      } else {
        setError(response.message || "Failed to delete draft");
      }
    } catch (error) {
      console.error("Error deleting draft:", error);
      setError("Failed to delete draft. Please try again.");
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case "text":
        return <FileText className="w-4 h-4" />;
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Volume2 className="w-4 h-4" />;
      case "link":
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Drafts</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600">Loading drafts...</span>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No drafts found
            </h3>
            <p className="text-gray-500">
              You don't have any saved drafts yet. Start creating a pin and save
              it as a draft.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {drafts.map((draft) => (
              <div
                key={draft._id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => onSelectDraft(draft)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        {getContentTypeIcon(draft.type)}
                        <span className="text-sm font-medium capitalize">
                          {draft.type}
                        </span>
                      </div>
                      {draft.isOfficial && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Official
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {draft.title}
                    </h3>

                    {draft.content && (
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {draft.content}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(draft.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(draft.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDraft(draft);
                      }}
                      className="h-8 px-3"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDraft(draft._id);
                      }}
                      className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DraftsModal;
