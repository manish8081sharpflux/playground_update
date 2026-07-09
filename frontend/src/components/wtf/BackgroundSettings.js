import React, { useState, useEffect } from "react";
import { Palette, Image, Upload, X, Loader, Trash2 } from "lucide-react";
import {
  getWtfSettings,
  updateWtfSettings,
  uploadWtfBackgroundImage,
  deleteWtfBackgroundImage,
} from "../../api";

const BackgroundSettings = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    backgroundType: "color",
    backgroundColor: "#f8fafc",
    backgroundImage: null,
    fontColor: "#0f172a",
  });
  const [tempColor, setTempColor] = useState("#f8fafc");
  const [tempFontColor, setTempFontColor] = useState("#0f172a");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    try {
      setIsLoading(true);
      const response = await getWtfSettings();
      const currentSettings = response.data;
      setSettings(currentSettings);
      setTempColor(currentSettings.backgroundColor);
      setTempFontColor(currentSettings.fontColor || "#0f172a");
    } catch (error) {
      setError("Failed to load current settings");
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColorChange = (color) => {
    setTempColor(color);
    setSettings((prev) => ({
      ...prev,
      backgroundType: "color",
      backgroundColor: color,
      backgroundImage: null,
    }));
  };

  const handleFontColorChange = (color) => {
    setTempFontColor(color);
    setSettings((prev) => ({
      ...prev,
      fontColor: color,
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed"
      );
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size too large. Maximum size is 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const response = await uploadWtfBackgroundImage(file);
      const imageUrl = response.data.imageUrl;

      setSettings((prev) => ({
        ...prev,
        backgroundType: "image",
        backgroundColor: "#f8fafc",
        backgroundImage: imageUrl,
      }));

      setSuccess("Image uploaded successfully!");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError("");

      await updateWtfSettings(settings);
      setSuccess("Background settings saved successfully!");

      // Notify parent component about the settings change
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setDeletingImage(true);
      setError("");
      await deleteWtfBackgroundImage(settings.backgroundImage);
      setSettings((prev) => ({ ...prev, backgroundImage: null }));
      setSuccess("Background image deleted");
      if (onSettingsChange)
        onSettingsChange({ ...settings, backgroundImage: null });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to delete image");
    } finally {
      setDeletingImage(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Palette className="w-6 h-6 text-purple-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">
          Background Settings
        </h3>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={clearMessages}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-md flex items-center justify-between">
          <span className="text-green-700 text-sm">{success}</span>
          <button
            onClick={clearMessages}
            className="text-green-500 hover:text-green-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Background Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Background Type
        </label>
        <div className="flex gap-4">
          <button
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                backgroundType: "color",
                backgroundImage: null,
              }))
            }
            className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
              settings.backgroundType === "color"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <Palette className="w-4 h-4 mr-2" />
            Solid Color
          </button>
          <button
            onClick={() =>
              setSettings((prev) => ({ ...prev, backgroundType: "image" }))
            }
            className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
              settings.backgroundType === "image"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            <Image className="w-4 h-4 mr-2" />
            Background Image
          </button>
        </div>
      </div>

      {/* Color Picker */}
      {settings.backgroundType === "color" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Background Color
          </label>

          {/* Color Picker Input */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm text-gray-600">Background Color:</label>
              <input
                type="color"
                value={tempColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-16 h-16 border-2 border-gray-300 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                title="Click to choose any background color"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-2 rounded border">
                {tempColor}
              </span>
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: tempColor }}
                title="Preview of selected color"
              />
            </div>
          </div>

          {/* Font Color Input */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm text-gray-600">Font Color:</label>
              <input
                type="color"
                value={tempFontColor}
                onChange={(e) => handleFontColorChange(e.target.value)}
                className="w-12 h-12 border-2 border-gray-300 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                title="Choose text color to ensure readability"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-2 rounded border">
                {tempFontColor}
              </span>
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: tempFontColor }}
                title="Preview of selected font color"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Upload */}
      {settings.backgroundType === "image" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload Background Image
          </label>

          {/* Current/Saved Image Preview */}
          {settings.backgroundImage && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Current Background:</p>
              <div
                className="w-full h-32 rounded-lg border-2 border-gray-300 bg-cover bg-center"
                style={{ backgroundImage: `url(${settings.backgroundImage})` }}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={deletingImage}
                  className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded ${
                    deletingImage
                      ? "bg-gray-200 text-gray-400"
                      : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  {deletingImage ? "Deleting..." : "Remove Image"}
                </button>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              id="background-image-upload"
              disabled={uploadingImage}
            />
            <label
              htmlFor="background-image-upload"
              className={`cursor-pointer flex flex-col items-center ${
                uploadingImage ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {uploadingImage ? (
                <Loader className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
              )}
              <span className="text-sm text-gray-600">
                {uploadingImage ? "Uploading..." : "Click to upload image"}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                JPEG, PNG, WebP up to 5MB
              </span>
            </label>
          </div>

          {/* Unsaved preview when picking a new image */}
          {settings.backgroundType === "image" && settings.backgroundImage && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Preview</span>
                <span className="text-xs text-amber-600">Unsaved</span>
              </div>
              <div
                className="w-full h-24 rounded border bg-cover bg-center"
                style={{ backgroundImage: `url(${settings.backgroundImage})` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isSaving
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {isSaving ? (
            <>
              <Loader className="w-4 h-4 animate-spin inline mr-2" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </button>
      </div>
    </div>
  );
};

export default BackgroundSettings;
