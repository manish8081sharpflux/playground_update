import React, { useState, useEffect } from 'react';
import './attendance.css';
import { getUserBalagruhas, getStudentListforAttendance, postmarkAttendance } from '../../api';

const AttendanceComponent = () => {
    const [balagruhas, setBalagruhas] = useState([]);
    const [selectedBalagruha, setSelectedBalagruha] = useState(null);
    const [students, setStudents] = useState([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');
    const [markingStudentId, setMarkingStudentId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const getLocalDateString = (dateValue = new Date()) => {
        const localDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [date, setDate] = useState(getLocalDateString());
    const [metrics, setMetrics] = useState({
        present: 0,
        absent: 0,
        notMarked: 0
    });

    const getBalagruhaList = async () => {
        try {
            // Use getUserBalagruhas instead of getBalagruha - works for all roles
            const response = await getUserBalagruhas();
            // Filter out STOCK option
            const actualBalagruhas = (response?.data || []).filter(b => b._id !== 'STOCK');
            setBalagruhas(actualBalagruhas);
        } catch (error) {
            console.error('Error fetching Balagruhas:', error);
        }
    };

    const getAttendanceStatus = (student) => {
        const status = student?.attendance?.[0]?.status;
        return typeof status === 'string' ? status.trim().toLowerCase() : '';
    };

    const getStudentListBasedonDate = async (id, selectedDate, { resetFilters = true } = {}) => {
        try {
            const response = await getStudentListforAttendance(id, selectedDate);
            const studentList = response?.data?.studentList || [];
            setStudents(studentList);
            if (resetFilters) {
                setStudentSearchQuery('');
                setAttendanceStatusFilter('all');
                setCurrentPage(1);
            }
            updateMetrics(studentList);
        } catch (error) {
            console.error('Error fetching student list:', error);
        }
    };

    const updateMetrics = (studentList = students) => {
        const present = studentList.filter((student) => getAttendanceStatus(student) === 'present').length;
        const absent = studentList.filter((student) => getAttendanceStatus(student) === 'absent').length;
        const notMarked = studentList.filter((student) => !getAttendanceStatus(student)).length;

        setMetrics({ present, absent, notMarked });
    };

    const markAttendance = async (id, type) => {
        const data = {
            balagruhaId: selectedBalagruha,
            studentId: id,
            date,
            status: type,
            notes: ''
        };

        try {
            setMarkingStudentId(id);
            const updatedStudents = students.map((student) =>
                student._id === id
                    ? {
                        ...student,
                        attendance: [{ ...(student.attendance?.[0] || {}), status: type }],
                    }
                    : student
            );
            setStudents(updatedStudents);
            updateMetrics(updatedStudents);

            await postmarkAttendance(data);
            await getStudentListBasedonDate(selectedBalagruha, date, { resetFilters: false });
        } catch (error) {
            console.error('Error marking attendance:', error);
        } finally {
            setMarkingStudentId(null);
        }
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setDate(newDate);

        const resetStudents = students.map(student => ({ ...student, attendance: null }));
        setStudents(resetStudents);
        updateMetrics(resetStudents);

        if (selectedBalagruha) {
            getStudentListBasedonDate(selectedBalagruha, e.target.value);
        }
    };

    useEffect(() => {
        getBalagruhaList();
    }, []);

    const normalizedStudentSearchQuery = studentSearchQuery.trim().toLowerCase();
    const filteredStudents = students.filter((student) => {
        const attendanceStatus = getAttendanceStatus(student);
        const matchesStatus = attendanceStatusFilter === 'all' || attendanceStatus === attendanceStatusFilter;
        const matchesSearch = !normalizedStudentSearchQuery || [student.name, student.userId]
            .filter((value) => value != null)
            .some((value) => String(value).toLowerCase().includes(normalizedStudentSearchQuery));

        return matchesStatus && matchesSearch;
    });
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
    const indexOfLastItem = safeCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentStudents = filteredStudents.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <div className="attendance-page">
            <div className="attendance-management">
                <h2 className="attendance-title">Daily Attendance</h2>

                <div className="date-selector">
                    <label htmlFor="attendance-date">Select Date: </label>
                    <input
                        type="date"
                        id="attendance-date"
                        value={date}
                        onChange={handleDateChange}
                        max={getLocalDateString()}
                    />
                </div>

                {/* Balagruha List */}
                <div className="balagruha-scroll-container">
                    <div className="balagruha-list">
                        {balagruhas.map(balagruha => (
                            <div
                                key={balagruha._id}
                                className={`balagruha-card ${selectedBalagruha === balagruha._id ? 'active' : ''}`}
                                onClick={() => {
                                    setSelectedBalagruha(balagruha._id);
                                    setCurrentPage(1);
                                    getStudentListBasedonDate(balagruha._id, date);
                                }}
                            >
                                <div className="balagruha-icon">🏠</div>
                                <div
                                    className={`balagruha-name ${balagruha.name.length > 18 ? "marquee" : ""
                                        }`}
                                >
                                    <span>{balagruha.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedBalagruha ? (
                    <>
                        <div className="metrics-cards">
                            <div className="metric-card present">
                                <h3>Present</h3>
                                <div className="metric-value">{metrics.present}</div>
                                <div className="metric-icon">✅</div>
                            </div>

                            <div className="metric-card absent">
                                <h3>Absent</h3>
                                <div className="metric-value">{metrics.absent}</div>
                                <div className="metric-icon">❌</div>
                            </div>

                            <div className="metric-card not-marked">
                                <h3>Not Marked</h3>
                                <div className="metric-value">{metrics.notMarked}</div>
                                <div className="metric-icon">❓</div>
                            </div>
                        </div>

                        <div className="attendance-student-filters">
                            <div className="attendance-student-search">
                                <label htmlFor="attendance-student-search">Search students</label>
                                <input
                                    id="attendance-student-search"
                                    type="search"
                                    value={studentSearchQuery}
                                    onChange={(event) => {
                                        setStudentSearchQuery(event.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Search by student name or User ID"
                                />
                            </div>
                            <div className="attendance-status-filter">
                                <label htmlFor="attendance-status-filter">Attendance status</label>
                                <select
                                    id="attendance-status-filter"
                                    value={attendanceStatusFilter}
                                    onChange={(event) => {
                                        setAttendanceStatusFilter(event.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">All students</option>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                </select>
                            </div>
                        </div>

                        <div className="attendance-table-container">
                            {filteredStudents.length > 0 ? (
                                <>
                                    <table className="attendance-table">
                                        <thead>
                                            <tr>
                                                <th>Student Name</th>
                                                <th>Date</th>
                                                <th>Attendance</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {currentStudents.map(student => (
                                                <tr key={student._id}>
                                                    <td>{student.name}</td>
                                                    <td>{date}</td>
                                                    <td>
                                                        <div className="attendance-actions">
                                                            <button
                                                                className={`attendance-button present ${getAttendanceStatus(student) === 'present' ? 'selected' : ''}`}
                                                                onClick={() => markAttendance(student._id, 'present')}
                                                                disabled={markingStudentId === student._id}
                                                            >
                                                                Present
                                                            </button>

                                                            <button
                                                                className={`attendance-button absent ${getAttendanceStatus(student) === 'absent' ? 'selected' : ''}`}
                                                                onClick={() => markAttendance(student._id, 'absent')}
                                                                disabled={markingStudentId === student._id}
                                                            >
                                                                Absent
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {totalPages > 1 && (
                                        <div className="pagination">
                                            <div className="pagination-left">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Prev
                                                </button>

                                                {currentPage <= 2 ? (
                                                    <>
                                                        <button onClick={() => setCurrentPage(1)} className={currentPage === 1 ? "active-page" : ""}>1</button>
                                                        <button onClick={() => setCurrentPage(2)} className={currentPage === 2 ? "active-page" : ""}>2</button>
                                                        <span className="pagination-dots">...</span>
                                                        <button onClick={() => setCurrentPage(totalPages - 1)}>{totalPages - 1}</button>
                                                        <button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                                    </>
                                                ) : currentPage >= totalPages - 1 ? (
                                                    <>
                                                        <button onClick={() => setCurrentPage(1)}>1</button>
                                                        <button onClick={() => setCurrentPage(2)}>2</button>
                                                        <span className="pagination-dots">...</span>
                                                        <button onClick={() => setCurrentPage(totalPages - 1)} className={currentPage === totalPages - 1 ? "active-page" : ""}>{totalPages - 1}</button>
                                                        <button onClick={() => setCurrentPage(totalPages)} className={currentPage === totalPages ? "active-page" : ""}>{totalPages}</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setCurrentPage(1)}>1</button>
                                                        <span className="pagination-dots">...</span>
                                                        <button onClick={() => setCurrentPage(currentPage)} className="active-page">{currentPage}</button>
                                                        <span className="pagination-dots">...</span>
                                                        <button onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                                    </>
                                                )}

                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-selection">
                                    <div className="no-data-icon">👆</div>
                                    <div className="no-data-message">{students.length > 0 ? "No students match the selected search or attendance status." : "No students are assigned to this Balagruha."}</div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="no-selection">
                        <div className="no-data-icon">👆</div>
                        <div className="no-data-message">Please select a Balagruha to view attendance</div>
                    </div>
                )}
            </div>
        </div>
    )
};
export default AttendanceComponent;