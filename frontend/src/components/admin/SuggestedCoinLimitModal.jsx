import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

const QUALITY_LABELS = [
  ['excellent', 'Excellent'],
  ['good', 'Good'],
  ['needs_improvement', 'Needs Improvement'],
];

const TASK_ORDER = ['story', 'scene', 'revision', 'poem', 'buddy_system'];

const cloneTaskTypes = (taskTypes) => JSON.parse(JSON.stringify(taskTypes || {}));

export default function SuggestedCoinLimitModal({ isOpen, onClose }) {
  const [taskTypes, setTaskTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/v2/lms/admin/courses/coin-limits');
        setTaskTypes(cloneTaskTypes(response.data.data?.taskTypes));
      } catch (error) {
        toast.error('Failed to load suggested coin limits');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  const updateRangeValue = (taskKey, qualityKey, field, value) => {
    const parsedValue = value === '' ? '' : Number(value);
    setTaskTypes((current) => ({
      ...current,
      [taskKey]: {
        ...current[taskKey],
        [qualityKey]: {
          ...current[taskKey][qualityKey],
          [field]: parsedValue,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/api/v2/lms/admin/courses/coin-limits', {
        taskTypes,
      });
      setTaskTypes(cloneTaskTypes(response.data.data?.taskTypes));
      toast.success('Suggested coin limits saved');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save coin limits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-purple-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-2xl font-bold">Suggested Coin Limits</h2>
            <p className="text-sm text-purple-100">
              Set coach grading ranges by task type.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-purple-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-600">Loading limits...</div>
          ) : (
            <div className="space-y-5">
              {TASK_ORDER.map((taskKey) => {
                const taskConfig = taskTypes[taskKey];
                if (!taskConfig) return null;

                return (
                  <div key={taskKey} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                      {taskConfig.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {QUALITY_LABELS.map(([qualityKey, qualityLabel]) => (
                        <div key={qualityKey} className="rounded-lg border border-gray-200 bg-white p-4">
                          <h4 className="mb-3 font-semibold text-gray-800">{qualityLabel}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {['min', 'max', 'default'].map((field) => (
                              <label key={field} className="text-xs font-semibold uppercase text-gray-500">
                                {field}
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={taskConfig[qualityKey][field]}
                                  onChange={(event) =>
                                    updateRangeValue(taskKey, qualityKey, field, event.target.value)
                                  }
                                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-2 font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:bg-gray-400"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Limits'}
          </button>
        </div>
      </div>
    </div>
  );
}
