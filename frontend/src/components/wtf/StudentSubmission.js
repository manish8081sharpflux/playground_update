import React, { useState } from "react";
import {
  Mic,
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button.jsx";
import { submitVoiceNote, submitArticle, submitWtfMedia } from "../../api";

const StudentSubmission = () => {
  const [submissionType, setSubmissionType] = useState("voice");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [recordingStartTs, setRecordingStartTs] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setAudioFile(blob);
        setAudioChunks(chunks);
      };

      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      recorder.start();
      setRecordingStartTs(Date.now());
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setMessage({
        type: "error",
        text: "Unable to access microphone. Please check permissions.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingStartTs(null);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setAudioFile(file);
    } else {
      setMessage({
        type: "error",
        text: "Please select a valid audio file.",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a title for your submission.",
      });
      return;
    }

    if (submissionType === "voice" && !audioFile) {
      setMessage({
        type: "error",
        text: "Please record or upload an audio file.",
      });
      return;
    }

    if (submissionType === "article" && !content.trim()) {
      setMessage({
        type: "error",
        text: "Please enter your article content.",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      let response;
      
      if (submissionType === "voice") {
        const formData = new FormData();
        formData.append("title", title);
        // backend expects field name "file" via multer single("file")
        formData.append("file", audioFile);
        formData.append("type", "voice");

        // If we have a measured duration, include it
        if (recordingStartTs) {
          const durationSec = Math.round((Date.now() - recordingStartTs) / 1000);
          formData.append("audioDuration", String(durationSec));
        }

        response = await submitVoiceNote(formData);
      } else if (submissionType === "article") {
        response = await submitArticle({
          title,
          content,
          type: "article",
        });
      } else if (submissionType === "media") {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", selectedMediaType);
        formData.append("file", uploadedMedia);
        response = await submitWtfMedia(formData);
      }

      if (response.success) {
        setMessage({
          type: "success",
          text: "Your submission has been sent for review!",
        });
        
        // Reset form
        setTitle("");
        setContent("");
        setAudioFile(null);
        setAudioChunks([]);
        setUploadedMedia(null);
      } else {
        setMessage({
          type: "error",
          text: response.message || "Failed to submit. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setMessage({
        type: "error",
        text: "An error occurred while submitting. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearMessage = () => {
    setMessage({ type: "", text: "" });
  };

  // New: support media (image/video) uploads like coach flow
  const [selectedMediaType, setSelectedMediaType] = useState("image");
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const onMediaFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setMessage({ type: "error", text: "Only image or video files are allowed." });
      return;
    }
    setSelectedMediaType(isVideo ? "video" : "image");
    setUploadedMedia(file);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Submit to Wall of Fame
      </h2>

      {message.text && (
        <div
          className={`mb-4 p-3 rounded-md flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center">
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
          <button
            onClick={clearMessage}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSubmissionType("voice")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              submissionType === "voice"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Mic className="w-4 h-4 mr-2" />
            Voice Note
          </button>
          <button
            onClick={() => setSubmissionType("article")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              submissionType === "article"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Article
          </button>
          <button
            onClick={() => setSubmissionType("media")}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${
              submissionType === "media"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            Image/Video
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter a title for your submission"
            required
          />
        </div>

        {submissionType === "voice" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio Recording *
              </label>
              
              {!audioFile ? (
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      onClick={startRecording}
                      disabled={isRecording}
                      className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      {isRecording ? "Recording..." : "Start Recording"}
                    </Button>
                    
                    {isRecording && (
                      <Button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                      >
                        Stop Recording
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    OR upload an audio file:
                  </div>
                  
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-green-700">
                        Audio file ready for submission
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAudioFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : submissionType === "article" ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your article here..."
              required
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image or Video *
              </label>
              {!uploadedMedia ? (
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={onMediaFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                  <div className="text-green-700">
                    {uploadedMedia.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedMedia(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-800 mb-2">Submission Guidelines:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your submission will be reviewed by coaches before appearing on the Wall of Fame</li>
            <li>• Voice notes should be clear and well-paced</li>
            <li>• Articles should be well-written and meaningful</li>
            <li>• Content should be appropriate and educational</li>
            <li>• You can submit multiple times</li>
          </ul>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit for Review"}
        </Button>
      </form>
    </div>
  );
};

export default StudentSubmission; 