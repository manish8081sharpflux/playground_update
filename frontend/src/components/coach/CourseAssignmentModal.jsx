import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import StudentMultiSelect from './StudentMultiSelect';
import { useAuth } from '../../contexts/AuthContext';

export default function CourseAssignmentModal({ isOpen, onClose, coachId, onAssignmentCreated }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const effectiveCoachId = coachId || user?.id || user?._id;

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [balagruhasInfo, setBalagruhasInfo] = useState([]);
  const [selectedBalagruhas, setSelectedBalagruhas] = useState([]);

  // Form state
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignmentType, setAssignmentType] = useState('balagruha'); // 'balagruha' or 'students'
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [sendInAppNotification, setSendInAppNotification] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  const normalizeList = (value) => (Array.isArray(value) ? value : []);

  const getResponseList = (response, key) => {
    const data = response?.data?.data;
    return normalizeList(data?.[key] || data || response?.data?.[key]);
  };

  const getEntityId = (value) => {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return value.toString();
    const nestedId = value._id || value.id || value.value || value.$oid;
    if (nestedId) return nestedId.toString();
    if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
      return value.toString();
    }
    return '';
  };

  const getStudentBalagruhaIds = (student) => {
    const values = [];

    if (Array.isArray(student.balagruhaIds)) {
      values.push(...student.balagruhaIds);
    }

    if (student.balagruhaId) {
      values.push(student.balagruhaId);
    }

    if (student.balagruha) {
      values.push(student.balagruha);
    }

    return Array.from(new Set(values.map(getEntityId).filter(Boolean)));
  };

  const getStudentBalagruhaNames = (student, balagruhaSource = balagruhasInfo) => {
    const names = [];

    if (Array.isArray(student.balagruhaNames)) {
      names.push(...student.balagruhaNames.filter(Boolean));
    }

    const possibleBalagruhas = [
      ...(Array.isArray(student.balagruhaIds) ? student.balagruhaIds : []),
      student.balagruhaId,
      student.balagruha,
    ].filter(Boolean);

    possibleBalagruhas.forEach((item) => {
      if (typeof item === 'object' && item.name) {
        names.push(item.name);
      }
    });

    normalizeList(balagruhaSource).forEach((bg) => {
      if (getStudentBalagruhaIds(student).includes(getEntityId(bg)) && bg?.name) {
        names.push(bg.name);
      }
    });

    return Array.from(new Set(names));
  };

  // Fetch published courses and students on mount
  useEffect(() => {
    if (isOpen) {
      fetchPublishedCourses();
      if (isAdmin) {
        fetchAdminData();
      } else {
        fetchCoachStudents();
      }
    }
  }, [isOpen, effectiveCoachId, isAdmin]);

  const fetchPublishedCourses = async () => {
    try {
      const url = isAdmin
        ? `/api/v2/lms/admin/courses`
        : `/api/v2/lms/coach/courses/published`;
      const params = isAdmin ? { params: { status: 'published' } } : {};
      const response = await api.get(url, params);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchAllStudents = async () => {
    const firstResponse = await api.get('/api/users', {
      params: { role: 'student', page: 1, limit: 1000 },
    });
    const firstStudents = getResponseList(firstResponse, 'users');
    const totalPages = firstResponse.data?.pagination?.pages || 1;

    if (totalPages <= 1) {
      return firstStudents;
    }

    const remainingResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get('/api/users', {
          params: { role: 'student', page: index + 2, limit: 1000 },
        })
      )
    );

    return [
      ...firstStudents,
      ...remainingResponses.flatMap((response) => getResponseList(response, 'users')),
    ];
  };
  const fetchCoachStudents = async () => {
    if (!effectiveCoachId) return;

    try {
      const response = await api.get(
        `/api/v2/lms/coach/${effectiveCoachId}/students`
      );
      setStudents(response.data.data || []);
      const balagruhas = response.data.balagruhas || [];
      setBalagruhasInfo(balagruhas);
      // Select all Balagruhas by default
      if (balagruhas.length > 0 && selectedBalagruhas.length === 0) {
        setSelectedBalagruhas(balagruhas);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch all Balagruhas
      const balagruhasResponse = await api.get(
        `/api/v1/balagruha`
      );
      const allBalagruhas = getResponseList(balagruhasResponse, 'balagruhas');
      setBalagruhasInfo(allBalagruhas);

      // Select all by default
      if (allBalagruhas.length > 0 && selectedBalagruhas.length === 0) {
        setSelectedBalagruhas(allBalagruhas);
      }

      // Fetch all students across all pages
      const studentsData = (await fetchAllStudents())
        .filter((student) => student?.role === 'student');
      // Add balagruhaNames to each student
      const studentsWithInfo = studentsData.map(student => ({
        ...student,
        balagruhaIds: getStudentBalagruhaIds(student),
        balagruhaNames: getStudentBalagruhaNames(student, allBalagruhas)
      }));

      setStudents(studentsWithInfo);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedCourse) {
      toast.error('Please select a course');
      return;
    }

    if (assignmentType === 'students' && selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      if (dueDateObj < new Date()) {
        toast.error('Due date must be in the future');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        courseId: selectedCourse._id,
        assignedBy: effectiveCoachId,
        assignedTo: {
          type: assignmentType,
          ...(assignmentType === 'balagruha'
            ? { balagruhaIds: selectedBalagruhas.map(bg => bg._id || bg.id) }
            : { studentIds: selectedStudents.map(s => s._id) }
          ),
        },
        dueDate: dueDate || null,
        notifications: {
          inApp: sendInAppNotification,
          email: sendEmailNotification,
        },
      };

      // Use admin endpoint if admin, otherwise use coach endpoint
      const url = isAdmin
        ? `/api/v2/lms/admin/courses/assignments`
        : `/api/v2/lms/coach/assignments`;

      const response = await api.post(url, payload);

      toast.success(
        `Course assigned to ${response.data.data.studentsAssigned} student(s)!`
      );

      // Reset form
      resetForm();

      // Call parent callback
      if (onAssignmentCreated) {
        onAssignmentCreated(response.data.data);
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(
        error.response?.data?.error || 'Failed to assign course'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCourse(null);
    setAssignmentType('balagruha');
    setSelectedStudents([]);
    setSelectedBalagruhas(balagruhasInfo);
    setDueDate('');
    setSendInAppNotification(true);
    setSendEmailNotification(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="mt-12 bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex flex-shrink-0 items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Assign Course</h2>
            <p className="text-purple-100 text-sm mt-1">
              Select a published course
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            x
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCourse?._id || ''}
              onChange={(e) => {
                const course = courses.find(c => c._id === e.target.value);
                setSelectedCourse(course);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Select a course --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Category:</span> {selectedCourse.category} -{' '}
                <span className="font-medium">Difficulty:</span> {selectedCourse.difficultyLevel} -{' '}
                <span className="font-medium">Content Items:</span> {selectedCourse.contentItemCount || 0}
              </div>
            )}
          </div>

          {/* Assignment Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To <span className="text-red-500">*</span>
            </label>

            {/* Entire Balagruha Option */}
            <div
              onClick={() => setAssignmentType('balagruha')}
              className={`border-2 rounded-lg p-4 cursor-pointer mb-3 transition ${assignmentType === 'balagruha'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-300'
                }`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  checked={assignmentType === 'balagruha'}
                  onChange={() => setAssignmentType('balagruha')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    Entire Balagruha {balagruhasInfo.length > 0 && `(${students.length} students)`}
                  </div>
                  <div className="text-sm text-gray-600">
                    All students in selected Balagruha(s) will receive this course
                  </div>
                  {/* Balagruha multi-select checkboxes */}
                  {balagruhasInfo.length > 0 && (
                    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          Select Balagruha(s):
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBalagruhas(balagruhasInfo);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBalagruhas([]);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {balagruhasInfo.map((bg) => {
                          const bgId = bg._id || bg.id;
                          return (
                            <label
                              key={bgId}
                              className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedBalagruhas.some(sbg => getEntityId(sbg) === getEntityId(bgId))}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBalagruhas([...selectedBalagruhas, bg]);
                                  } else {
                                    setSelectedBalagruhas(selectedBalagruhas.filter(sbg => getEntityId(sbg) !== getEntityId(bgId)));
                                  }
                                }}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{bg.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedBalagruhas.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          {selectedBalagruhas.length} Balagruha(s) selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Specific Students Option */}
            <div
              onClick={() => setAssignmentType('students')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition ${assignmentType === 'students'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-300'
                }`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={assignmentType === 'students'}
                  onChange={() => setAssignmentType('students')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Specific Students</div>
                  <div className="text-sm text-gray-600">
                    Select individual students below
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Multi-Select (shown only when 'students' is selected) */}
          {assignmentType === 'students' && (
            <StudentMultiSelect
              students={students}
              selectedStudents={selectedStudents}
              onSelectionChange={setSelectedStudents}
              balagruhas={balagruhasInfo}
            />
          )}

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-600">
              Students will see this as the target completion date
            </p>
          </div>

          {/* Notifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notifications
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendInAppNotification}
                  onChange={(e) => setSendInAppNotification(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Send in-app notification to students</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Send email notification to students (if email available)
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCourse}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
