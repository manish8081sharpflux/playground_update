import React, { useRef } from "react";
import { X, Eye, Heart, ThumbsUp } from "lucide-react"; 
import { Dialog, DialogContent } from "../../ui/dialog.jsx";
import { Badge } from "../../ui/badge.jsx";

const VideoPlayer = ({
  isOpen,
  onClose,
  videoSrc,
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
  const videoRef = useRef(null);

  const handleVideoPlay = () => {
    setTimeout(() => {

    }, 3000);
  };

  // Determine what to display based on who uploaded the pin
  const getDisplayInfo = () => {
    // Check if uploaded by admin based on author.role
    if (author?.role === 'admin') {
      return {
        name: 'Created by Admin',
        location: null // No Balgruha for admin
      };
    }
    
    // Check if there's no author data (likely admin post without proper author population)
    if (!author || !author.name) {
      return {
        name: 'Created by Admin',
        location: null // No Balgruha for admin
      };
    }
    
    // Check if uploaded by coach (coach suggestion)
    if (metadata?.isCoachSuggestion || author?.role === 'coach') {
      return {
        name: studentName || 'Student Name',
        location: balagruha || 'Balgruha Name'
      };
    }
    
    // Default to student (regular student submission)
    return {
      name: studentName || author?.name || author || 'Student Name',
      location: balagruha || 'Balgruha Name'
    };
  };

  const displayInfo = getDisplayInfo();

  // Lightweight YouTube handling (no external deps)
  const isYouTubeUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    try {
      const u = new URL(url);
      return (
        /(^|\.)youtube\.com$/i.test(u.hostname) ||
        /(^|\.)youtu\.be$/i.test(u.hostname)
      );
    } catch (_) {
      return false;
    }
  };

  const toYouTubeEmbed = (url) => {
    try {
      const u = new URL(url);
      // youtu.be/<id>
      if (/^youtu\.be$/i.test(u.hostname)) {
        const id = u.pathname.replace(/^\//, "");
        return `https://www.youtube.com/embed/${id}`;
      }
      // shorts
      if (/\/shorts\//i.test(u.pathname)) {
        const id = u.pathname.split("/shorts/")[1]?.split("/")[0];
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      // standard watch?v=
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    } catch (_) {
      // fall through
    }
    return url;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl max-h-[95vh] p-0 overflow-hidden" 
        style={{ 
          background: `
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
        <div className="relative min-h-[600px] p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-white hover:bg-gray-100 rounded-full p-3 transition-colors shadow-lg border-2 border-gray-300"
          >
            <X className="w-6 h-6 text-purple-600" />
          </button>

          {/* Left side - Student Details Pin */}
          <div className="absolute top-16 left-4 w-64">
            <img 
              src="/student-detail-pin.png" 
              alt="Student Details Pin"
              className="w-full h-auto"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}
            />
            {/* Text overlay positioned to match the pin's diagonal slant */}
            <div 
              className="absolute flex flex-col justify-center items-center text-center"
              style={{ 
                transform: 'rotate(-28deg)', 
                top: '35%',
                left: '25%',
                width: '50%',
                height: '40%'
              }}
            >
              <div className="text-gray-800 space-y-1">
                <h3 className="font-bold text-sm text-gray-900">
                  {displayInfo.name}
                </h3>
                {displayInfo.location && (
                  <p className="text-xs font-medium text-gray-700">
                    {displayInfo.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Main video frame with film strip wrapper - MOVED TO CENTER */}
          <div className="absolute top-12" style={{ left: 'calc(50% - 32px)', transform: 'translateX(-50%)' }}>
            {/* Film strip SVG wrapper */}
            <div className="relative">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 1182.54 826.6"
                className="w-[575px] h-[402px]"
                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
              >
                <defs>
                  <style>{`.cls-1{fill:#545454;}`}</style>
                </defs>
                <g id="Layer_2" data-name="Layer 2">
                  <g id="Layer_1-2" data-name="Layer 1">
                    <path class="cls-1" d="M103.38,806.2a5.52,5.52,0,0,1-5.52-5.51v-47a5.52,5.52,0,0,1,5.52-5.51h27.41a5.51,5.51,0,0,1,5.5,5.51v47a5.51,5.51,0,0,1-5.5,5.51Zm105.35,0a5.52,5.52,0,0,1-5.49-5.51l0-47a5.47,5.47,0,0,1,5.47-5.51h27.44a5.51,5.51,0,0,1,5.49,5.51v47a5.51,5.51,0,0,1-5.49,5.51Zm105.4,0a5.51,5.51,0,0,1-5.5-5.51v-47a5.5,5.51,0,0,1,5.5-5.49h27.41a5.51,5.51,0,0,1,5.5,5.51v47a5.51,5.51,0,0,1-5.5,5.51Zm105.37,0a5.51,5.51,0,0,1-5.51-5.51v-47a5.53,5.52,0,0,1,5.51-5.51h27.42a5.5,5.51,0,0,1,5.48,5.51v47a5.49,5.51,0,0,1-5.48,5.51Zm105.38,0a5.5,5.51,0,0,1-5.5-5.51v-47a5.51,5.51,0,0,1,5.5-5.51H552.3a5.52,5.51,0,0,1,5.49,5.51v47a5.51,5.51,0,0,1-5.49,5.51Zm105.36,0a5.5,5.51,0,0,1-5.5-5.51v-47a5.52,5.51,0,0,1,5.52-5.51h27.4a5.52,5.51,0,0,1,5.51,5.49v47a5.52,5.51,0,0,1-5.51,5.51Zm105.39,0a5.53,5.51,0,0,1-5.51-5.51v-47a5.52,5.51,0,0,1,5.51-5.49h27.42a5.51,5.51,0,0,1,5.49,5.51v47a5.51,5.51,0,0,1-5.49,5.51Zm105.36,0a5.51,5.51,0,0,1-5.5-5.51v-47a5.52,5.51,0,0,1,5.5-5.51h27.43a5.51,5.51,0,0,1,5.5,5.5v47a5.52,5.51,0,0,1-5.5,5.51Zm105.38,0a5.5,5.51,0,0,1-5.49-5.51v-47a5.5,5.51,0,0,1,5.49-5.51h27.42a5.51,5.51,0,0,1,5.51,5.51l0,47a5.48,5.51,0,0,1-5.49,5.51Zm105.39,0a5.51,5.51,0,0,1-5.51-5.51v-47a5.51,5.51,0,0,1,5.51-5.49h27.42a5.51,5.51,0,0,1,5.49,5.51v47a5.5,5.51,0,0,1-5.49,5.51ZM103.38,78.41a5.49,5.51,0,0,1-5.52-5.49v-47a5.51,5.51,0,0,1,5.52-5.5h27.41a5.5,5.51,0,0,1,5.5,5.5v47a5.51,5.51,0,0,1-5.5,5.51Zm105.35,0a5.49,5.51,0,0,1-5.47-5.51v-47a5.47,5.51,0,0,1,5.47-5.5h27.44a5.49,5.51,0,0,1,5.48,5.5v47a5.48,5.51,0,0,1-5.48,5.51Zm105.4,0a5.49,5.51,0,0,1-5.5-5.51v-47a5.5,5.51,0,0,1,5.5-5.5h27.41a5.51,5.51,0,0,1,5.5,5.5v47a5.51,5.51,0,0,1-5.5,5.51Zm105.37,0A5.51,5.51,0,0,1,414,72.92v-47a5.51,5.51,0,0,1,5.51-5.5h27.42a5.5,5.51,0,0,1,5.48,5.5v47a5.49,5.51,0,0,1-5.48,5.51Zm105.38,0a5.5,5.51,0,0,1-5.5-5.51v-47a5.5,5.51,0,0,1,5.5-5.5H552.3a5.51,5.51,0,0,1,5.49,5.5v47a5.5,5.51,0,0,1-5.49,5.51Zm105.36,0a5.51,5.51,0,0,1-5.5-5.51v-47a5.5,5.51,0,0,1,5.52-5.5h27.4a5.5,5.51,0,0,1,5.5,5.5v47a5.51,5.51,0,0,1-5.5,5.51Zm105.39,0a5.5,5.51,0,0,1-5.51-5.51l0-47a5.48,5.51,0,0,1,5.49-5.5h27.42a5.51,5.51,0,0,1,5.49,5.5v47a5.5,5.51,0,0,1-5.49,5.51Zm105.36,0a5.51,5.51,0,0,1-5.5-5.51v-47a5.52,5.51,0,0,1,5.5-5.51h27.43a5.51,5.51,0,0,1,5.5,5.5v47a5.52,5.51,0,0,1-5.5,5.51Zm105.38,0a5.5,5.51,0,0,1-5.49-5.51v-47a5.5,5.51,0,0,1,5.49-5.51h27.42a5.51,5.51,0,0,1,5.51,5.5v47a5.52,5.51,0,0,1-5.51,5.51Zm105.39,0a5.51,5.51,0,0,1-5.51-5.51v-47a5.51,5.51,0,0,1,5.51-5.5h27.42a5.51,5.51,0,0,1,5.49,5.5v47a5.5,5.51,0,0,1-5.49,5.51ZM1182.54,826.6V806.2h-25.42a5.5,5.5,0,0,1-5.49-5.51v-47a5.49,5.51,0,0,1,5.48-5.51h25.42V78.43h-25.4a5.49,5.51,0,0,1-5.5-5.51v-47a5.51,5.51,0,0,1,5.49-5.5h25.42V0L0,0V20.41H25.4a5.51,5.51,0,0,1,5.51,5.5v47a5.5,5.51,0,0,1-5.51,5.51H0V748.19H25.4a5.51,5.51,0,0,1,5.51,5.49v47a5.49,5.51,0,0,1-5.51,5.5H0v20.4H1182.54"/>
                  </g>
                </g>
              </svg>
              
              {/* Video frame positioned inside the SVG */}
              <div className="absolute inset-0 m-14">
                <div
                  className="bg-white p-3 transform -rotate-1 shadow-lg"
                  style={{
                    width: "100%",
                    height: "100%",
                    ...getPostageStampStyle(),
                  }}
                >
                  {isOfficial && (
                    <div className="absolute -top-3 -left-3 flex flex-col gap-1">
                      <Badge className="bg-purple-600 text-white text-xs px-2 py-1">
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
                  <div className="w-full h-64 bg-black mb-2 overflow-hidden rounded">
                    {isYouTubeUrl(videoSrc) ? (
                      <iframe
                        title="YouTube video player"
                        src={toYouTubeEmbed(videoSrc)}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        controls
                        className="w-full h-full object-cover"
                        onPlay={handleVideoPlay}
                      />
                    )}
                  </div>
                  {/* Removed title and caption from here - moved to right side sticky note */}
                </div>
              </div>
            </div>
          </div>

          {/* Video sticky note - UPDATED with pin name and caption */}
          <div className="absolute top-16 right-8 w-64 h-64 bg-blue-200 p-6 transform rotate-2 shadow-lg">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full shadow-md"></div>
            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-4">🎬</div>
              <h2
                className="text-blue-700 font-bold text-xl mb-2"
                style={{ fontFamily: "Comic Sans MS, cursive" }}
              >
                VIDEO
              </h2>
              {/* Pin name and caption moved here */}
              <h3 className="text-blue-600 font-semibold text-sm mb-2">
                {title}
              </h3>
              {caption && (
                <p className="text-blue-600 text-xs mb-3 italic">
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
              {/* Removed hashtags as requested */}
            </div>
          </div>

          {/* Camcorder image - bottom left */}
          <div className="absolute bottom-16 left-16">
            <img 
              src="/camcorder.png" 
              alt="Camcorder"
              className="w-44 h-auto"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
          </div>

          {/* Stats card */}
          <div className="absolute bottom-16 right-12 bg-white p-6 transform rotate-1 shadow-lg border-2 border-gray-200 rounded-lg">
            <div className="space-y-4 text-center min-w-[120px]">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Eye className="w-8 h-8" />
                <span className="font-bold text-xl">
                  {views.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onLike && onLike()}
                className="flex items-center justify-center gap-2 text-pink-500 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Like"
              >
                <ThumbsUp className="w-8 h-8" />
                <span className="font-bold text-xl">
                  {likes.toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onHeart && onHeart()}
                className="flex items-center justify-center gap-2 text-green-600 hover:opacity-80 transition-opacity mx-auto"
                aria-label="Love"
              >
                <Heart className="w-8 h-8" />
                <span className="font-bold text-xl">{hearts}</span>
              </button>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPlayer;
