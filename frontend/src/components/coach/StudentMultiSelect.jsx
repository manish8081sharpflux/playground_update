import React, { useState } from 'react';

export default function StudentMultiSelect({ students, selectedStudents, onSelectionChange, balagruhas }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBalagruhaFilter, setSelectedBalagruhaFilter] = useState('all');

  const normalizeList = (value) => (Array.isArray(value) ? value : []);

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

  const getStudentBalagruhaNames = (student) => {
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

    const source = normalizeList(balagruhas);
    getStudentBalagruhaIds(student).forEach((bgId) => {
      const bg = source.find((item) => getEntityId(item) === bgId);
      if (bg?.name) names.push(bg.name);
    });

    return Array.from(new Set(names));
  };

  // Filter students based on search query and Balagruha filter
  let filteredStudents = normalizeList(students).filter((student) =>
    !student.role || student.role?.toLowerCase() === 'student'
  );

  // Filter by Balagruha
  if (selectedBalagruhaFilter !== 'all') {
    filteredStudents = filteredStudents.filter((student) =>
      getStudentBalagruhaIds(student).includes(selectedBalagruhaFilter.toString())
    );
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filteredStudents = filteredStudents.filter((student) => {
      const balagruhaNames = getStudentBalagruhaNames(student);
      return (
        student.name?.toLowerCase().includes(query) ||
        student.userId?.toString().toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query) ||
        balagruhaNames.some((name) => name?.toLowerCase().includes(query))
      );
    });
  }
  // Check if a student is selected
  const isStudentSelected = (studentId) => {
    return selectedStudents.some((s) => s._id === studentId);
  };

  // Toggle student selection
  const toggleStudent = (student) => {
    if (isStudentSelected(student._id)) {
      // Remove student
      onSelectionChange(selectedStudents.filter((s) => s._id !== student._id));
    } else {
      // Add student
      onSelectionChange([...selectedStudents, student]);
    }
  };

  // Select all filtered students
  const selectAll = () => {
    const allStudentIds = new Set(selectedStudents.map((s) => s._id));
    const newSelections = filteredStudents.filter(
      (student) => !allStudentIds.has(student._id)
    );
    onSelectionChange([...selectedStudents, ...newSelections]);
  };

  // Deselect all filtered students
  const deselectAll = () => {
    const filteredIds = new Set(filteredStudents.map((s) => s._id));
    onSelectionChange(
      selectedStudents.filter((s) => !filteredIds.has(s._id))
    );
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      {/* Header with selection count and bulk actions */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">
          Select Students ({selectedStudents.length} of {filteredStudents.length} shown)
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={deselectAll}
            className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2 mb-3">
        {/* Balagruha Filter */}
        {balagruhas && balagruhas.length > 1 && (
          <select
            value={selectedBalagruhaFilter}
            onChange={(e) => setSelectedBalagruhaFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Balagruhas</option>
            {balagruhas.map((bg) => {
              const bgId = getEntityId(bg);
              return (
                <option key={bgId} value={bgId}>
                  {bg.name}
                </option>
              );
            })}
          </select>
        )}
        
        {/* Search Filter */}
        <input
          type="text"
          placeholder="Search students by name, ID, or Balagruha..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Student List */}
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
        {filteredStudents.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery || selectedBalagruhaFilter !== 'all' ? 'No students match your filters' : 'No students available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => {
              const isSelected = isStudentSelected(student._id);
              const balagruhaNames = getStudentBalagruhaNames(student);
              return (
                <label
                  key={student._id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleStudent(student)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {student.name || 'Unknown Student'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {student.userId && (
                        <span className="mr-2">ID: {student.userId}</span>
                      )}
                      {balagruhaNames.length > 0 && (
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                          {balagruhaNames.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection Summary (shown at bottom when students are selected) */}
      {selectedStudents.length > 0 && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-900">
            <strong>{selectedStudents.length}</strong> student
            {selectedStudents.length !== 1 ? 's' : ''} selected
          </div>
        </div>
      )}
    </div>
  );
}
