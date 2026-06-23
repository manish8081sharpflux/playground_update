import React, { useState, useEffect } from 'react';
import './attendance.css';
import { getUserBalagruhas, getStudentListforAttendance, postmarkAttendance } from '../../api';

const AttendanceComponent = () => {
    const [balagruhas, setBalagruhas] = useState([]);
    const [selectedBalagruha, setSelectedBalagruha] = useState(null);
    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
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

    const getStudentListBasedonDate = async (id, date) => {
        try {
            const response = await getStudentListforAttendance(id, date);
            setStudents(response?.data?.studentList || []);
            updateMetrics(response?.data?.studentList || []);
        } catch (error) {
            console.error('Error fetching student list:', error);
        }
    };

    const updateMetrics = (studentList = students) => {
        const present = studentList.filter(s =>
            s.attendance && s.attendance.length > 0 && s.attendance[0].status === 'present'
        ).length;

        const absent = studentList.filter(s =>
            s.attendance && s.attendance.length > 0 && s.attendance[0].status === 'absent'
        ).length;

        const notMarked = studentList.filter(s =>
            !s.attendance || s.attendance.length === 0 || s.attendance[0].status === null
        ).length;

        setMetrics({ present, absent, notMarked });
    };

    const markAttendance = async (id, type) => {
        const data = {
            balagruhaId: selectedBalagruha,
            studentId: id,
            date: new Date(date).toISOString(),
            status: type,
            notes: ''
        };

        try {
            await postmarkAttendance(JSON.stringify(data));
            getStudentListBasedonDate(selectedBalagruha, date);
        } catch (error) {
            console.error('Error marking attendance:', error);
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

    return (
        <div className="attendance-management">
            <h2 className="attendance-title">Daily Attendance</h2>

            <div className="date-selector">
                <label htmlFor="attendance-date">Select Date: </label>
                <input
                    type="date"
                    id="attendance-date"
                    value={date}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split('T')[0]}
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
                                getStudentListBasedonDate(balagruha._id, date);
                            }}
                        >
                            <div className="balagruha-icon">🏠</div>
                            <div className="balagruha-name">{balagruha.name}</div>
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

                    <div className="attendance-table-container">
                        {students.length > 0 ? (
                            <table className="attendance-table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Date</th>
                                        <th>Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student._id}>
                                            <td>{student.name}</td>
                                            <td>{date}</td>
                                            <td>
                                                <div className="attendance-actions">
                                                    <button
                                                        className={`attendance-button present ${student?.attendance?.[0]?.status === 'present' ? 'selected' : ''}`}
                                                        onClick={() => markAttendance(student._id, 'present')}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        className={`attendance-button absent ${student?.attendance?.[0]?.status === 'absent' ? 'selected' : ''}`}
                                                        onClick={() => markAttendance(student._id, 'absent')}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="no-students-message">
                                <div className="no-data-message">No students are assigned to this Balagruha.</div>
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
    );
};

export default AttendanceComponent;