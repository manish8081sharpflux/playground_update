import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api';
import { X, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CoachAssignmentEditModal({ isOpen, onClose, assignment, onSaved, coachId }) {
  const { user } = useAuth();
  const effectiveCoachId = coachId || user?.id || user?._id;
  const [courses, setCourses] = useState([]);
  const [balagruhas, setBalagruhas] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignmentType, setAssignmentType] = useState('balagruha');
  const [selectedBalagruhas, setSelectedBalagruhas] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [status, setStatus] = useState('active');
  const [dueDate, setDueDate] = useState('');
  const [sendInAppNotification, setSendInAppNotification] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizeList = (value) => (Array.isArray(value) ? value : []);


  const resolveBalagruhaById = (id) => normalizeList(balagruhas).find((bg) => (bg._id || bg.id)?.toString() === id?.toString());
  const resolveStudentById = (id) => normalizeList(students).find((student) => (student._id || student.id)?.toString() === id?.toString());
  const getIdString = (item) => {
    if (!item) return '';
    const id = item._id || item.id || item;
    return id?.toString?.() || '';
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

    const source = normalizeList(balagruhaSource);
    getStudentBalagruhaIds(student).forEach((bgId) => {
      const bg = source.find((item) => getEntityId(item) === bgId);
      if (bg?.name) names.push(bg.name);
    });

    return Array.from(new Set(names));
  };

  const resetSelections = () => {
    setSelectedCourse(null);
    setAssignmentType('balagruha');
    setSelectedBalagruhas([]);
    setSelectedStudents([]);
    setStatus('active');
    setDueDate('');
    setSendInAppNotification(true);
    setSendEmailNotification(false);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetSelections();
      setDataLoaded(false);
    }
  }, [isOpen, effectiveCoachId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, effectiveCoachId]);

  useEffect(() => {
    if (!isOpen || !assignment || !dataLoaded || normalizeList(balagruhas).length === 0) return;

    setStatus(assignment.status || 'active');
    setDueDate(assignment.dueDate ? assignment.dueDate.slice(0, 10) : '');
    setSendInAppNotification(assignment.notifications?.inApp ?? true);
    setSendEmailNotification(assignment.notifications?.email ?? false);
    setAssignmentType(assignment.assignedTo?.type || 'balagruha');

    const selectedCourseObj = assignment.courseId && typeof assignment.courseId === 'object'
      ? assignment.courseId
      : { _id: assignment.courseId, title: assignment.courseTitle || '' };
    setSelectedCourse(selectedCourseObj);

    const balagruhaIdsFromList = normalizeList(assignment.assignedTo?.balagruhaIds || []).map((item) =>
      typeof item === 'object' ? item._id : item
    );
    const balagruhaIdLegacy = assignment.assignedTo?.balagruhaId;
    const balagruhaIds = balagruhaIdsFromList.length > 0
      ? balagruhaIdsFromList
      : balagruhaIdLegacy
        ? [typeof balagruhaIdLegacy === 'object' ? balagruhaIdLegacy._id : balagruhaIdLegacy]
        : [];

    const balagruhaSelection = balagruhaIds
      .map((id) => resolveBalagruhaById(id) || { _id: id })
      .filter(Boolean);
    setSelectedBalagruhas(balagruhaSelection);

    const studentIds = normalizeList(assignment.assignedTo?.studentIds || []).map((item) =>
      typeof item === 'object' ? item._id : item
    );
    const studentSelection = studentIds
      .map((id) => resolveStudentById(id) || { _id: id })
      .filter(Boolean);
    setSelectedStudents(studentSelection);
  }, [isOpen, assignment, dataLoaded, balagruhas, students]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [coursesResponse, studentsResponse] = await Promise.all([
        api.get('/api/v2/lms/coach/courses/published'),
        api.get(`/api/v2/lms/coach/${effectiveCoachId}/students`),
      ]);

      const courseList = normalizeList(coursesResponse.data.data);
      setCourses(courseList);

      const balagruhaList = normalizeList(studentsResponse.data.balagruhas);
      setBalagruhas(balagruhaList);

      const studentsList = normalizeList(studentsResponse.data.data).map((student) => ({
        ...student,
        balagruhaIds: getStudentBalagruhaIds(student),
        balagruhaNames: getStudentBalagruhaNames(student, balagruhaList),
      }));
      setStudents(studentsList);
    } catch (error) {
      console.error('Error fetching edit assignment data:', error);
      toast.error('Failed to load edit assignment data');
    } finally {
      setDataLoading(false);
      setDataLoaded(true);
    }
  };
  const filteredStudents = normalizeList(students).filter((student) => {
    const studentBalagruhaNames = getStudentBalagruhaNames(student);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = student.name?.toLowerCase().includes(query);
      const matchesId = student.userId?.toString().toLowerCase().includes(query);
      const matchesEmail = student.email?.toLowerCase().includes(query);
      const matchesBalagruha = studentBalagruhaNames.some((name) =>
        name?.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesId && !matchesEmail && !matchesBalagruha) return false;
    }

    return true;
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!assignment) {
      toast.error('No assignment selected');
      return;
    }

    if (!selectedCourse) {
      toast.error('Please select a course');
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

    if (dueDate) {
      const dueDateObj = new Date(dueDate);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (dueDateObj < todayStart) {
        toast.error('Due date must be today or in the future');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        courseId: selectedCourse._id,
        assignedTo: {
          type: assignmentType,
          ...(assignmentType === 'balagruha'
            ? { balagruhaIds: selectedBalagruhas.map((bg) => bg._id || bg.id) }
            : { studentIds: selectedStudents.map((student) => student._id) }
          ),
        },
        dueDate: dueDate || null,
        status,
        notifications: {
          inApp: sendInAppNotification,
          email: sendEmailNotification,
        },
      };

      await api.put(`/api/v2/lms/coach/assignments/${assignment._id}`, payload);

      toast.success('Assignment updated successfully');
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (student) => {
    const studentId = getIdString(student);
    const alreadySelected = selectedStudents.some((s) => getIdString(s) === studentId);
    if (alreadySelected) {
      setSelectedStudents(selectedStudents.filter((s) => getIdString(s) !== studentId));
    } else {
      setSelectedStudents([...selectedStudents.filter((s) => getIdString(s) !== studentId), student]);
    }
  };

  const isStudentSelected = (studentId) => {
    const idString = getIdString(studentId);
    return selectedStudents.some((student) => getIdString(student) === idString);
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((course) => course._id === courseId);
    setSelectedCourse(course || null);
  };

  const selectAllStudents = () => {
    const allStudentIds = new Set(selectedStudents.map((s) => getIdString(s)));
    const newSelections = filteredStudents.filter((student) => !allStudentIds.has(getIdString(student)));
    setSelectedStudents([...selectedStudents, ...newSelections]);
  };

  const clearAllStudents = () => {
    const filteredIds = new Set(filteredStudents.map((student) => getIdString(student)));
    setSelectedStudents(selectedStudents.filter((student) => !filteredIds.has(getIdString(student))));
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white mt-16 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-purple-600 text-white px-6 py-4 flex flex-shrink-0 items-center justify-between rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Edit Course Assignment</h2>
            <p className="text-purple-100 text-sm mt-1">Update course, assignees, due date, and status</p>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-scroll custom-scrollbar p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Course <span className="text-red-500">*</span></label>
            <select
              value={selectedCourse?._id || ''}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">-- Select a course --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </select>
            {selectedCourse && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Category:</span> {selectedCourse.category || 'N/A'} -{' '}
                <span className="font-medium">Difficulty:</span> {selectedCourse.difficultyLevel || 'N/A'} -{' '}
                <span className="font-medium">Content Items:</span> {selectedCourse.contentItemCount || 0}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign To <span className="text-red-500">*</span></label>

            <div
              onClick={() => setAssignmentType('balagruha')}
              className={`border-2 rounded-lg p-4 cursor-pointer mb-3 transition ${assignmentType === 'balagruha' ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-300'}`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  checked={assignmentType === 'balagruha'}
                  onChange={() => setAssignmentType('balagruha')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Entire Balagruha(s)</div>
                  <div className="text-sm text-gray-600">All students in selected Balagruha(s) will receive this course</div>
                  <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Select Balagruha(s):</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedBalagruhas(balagruhas); }}
                          className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedBalagruhas([]); }}
                          className="text-xs text-purple-600 hover:text-purple-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                              {dataLoading ? (
                        <div className="text-center text-gray-500 py-4">Loading Balagruhas...</div>
                      ) : normalizeList(balagruhas).length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No Balagruhas found</div>
                      ) : (
                        normalizeList(balagruhas).map((bg) => {
                          const bgId = getIdString(bg);
                          const checked = selectedBalagruhas.some((selected) => getIdString(selected) === bgId);
                          return (
                            <label key={bgId} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBalagruhas([
                                      ...selectedBalagruhas.filter((selected) => getIdString(selected) !== bgId),
                                      bg,
                                    ]);
                                  } else {
                                    setSelectedBalagruhas(selectedBalagruhas.filter((selected) => getIdString(selected) !== bgId));
                                  }
                                }}
                                className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{bg.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {selectedBalagruhas.length > 0 && (
                      <div className="mt-2 text-xs text-purple-600">
                        {selectedBalagruhas.length} Balagruha(s) selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => setAssignmentType('students')}
              className={`border-2 rounded-lg p-4 cursor-pointer transition ${assignmentType === 'students' ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-purple-300'}`}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  checked={assignmentType === 'students'}
                  onChange={() => setAssignmentType('students')}
                  className="mr-3 mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Specific Students</div>
                  <div className="text-sm text-gray-600">Select individual students from any Balagruha</div>
                </div>
              </div>
            </div>
          </div>

          {assignmentType === 'students' && (
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  <Users className="inline mr-2" size={18} />
                  Select Students ({selectedStudents.length} of {filteredStudents.length} shown)
                </h3>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllStudents} className="text-sm text-purple-600 hover:text-purple-700">Select All Shown</button>
                  <button type="button" onClick={clearAllStudents} className="text-sm text-purple-600 hover:text-purple-700">Clear</button>
                </div>
              </div>

              <div className="space-y-3 mb-3">
                <div>
                  <input
                    type="text"
                    placeholder="Search students by name, ID, or Balagruha"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {dataLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">{searchQuery ? 'No students match your search' : 'No students available'}</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <label key={student._id} className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition ${isStudentSelected(student._id) ? 'bg-purple-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isStudentSelected(student._id)}
                          onChange={() => toggleStudentSelection(student)}
                          className="mr-3 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{student.name || 'Unknown Student'}</div>
                          <div className="text-sm text-gray-600">
                            {student.userId && <span className="mr-2">ID: {student.userId}</span>}
                            {student.balagruhaNames && student.balagruhaNames.length > 0 && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">{student.balagruhaNames.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudents.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-sm text-purple-900"><strong>{selectedStudents.length}</strong> student{selectedStudents.length !== 1 ? 's' : ''} selected</div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ fontSize: "12px" }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled" >Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notifications</label>
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
