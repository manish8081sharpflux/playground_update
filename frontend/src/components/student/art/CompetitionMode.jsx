import React, { useState, useEffect } from 'react';
import CanvasPreview from './CanvasPreview';
import SubmissionModal from './SubmissionModal';
import toast from 'react-hot-toast';
// Use apiWithoutContentType so axios doesn't override multipart/form-data
// boundary with application/json (which makes multer drop the file).
import { apiWithoutContentType as api } from '../../../api';

/**
 * CompetitionMode Component - Story 12.9 (FIX-014)
 * Themed art contests with leaderboard and countdown.
 * Now wires real file upload for competition entries.
 */
export default function CompetitionMode({ data, studentId, onRefresh }) {
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const competition = data?.currentCompetition || null;

  // Countdown timer
  useEffect(() => {
    if (!competition?.deadline) return;

    const updateCountdown = () => {
      const now = new Date();
      const deadline = new Date(competition.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('Competition Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [competition]);

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error('Please select an artwork file before submitting');
      return;
    }
    setShowSubmissionModal(true);
  };

  const handleConfirmSubmission = async (metadata) => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('artwork', selectedFile);
      formData.append('type', 'art');
      formData.append('mode', 'competition');
      formData.append('title', metadata.title || 'Competition Entry');
      formData.append('metadata', JSON.stringify({ competitionId: competition.id }));

      await api.post(
        `/api/v2/lms/student/${studentId}/courses/art/submissions`,
        formData
      );
      toast.success('Competition entry submitted successfully!');
      setShowSubmissionModal(false);
      setSelectedFile(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit entry';
      toast.error(msg);
    }
  };

  if (!competition) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active competition</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competition Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">{competition.theme}</h2>
            <p className="text-pink-100">{competition.description}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 text-center">
            <div className="text-sm font-medium">Time Remaining</div>
            <div className="text-2xl font-bold">{timeRemaining}</div>
          </div>
        </div>

        {/* Prize Money */}
        {competition.prize && (
          <div className="flex gap-4 mt-4">
            <div className="bg-yellow-400 text-yellow-900 rounded-lg px-4 py-2">
              <div className="text-xs font-medium">1st Place</div>
              <div className="text-xl font-bold">{competition.prize.first} Coins</div>
            </div>
            <div className="bg-gray-300 text-gray-900 rounded-lg px-4 py-2">
              <div className="text-xs font-medium">2nd Place</div>
              <div className="text-xl font-bold">{competition.prize.second} Coins</div>
            </div>
            <div className="bg-orange-300 text-orange-900 rounded-lg px-4 py-2">
              <div className="text-xs font-medium">3rd Place</div>
              <div className="text-xl font-bold">{competition.prize.third} Coins</div>
            </div>
          </div>
        )}
      </div>

      {/* Rules */}
      {competition.rules && competition.rules.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Rules</h3>
          <ul className="space-y-1">
            {competition.rules.map((rule, idx) => (
              <li key={idx} className="text-gray-700 flex items-start">
                <span className="text-pink-600 mr-2">&bull;</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Judging Criteria */}
      {competition.judging && competition.judging.criteria && competition.judging.criteria.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Judging Criteria</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            {competition.judging.criteria.map((criterion, idx) => (
              <span key={idx} className="bg-blue-200 text-blue-900 px-3 py-1 rounded-full text-sm">
                {criterion}
              </span>
            ))}
          </div>
          {competition.judging.judges && competition.judging.judges.length > 0 && (
            <p className="text-sm text-blue-800">
              Judges: {competition.judging.judges.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Canvas Preview & File Upload */}
      <CanvasPreview
        onSubmit={handleSubmit}
        file={selectedFile}
        onFileChange={setSelectedFile}
      />

      {/* Leaderboard */}
      {competition.leaderboard && competition.leaderboard.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">Leaderboard</h3>
            <span className="text-sm text-gray-600">
              {competition.totalSubmissions} entries
            </span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artist</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artwork</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {competition.leaderboard.map((entry) => (
                  <tr key={entry.rank} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold">#{entry.rank}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{entry.studentName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={entry.artworkUrl}
                          alt={entry.artworkTitle}
                          className="w-16 h-12 object-cover rounded border border-gray-200"
                        />
                        <span className="text-sm text-gray-700">{entry.artworkTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-sm">
                        {entry.votes}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmissionModal && (
        <SubmissionModal
          mode="competition"
          metadata={{ competitionId: competition.id }}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleConfirmSubmission}
          file={selectedFile}
        />
      )}
    </div>
  );
}
