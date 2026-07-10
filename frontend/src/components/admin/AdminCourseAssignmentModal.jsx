import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { X, Users } from 'lucide-react';

/**
 * AdminCourseAssignmentModal - Admin can assign courses to any Balagruha
 * Admin has access to ALL Balagruhas and ALL students
 */
export default function AdminCourseAssignmentModal({ isOpen, onClose, course, onAssignmentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(course || null);
  const [balagruhas, setBalagruhas] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBalagruhas, setSelectedBalagruhas] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [assignmentType, setAssignmentType] = useState('balagruha'); // 'balagruha' or 'students'
  const [dueDate, setDueDate] = useState('');
  const [sendInAppNotification, setSendInAppNotification] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [balagruhaFilter, setBalagruhaFilter] = useState('all');

  const normalizeList = (value) => (Array.isArray(value) ? value : []);

  const getResponseList = (response, key) => {
    const data = response?.data?.data;
    return normalizeList(data?.[key] || data || response?.data?.[key]);
  };

  // Fetch all Balagruhas and students on mount
  useEffect(() => {
    if (isOpen) {
      setSelectedCourse(course || null);
      fetchData();
    }
  }, [isOpen]);

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
  const fetchData = async () => {
    setDataLoading(true);
    try {
      const coursesResponse = await api.get('/api/v2/lms/admin/courses', {
        params: { status: 'published' },
      });
      const publishedCourses = getResponseList(coursesResponse, 'courses');
      setCourses(publishedCourses);
      if (!course && publishedCourses.length === 1) {
        setSelectedCourse(publishedCourses[0]);
      }

      // First fetch all Balagruhas
      const balagruhasResponse = await api.get(
        `/api/v1/balagruha`
      );
      const allBalagruhas = getResponseList(balagruhasResponse, 'balagruhas');
      setBalagruhas(allBalagruhas);
      // Select all by default
      setSelectedBalagruhas(allBalagruhas);

      // Then fetch all students across all pages
      const studentsData = (await fetchAllStudents())
        .filter((student) => student?.role === 'student');
      // Normalize Balagruha data for the Specific Students filter/search UI.
      const studentsWithBalagruhaInfo = studentsData.map(student => ({
        ...student,
        balagruhaIds: getStudentBalagruhaIds(student),
        balagruhaNames: getStudentBalagruhaNames(student, allBalagruhas),
      }));
      setStudents(studentsWithBalagruhaInfo);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const assignmentCourse = course || selectedCourse;

    if (!assignmentCourse) {
      toast.error('No course selected');
      return;
    }

    if (assignmentType === 'balagruha' && selectedBalagruhas.length === 0) {
      toast.error('Please select at least one Balagruha');
      return;
    }

    if (assignmentType === 'students' && selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        courseId: assignmentCourse._id,
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

      // Use the admin assignment endpoint so assignments appear in admin assignment management
      const response = await api.post(
        `/api/v2/lms/admin/courses/assignments`,
        payload
      );

      toast.success(
        `Course assigned to ${response.data.data.studentsAssigned} student(s)!`
      );

      if (onAssignmentSuccess) {
        onAssignmentSuccess(response.data.data);
      }

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


  // Helper: get all Balagruha IDs from student safely
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

  // Helper: get Balagruha names safely
  const getStudentBalagruhaNames = (student, balagruhaSource = balagruhas) => {
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

    getStudentBalagruhaIds(student).forEach((bgId) => {
      const bg = normalizeList(balagruhaSource).find((item) => getEntityId(item) === bgId);
      if (bg?.name) names.push(bg.name);
    });

    return Array.from(new Set(names));
  };

  // Filter students by search and Balagruha filter
  const filteredStudents = students.filter(student => {
    const studentBalagruhaIds = getStudentBalagruhaIds(student);
    const studentBalagruhaNames = getStudentBalagruhaNames(student);

    // Filter by Balagruha
    if (balagruhaFilter !== 'all') {
      const isInSelectedBalagruha = studentBalagruhaIds.includes(
        balagruhaFilter.toString()
      );

      if (!isInSelectedBalagruha) return false;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      const matchesName = student.name?.toLowerCase().includes(query);
      const matchesId = student.userId?.toString().toLowerCase().includes(query);
      const matchesEmail = student.email?.toLowerCase().includes(query);
      const matchesBalagruha = studentBalagruhaNames.some(name =>
        name?.toLowerCase().includes(query)
      );

      if (!matchesName && !matchesId && !matchesEmail && !matchesBalagruha) {
        return false;
      }
    }

    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="mt-12 bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 flex flex-shrink-0 items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Assign Course (Admin)</h2>
            <p className="text-purple-100 text-sm mt-1">
              {(course || selectedCourse)?.title || 'Select a published course'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-6">
                    {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Course <span className="text-red-500">*</span>
            </label>
            {course ? (
              <div className="border border-purple-200 bg-purple-50 rounded-lg px-4 py-3">
                <div className="font-medium text-purple-900">{course.title}</div>
                <div className="text-sm text-purple-700 mt-1">
                  {course.category || 'Course'}{course.difficultyLevel ? ` - ${course.difficultyLevel}` : ''}
                </div>
              </div>
            ) : (
              <select
                value={selectedCourse?._id || ''}
                onChange={(e) => {
                  const nextCourse = courses.find((item) => item._id === e.target.value);
                  setSelectedCourse(nextCourse || null);
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={dataLoading}
                required
              >
                <option value="">-- Select a published course --</option>
                {courses.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To <span className="text-red-500">*</span>
            </label>

            {/* Entire Balagruha Option */}
            <div
              onClick={() => setAssignmentType('balagruha')}
              className={`border-2 rounded-lg p-4 cursor-pointer mb-3 transition ${assignmentType === 'balagruha'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300'
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
                    Entire Balagruha(s)
                  </div>
                  <div className="text-sm text-gray-600">
                    All students in selected Balagruha(s) will receive this course
                  </div>

                  {/* Balagruha multi-select checkboxes */}
                  <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">
                        Select Balagruha(s) ({selectedBalagruhas.length} selected):
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBalagruhas(balagruhas);
                          }}
                          className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBalagruhas([]);
                          }}
                          className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {dataLoading ? (
                        <div className="text-center text-gray-500 py-4">Loading Balagruhas...</div>
                      ) : balagruhas.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No Balagruhas found</div>
                      ) : (
                        balagruhas.map((bg) => (
                          <label
                            key={bg._id || bg.id}
                            className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedBalagruhas.some(selected =>
                                (selected._id || selected.id)?.toString() === (bg._id || bg.id)?.toString()
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBalagruhas([...selectedBalagruhas, bg]);
                                } else {
                                  setSelectedBalagruhas(selectedBalagruhas.filter(
                                    selected => (selected._id || selected.id)?.toString() !== (bg._id || bg.id)?.toString()
                                  ));
                                }
                              }}
                              className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">{bg.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Specific Students Option */}
            <div
              onClick={() => setAssignmentType('students')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition ${assignmentType === 'students'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 hover:border-purple-300'
                }`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  checked={assignmentType === 'students'}
                  onChange={() => setAssignmentType('students')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    Specific Students
                  </div>
                  <div className="text-sm text-gray-600">
                    Select individual students from any Balagruha
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Student Selection (only when assignmentType is 'students') */}
          {assignmentType === 'students' && (
            <div className="border border-gray-300 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  <Users className="inline mr-2" size={18} />
                  Select Students ({selectedStudents.length} of {filteredStudents.length} shown)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudents(filteredStudents)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Select All Shown
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStudents([])}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-2 mb-3">
                {/* Balagruha Filter */}
                <select
                  value={balagruhaFilter}
                  onChange={(e) => setBalagruhaFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Balagruhas</option>
                  {balagruhas.map((bg) => (
                    <option key={bg._id || bg.id} value={bg._id || bg.id}>
                      {bg.name}
                    </option>
                  ))}
                </select>

                {/* Search Filter */}
                <input
                  type="text"
                  placeholder="Search students by name, ID, or Balagruha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Student List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {dataLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery || balagruhaFilter !== 'all'
                      ? 'No students match your filters'
                      : 'No students available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <label
                        key={student._id}
                        className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition ${selectedStudents.some(s => s._id === student._id) ? 'bg-purple-50' : ''
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.some(s => s._id === student._id)}
                          onChange={() => {
                            if (selectedStudents.some(s => s._id === student._id)) {
                              setSelectedStudents(selectedStudents.filter(s => s._id !== student._id));
                            } else {
                              setSelectedStudents([...selectedStudents, student]);
                            }
                          }}
                          className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {student.name || 'Unknown Student'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {student.userId && (
                              <span className="mr-2">ID: {student.userId}</span>
                            )}
                            {student.balagruhaNames && student.balagruhaNames.length > 0 && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                {student.balagruhaNames.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Selection Summary */}
              {selectedStudents.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm text-purple-900">
                    <strong>{selectedStudents.length}</strong> student
                    {selectedStudents.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              )}
            </div>
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
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Send in-app notification to students</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Send email notification to students (if email available)</span>
              </label>
            </div>
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !(course || selectedCourse)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








