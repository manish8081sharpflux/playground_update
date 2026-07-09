import React, { useState, useEffect } from "react";
import {
  X,
  Eye,
  Heart,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "../../ui/dialog.jsx";
import { Badge } from "../../ui/badge.jsx";

const TextReader = ({
  isOpen,
  onClose,
  title,
  content,
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
  const [isReading, setIsReading] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState(null);

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
      line1: author?.name || 'Text Creator',
      line2: 'Text Content'
    };
  };

  const handleTextToSpeech = () => {
    if (isReading) {
      if (speechUtterance) {
        speechUtterance.cancel();
      }
      setIsReading(false);
      setSpeechUtterance(null);
    } else {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      setSpeechUtterance(utterance);
      setIsReading(true);
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (speechUtterance) {
        speechUtterance.cancel();
      }
    };
  }, [speechUtterance]);

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
        <DialogTitle className="sr-only">Text Reader - {title}</DialogTitle>

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

          {/* Text content area.png image - full display without cropping */}
          <div
            className="absolute transform rotate-1"
            style={{
              width: "800px",
              height: "600px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(1deg)",
            }}
          >
            {/* Text content area.png image - no white background, full image visible */}
            <img 
              src="/text-content-area.png" 
              alt="Text Content Area" 
              className="w-full h-full object-contain"
            />
            
            {/* Scrollable text container positioned exactly in the blue rectangle */}
            <div 
              className="absolute"
              style={{
                top: '27%',
                left: '35%',
                right: '35%',
                bottom: '18%'
              }}
            >
                              <div 
                  className="w-full h-full overflow-y-auto p-2"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.27)',
                    borderRadius: '2px',
                    border: '1px solid rgba(0, 0, 255, 0.2)'
                  }}
                >
                <div
                  className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm break-words"
                  dangerouslySetInnerHTML={{
                    __html: (content || "")
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      // clickable URLs
                      .replace(
                        /\b((?:https?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi,
                        (m) => {
                          const hasProtocol = /^https?:\/\//i.test(m);
                          const url = hasProtocol ? m : `https://${m}`;
                          return `<a href="${url}" target="_blank" rel="no-referrer" class="text-blue-600 underline">${m}</a>`;
                        }
                      ),
                  }}
                />
              </div>
            </div>
          </div>

          {/* Text sticky note */}
          <div className="absolute top-16 right-8 w-64 h-64 bg-orange-200 p-6 transform -rotate-2 shadow-lg">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-red-500 rounded-full shadow-md"></div>
            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="text-4xl mb-4">📝</div>
              <h2
                className="text-orange-700 font-bold text-xl mb-2"
                style={{ fontFamily: "Comic Sans MS, cursive" }}
              >
                TEXT
              </h2>
              <p className="text-orange-600 font-semibold text-sm mb-2">
                {title || "Text Title"}
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

          {/* Ink Bottle and Pen Image */}
          <div className="absolute bottom-16 left-16 w-56">
            <img 
              src="/inkbottle-pen.png" 
              alt="Ink Bottle and Pen" 
              className="w-full h-auto"
            />
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
                <span className="text-lg font-bold">
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
                <span className="text-lg font-bold">{hearts}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TextReader;
