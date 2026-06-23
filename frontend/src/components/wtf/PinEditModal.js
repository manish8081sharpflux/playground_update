import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog.jsx";
import { Input } from "../ui/input.jsx";
import { Button } from "../ui/button.jsx";

const PinEditModal = ({ isOpen, onClose, pin, onUpdatePin }) => {
  const [formData, setFormData] = useState({
    title: "",
    caption: "",
    content: "",
    isOfficial: false,
  });

  useEffect(() => {
    if (pin) {
      setFormData({
        title: pin.title,
        caption: pin.caption || "",
        content: pin.content,
        isOfficial: pin.isOfficial,
      });
    }
  }, [pin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) return;

    const updatedPin = {
      ...pin,
      title: formData.title,
      caption: formData.caption,
      content: formData.content,
      isOfficial: formData.isOfficial,
    };

    onUpdatePin(updatedPin);
  };

  const renderContentInput = () => {
    switch (pin?.contentType) {
      case "text":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        );

      case "link":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">URL</label>
            <Input
              type="url"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
            />
          </div>
        );

      case "image":
      case "video":
      case "audio":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Content URL
            </label>
            <Input
              type="url"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="Media file URL"
            />
            <p className="text-sm text-gray-500 mt-1">
              Note: To replace the file, you would need to upload a new one
              through your media management system.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!pin) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-gray-100 rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold mb-6 text-center">Edit WTF Pin</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Pin Title *
              </label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pin Caption
              </label>
              <textarea
                value={formData.caption}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, caption: e.target.value }))
                }
                placeholder="Short description or caption"
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {renderContentInput()}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOfficialEdit"
                checked={formData.isOfficial}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isOfficial: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <label htmlFor="isOfficialEdit" className="text-sm font-medium">
                Mark as "ISF Official Post"
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <strong>Content Type:</strong> {pin.type}
                </div>
                <div>
                  <strong>Originally Pinned:</strong>{" "}
                  {new Date(pin.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <strong>Expires:</strong>{" "}
                  {new Date(pin.expiresAt).toLocaleDateString()}
                </div>
                {pin.originalAuthor && (
                  <div>
                    <strong>Original Author:</strong> {pin.originalAuthor}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Update Pin
              </Button>
              <Button type="button" onClick={onClose} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinEditModal;
