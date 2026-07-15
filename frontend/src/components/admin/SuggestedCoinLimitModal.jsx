import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api';

const QUALITY_LABELS = [
  ['excellent', 'Excellent'],
  ['good', 'Good'],
  ['needs_improvement', 'Needs Improvement'],
];

const DEFAULT_TASK_ORDER = ['story', 'scene', 'revision', 'poem', 'buddy_system'];

const cloneTaskTypes = (taskTypes) => JSON.parse(JSON.stringify(taskTypes || {}));
const slugifyTaskType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const createDefaultTaskType = (label) => ({
  label,
  keywords: [label.toLowerCase()],
  excellent: { min: 40, max: 50, default: 45 },
  good: { min: 25, max: 39, default: 30 },
  needs_improvement: { min: 0, max: 24, default: 10 },
});

export default function SuggestedCoinLimitModal({ isOpen, onClose }) {
  const [taskTypes, setTaskTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [editingTaskKey, setEditingTaskKey] = useState('');
  const [editingTaskLabel, setEditingTaskLabel] = useState('');

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

  const handleAddTaskType = () => {
    const label = newTaskLabel.trim();
    if (!label) {
      toast.error('Enter a task type name');
      return;
    }

    const baseKey = slugifyTaskType(label);
    if (!baseKey) {
      toast.error('Use letters or numbers in the task type name');
      return;
    }

    let taskKey = baseKey;
    let suffix = 2;
    while (taskTypes[taskKey]) {
      taskKey = `${baseKey}_${suffix}`;
      suffix += 1;
    }

    setTaskTypes((current) => ({
      ...current,
      [taskKey]: createDefaultTaskType(label),
    }));
    setNewTaskLabel('');
    toast.success(`"${label}" task type added`);
  };

  const startTaskUpdate = (taskKey, label) => {
    setEditingTaskKey(taskKey);
    setEditingTaskLabel(label);
  };

  const applyTaskUpdate = () => {
    const label = editingTaskLabel.trim();
    if (!editingTaskKey || !label) {
      toast.error('Enter a task type name');
      return;
    }

    setTaskTypes((current) => ({
      ...current,
      [editingTaskKey]: {
        ...current[editingTaskKey],
        label,
        keywords: [label.toLowerCase(), editingTaskKey.replace(/_/g, ' ')],
      },
    }));
    setEditingTaskKey('');
    setEditingTaskLabel('');
    toast.success(`"${label}" task type updated`);
  };

  const deleteTaskType = (taskKey) => {
    const label = taskTypes[taskKey]?.label || taskKey;

    setTaskTypes((current) => {
      const next = { ...current };
      delete next[taskKey];
      return next;
    });
    toast.success(`"${label}" task type deleted`);
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

  const taskTypeEntries = Object.entries(taskTypes || {}).sort(([firstKey], [secondKey]) => {
    const firstIndex = DEFAULT_TASK_ORDER.indexOf(firstKey);
    const secondIndex = DEFAULT_TASK_ORDER.indexOf(secondKey);
    if (firstIndex !== -1 || secondIndex !== -1) {
      return (firstIndex === -1 ? 999 : firstIndex) - (secondIndex === -1 ? 999 : secondIndex);
    }
    return firstKey.localeCompare(secondKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-gradient-to-r from-purple-700 via-purple-600 to-fuchsia-600 px-7 py-5 text-white">
          <div>
            <h2 className="text-2xl font-bold leading-tight">Suggested Coin Limits</h2>
            <p className="mt-1 text-sm text-purple-100">
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

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-600">Loading limits...</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    New Task Type
                    <input
                      type="text"
                      value={newTaskLabel}
                      onChange={(event) => setNewTaskLabel(event.target.value)}
                      placeholder="e.g., Voice Task"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTaskType}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700 lg:mt-6"
                  >
                    <Plus size={17} />
                    Add Task Type
                  </button>
                </div>
              </div>

              {taskTypeEntries.map(([taskKey, taskConfig]) => {
                const isEditingTask = editingTaskKey === taskKey;

                return (
                  <div key={taskKey} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Task Type
                        </div>
                        {!isEditingTask ? (
                          <h3 className="mt-2 truncate text-xl font-bold text-slate-950">
                            {taskConfig.label}
                          </h3>
                        ) : (
                          <input
                            type="text"
                            value={editingTaskLabel}
                            onChange={(event) => setEditingTaskLabel(event.target.value)}
                            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-950 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isEditingTask ? (
                          <button
                            type="button"
                            onClick={() => startTaskUpdate(taskKey, taskConfig.label)}
                            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 px-3 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
                          >
                            <Pencil size={16} />
                            Update
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={applyTaskUpdate}
                              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
                            >
                              Save Name
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTaskKey('');
                                setEditingTaskLabel('');
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteTaskType(taskKey)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                    {isEditingTask && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                        This renames the task type for course selection and grading labels. Coin ranges below stay unchanged.
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {QUALITY_LABELS.map(([qualityKey, qualityLabel]) => (
                        <div key={qualityKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <h4 className="mb-3 text-sm font-bold text-slate-800">{qualityLabel}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {['min', 'max', 'default'].map((field) => (
                              <label key={field} className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                {field}
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={taskConfig[qualityKey][field]}
                                  onChange={(event) =>
                                    updateRangeValue(taskKey, qualityKey, field, event.target.value)
                                  }
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
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
