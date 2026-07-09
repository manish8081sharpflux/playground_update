import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "../../ui/dialog.jsx";
import { Input } from "../../ui/input.jsx";
import { Button } from "../../ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select.tsx";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Eraser,
  X,
  Send,
  Save,
} from "lucide-react";
import { submitArticle } from "../../../api";
import showToast from "../../../utils/toast";

const ArticleEditor = ({ isOpen, onClose }) => {
  const editorRef = useRef(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("english");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Reset state when opened
    setIsSubmitting(false);
  }, [isOpen]);

  const applyCommand = (command, value = null) => {
    try {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
    } catch (_) {}
  };

  const clearFormatting = () => {
    try {
      document.execCommand("removeFormat", false, null);
      editorRef.current?.focus();
    } catch (_) {}
  };

  const getPlainText = () => {
    const div = document.createElement("div");
    div.innerHTML = bodyHtml || "";
    return (div.textContent || div.innerText || "").trim();
  };

  const handleSubmit = async (isDraft = false) => {
    if (!title.trim()) {
      showToast("Please enter a title.", "error");
      return;
    }
    const plain = getPlainText();
    if (!plain) {
      showToast("Please write your story.", "error");
      return;
    }
    if (plain.length < 10) {
      showToast("Please write at least 10 characters.", "error");
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        // Send the HTML body captured from the editor
        content: editorRef.current?.innerHTML || bodyHtml,
        language,
        isDraft,
        type: "article",
      };
      const resp = await submitArticle(payload);
      if (resp?.success) {
        if (isDraft) {
          showToast("Draft saved!", "success");
        } else {
          showToast("Your story has been submitted for review!", "success");
        }
        setTitle("");
        setBodyHtml("");
        // Clear the contentEditable area explicitly since it's now uncontrolled
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        setLanguage("english");
        onClose?.();
      } else {
        showToast(resp?.message || "Failed to submit story.", "error");
      }
    } catch (err) {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose?.() : null)}>
      <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
          <h3 className="text-lg font-semibold">Article Editor</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your story a title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md">
            <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
              <button
                type="button"
                onClick={() => applyCommand("bold")}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand("italic")}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand("insertUnorderedList")}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Bulleted list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand("insertOrderedList")}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Numbered list"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applyCommand("formatBlock", "blockquote")}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <div className="mx-1 w-px h-5 bg-gray-200" />
              <button
                type="button"
                onClick={clearFormatting}
                className="px-2 py-1 rounded hover:bg-gray-100"
                title="Clear formatting"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              className="min-h-[300px] max-h-[60vh] overflow-y-auto p-3 focus:outline-none"
              onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
              data-placeholder="Write your story here..."
              style={{ whiteSpace: "pre-wrap" }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save as Draft
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Story
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArticleEditor;
