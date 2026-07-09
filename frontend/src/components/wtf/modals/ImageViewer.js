import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Heart,
  ThumbsUp,
  Image as ImageIcon,
  FileImage,
  AlertCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog.jsx";
import { Badge } from "../../ui/badge.jsx";

const ImageViewer = ({
  isOpen,
  onClose,
  imageSrc,
  title,
  author,
  caption,
  likes,
  hearts,
  views,
  isOfficial,
  officialCategory,
  onLike,
  onHeart,
  isStudent = false,
  studentName,
  balagruha,
  metadata,
  createdAt,
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // Reset states when image source changes or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {

      setImgError(false);
      setImgLoading(true);
      setUseFallback(false);
    }
  }, [isOpen, imageSrc, title, author]);

  // Check if CSS background image loaded successfully
  useEffect(() => {
    if (imageSrc && !imgLoading) {
      // Give CSS background a moment to load, then check if we need fallback
      const timer = setTimeout(() => {
        if (imgLoading) {
          setUseFallback(true);
        }
      }, 2000); // 2 second timeout

      return () => clearTimeout(timer);
    }
  }, [imageSrc, imgLoading]);

  const isLikelyImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;

    // Debug logging


    // Check for common image file extensions anywhere in the URL
    const hasImageExtension = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(
      url
    );

    // Check for S3 bucket URLs that contain image paths
    const isS3ImageUrl =
      url.includes("s3.amazonaws.com") &&
      (url.includes("/image/") ||
        url.includes("/images/") ||
        hasImageExtension);

    // Check for other common image hosting patterns
    const isCommonImageHost =
      /(imgur|cloudinary|images\.unsplash|picsum|placeholdit|via\.placeholder)\.com/i.test(
        url
      );

    // Check for data URLs and blob URLs
    const isDataOrBlob = /^(data:image\/.+;base64,|blob:)/i.test(url);

    // Special case: Always allow S3 URLs to pass through
    const isS3Url = url.includes("s3.amazonaws.com");

    const result =
      hasImageExtension ||
      isS3ImageUrl ||
      isCommonImageHost ||
      isDataOrBlob ||
      isS3Url;



    return result;
  };
  const getPostageStampStyle = () => ({
    backgroundImage: `
      radial-gradient(circle at 0% 50%, transparent 4px, white 4px),
      radial-gradient(circle at 100% 50%, transparent 4px, white 4px),
      radial-gradient(circle at 50% 0%, transparent 4px, white 4px),
      radial-gradient(circle at 50% 100%, transparent 4px, white 4px)
    `,
    backgroundSize: "12px 100%, 12px 100%, 100% 12px, 100% 12px",
    backgroundPosition: "left center, right center, center top, center bottom",
    backgroundRepeat: "repeat-y, repeat-y, repeat-x, repeat-x",
    border: "3px solid #d1d5db",
    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.15)",
  });

  const getDisplayInfo = () => {
    // Check if this is an admin post
    if (author?.role === 'admin' || !author || !author.name) {
      return {
        line1: 'Created by Admin',
        line2: ''
      };
    }
    
    // For coach suggestions or student posts, show student info if available
    if (studentName && balagruha) {
      return {
        line1: studentName,
        line2: balagruha
      };
    }
    
    // Fallback to author name
    return {
      line1: author?.name || 'Image Creator',
      line2: 'Image Pin'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl max-h-[95vh] p-0 overflow-hidden" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, 
              #A1EBC6 50%, 
              transparent 50%
            ),
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 50px,
              white 50px,
              white 54px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 50px,
              white 50px,
              white 54px
            )
          `,
          backgroundColor: '#A1EBC6',
          backgroundPosition: '0 0, 50% 0, 50% 0'
        }}
      >
        <DialogTitle className="sr-only">Image Viewer - {title}</DialogTitle>

        {/* Custom CSS for animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>

        <div className="relative min-h-[600px] p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-white hover:bg-gray-100 rounded-full p-3 transition-colors shadow-lg border-2 border-gray-300"
          >
            <X className="w-6 h-6 text-purple-600" />
          </button>

          {/* Student Detail Pin */}
          <div className="absolute top-16 left-4 w-64">
            <img 
              src="/student-detail-pin.png" 
              alt="Student Detail Pin" 
              className="w-full h-auto"
            />
            {/* Student info text overlay */}
            <div 
              className="absolute text-center text-black font-bold text-sm"
              style={{
                transform: 'rotate(-28deg)',
                top: '35%',
                left: '25%',
                width: '50%',
                height: '40%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div className="leading-tight">
                {(() => {
                  const displayInfo = getDisplayInfo();
                  return (
                    <>
                      <div>{displayInfo.line1}</div>
                      {displayInfo.line2 && (
                        <div className="text-xs">{displayInfo.line2}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Main polaroid-style image */}
          <div
            className="absolute bg-white p-4 transform -rotate-2 shadow-lg"
            style={{
              width: "500px",
              height: "400px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-2deg)",
              ...getPostageStampStyle(),
            }}
          >
            {isOfficial && (
              <div className="absolute -top-3 -left-3 flex flex-col gap-1">
                <Badge className="bg-purple-600 text-white text-xs">
                  ISF Official
                </Badge>
                {officialCategory && (
                  <Badge
                    className={`text-white text-xs px-2 py-1 ${
                      officialCategory === "mann-ki-baat"
                        ? "bg-purple-700"
                        : officialCategory === "op-ed"
                        ? "bg-indigo-600"
                        : officialCategory === "isf-updates"
                        ? "bg-teal-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {officialCategory === "mann-ki-baat"
                      ? "🎙️ Mann Ki Baat"
                      : officialCategory === "op-ed"
                      ? "📝 Op Ed"
                      : officialCategory === "isf-updates"
                      ? "📢 ISF Updates"
                      : "Official"}
                  </Badge>
                )}
              </div>
            )}
            <div className="w-full h-80 bg-gray-200 mb-4 overflow-hidden">
              {isLikelyImageUrl(imageSrc) && !imgError ? (
                <>
                  {imgLoading && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                      <div className="text-center space-y-4">
                        {/* Animated Loading Icon */}
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>

                        {/* Loading Text */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">
                            Loading Image...
                          </p>
                          {imageSrc &&
                            imageSrc.includes("s3.amazonaws.com") && (
                              <p className="text-xs text-gray-500">
                                Loading from S3 bucket
                              </p>
                            )}
                        </div>

                        {/* Loading Progress Bar */}
                        <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Use CSS background-image instead of HTML img tag to avoid CORS issues */}
                  <div
                    className={`w-full h-full ${imgLoading ? "hidden" : ""}`}
                    style={{
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />

                  {/* Fallback img tag in case CSS background fails */}
                  <img
                    src={imageSrc}
                    alt={title}
                    className={`w-full h-full object-cover ${
                      imgLoading ? "hidden" : ""
                    }`}
                    style={{ display: useFallback ? "block" : "none" }} // Show fallback when needed
                    onLoad={() => {

                      setImgLoading(false);
                    }}
                    onError={(e) => {
                      console.error(
                        "ImageViewer - Image failed to load:",
                        imageSrc,
                        e
                      );
                      setImgError(true);
                      setImgLoading(false);
                    }}
                  />
                </>
              ) : !imageSrc ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-center p-6">
                  <div className="space-y-4 animate-fade-in">
                    {/* Placeholder Icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                    </div>

                    {/* Placeholder Message */}
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-700">
                        No Image Available
                      </h4>
                      <p className="text-sm text-gray-500 max-w-xs">
                        This content doesn't have an associated image to
                        display.
                      </p>
                    </div>

                    {/* Content Info */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Title: {title || "Untitled"}</div>
                        <div>Type: Text/Content Only</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-center p-6">
                  <div className="space-y-4 animate-fade-in">
                    {/* Placeholder Icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                        <ImageIcon className="w-10 h-10 text-blue-600" />
                      </div>
                    </div>

                    {/* Placeholder Message */}
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-700">
                        {imgError ? "Image Unavailable" : "Image Preview"}
                      </h4>
                      <p className="text-sm text-gray-500 max-w-xs">
                        {imgError
                          ? "The image could not be loaded from the provided URL."
                          : "This content will be displayed as an image preview."}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      {imageSrc && (
                        <a
                          href={imageSrc}
                          target="_blank"
                          rel="no-referrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                        >
                          <FileImage className="w-4 h-4" />
                          Open Image
                        </a>
                      )}

                      {imgError &&
                        imageSrc &&
                        imageSrc.includes("s3.amazonaws.com") && (
                          <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-800 text-xs rounded-md border border-amber-200">
                            <AlertCircle className="w-4 h-4" />
                            S3 Image
                          </div>
                        )}
                    </div>

                    {/* Content Info */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-xs text-gray-400 space-y-1">
                        <div>Title: {title || "Untitled"}</div>
                        {imageSrc && (
                          <div className="break-all">
                            Source: {imageSrc.substring(0, 60)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Image sticky note */}
          <div className="absolute top-16 right-8 w-64 h-64 bg-yellow-200 p-6 transform rotate-3 shadow-lg">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full shadow-md"></div>
            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-4">🖼️</div>
              <h2
                className="text-yellow-700 font-bold text-xl mb-2"
                style={{ fontFamily: "Comic Sans MS, cursive" }}
              >
                IMAGE
              </h2>
              <p className="text-yellow-600 font-semibold text-sm mb-2">
                {title || "Image Title"}
              </p>
              {caption && (
                <p className="text-gray-700 text-xs mb-2 italic">
                  {caption}
                </p>
              )}
              <p className="text-gray-700 text-sm">
                {createdAt 
                  ? new Date(createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                }
              </p>
            </div>
          </div>

          {/* Stats card */}
          <div className="absolute bottom-16 right-12 bg-white p-8 transform rotate-1 shadow-lg border-2 border-gray-200 rounded-lg">
            <div className="space-y-6 text-center min-w-[160px]">
              <div className="flex items-center justify-center gap-3 text-gray-600">
                <Eye className="w-8 h-8" />
                <span className="font-bold text-2xl">
                  {views.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onLike && onLike()}
                className="flex items-center justify-center gap-3 text-pink-500 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Like"
              >
                <ThumbsUp className="w-8 h-8" />
                <span className="font-bold text-lg">
                  {likes.toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onHeart && onHeart()}
                className="flex items-center justify-center gap-3 text-green-600 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Love"
              >
                <Heart className="w-8 h-8" />
                <span className="font-bold text-lg">{hearts}</span>
              </button>
            </div>
          </div>



          {/* Camera image in bottom left */}
          <div className="absolute bottom-16 left-16 w-56">
            <img 
              src="/cameraimage.png" 
              alt="Vintage Camera" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
