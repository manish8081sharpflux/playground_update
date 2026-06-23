import React, { useEffect } from 'react';

/**
 * MilestoneCelebrationModal Component - Epic 01 Story 06
 * Displays celebration modal when student reaches coin milestones
 * Thresholds: 100, 500, 1000, 5000 coins
 * Features: Confetti animation, auto-dismiss, congratulatory message
 */
export default function MilestoneCelebrationModal({ milestone, onClose }) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (milestone) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [milestone, onClose]);

  // Get congratulatory message based on milestone
  const getMessage = (amount) => {
    switch (amount) {
      case 100:
        return "🎉 You're amazing!";
      case 500:
        return "🌟 You're a superstar!";
      case 1000:
        return "🏆 You're a legend!";
      case 5000:
        return "👑 You're the champion!";
      default:
        return "🎊 Great job!";
    }
  };

  if (!milestone) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti Animation */}
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            {/* Title */}
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              Milestone Achieved!
            </h2>

            {/* Coin Icons */}
            <div className="flex justify-center gap-2 mb-4 text-5xl">
              💰💰💰💰💰
            </div>

            {/* Amount */}
            <div className="mb-4">
              <span className="text-6xl font-bold text-yellow-600" style={{ fontFamily: 'Patrick Hand, cursive' }}>
                {milestone}
              </span>
              <span className="text-3xl font-bold text-gray-700 ml-2">COINS!</span>
            </div>

            {/* Message */}
            <p className="text-2xl font-bold text-gray-800 mb-6" style={{ fontFamily: 'Patrick Hand, cursive' }}>
              {getMessage(milestone)}
            </p>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold text-lg px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              style={{ fontFamily: 'Patrick Hand, cursive' }}
            >
              🎊 Awesome! Let's Continue
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        .confetti-container {
          position: absolute;
          top: -10px;
          left: 0;
          width: 100%;
          height: 110%;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          opacity: 0;
          animation: confettiFall 3s linear infinite;
        }

        @keyframes confettiFall {
          0% {
            top: -10px;
            opacity: 1;
            transform: rotate(0deg);
          }
          100% {
            top: 110%;
            opacity: 0;
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
