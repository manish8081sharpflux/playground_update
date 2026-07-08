// Doctors Data Bank — Medical Incharge management page for the shared doctors
// directory (model: backend/models/doctor.js). CRUD on name/specialty/hospital/
// contactNumber. Reuses existing admin CRUD patterns (Tailwind) and the same
// /api/doctors endpoints the check-in dropdown already hits, so the dropdown
// gets updated automatically when rows are added/edited/removed here.

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getAllDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "../../api";
import { useAuth } from "../../contexts/AuthContext";

export default function DoctorsDataBank() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState({ name: "", specialty: "", hospital: "", contactNumber: "" });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Role gate — only admin and medical-incharge
  useEffect(() => {
    if (!user) return;
    const role = (user.role || "").toLowerCase();
    if (role !== "admin" && role !== "medical-incharge") {
      toast.error("You don't have access to Doctors Data Bank");
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await getAllDoctors();
      if (res?.success) {
        setDoctors(res.data || []);
      } else {
        toast.error(res?.message || "Failed to load doctors");
      }
    } catch (err) {
      console.error("Error loading doctors:", err);
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Client-side filter on name/specialty/hospital
  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.toLowerCase();
    return doctors.filter(
      (d) =>
        (d.name || "").toLowerCase().includes(q) ||
        (d.specialty || "").toLowerCase().includes(q) ||
        (d.hospital || "").toLowerCase().includes(q) ||
        (d.contactNumber || "").toLowerCase().includes(q)
    );
  }, [doctors, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", specialty: "", hospital: "", contactNumber: "" });
    setModalOpen(true);
  };

  const openEdit = (doctor) => {
    setEditingId(doctor._id);
    setForm({
      name: doctor.name || "",
      specialty: doctor.specialty || "",
      hospital: doctor.hospital || "",
      contactNumber: doctor.contactNumber || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ name: "", specialty: "", hospital: "", contactNumber: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const specialty = form.specialty.trim();
    const hospital = form.hospital.trim();
    const contactNumber = form.contactNumber.trim();

    if (!name) {
      toast.error("Doctor name is required");
      return;
    }

    if (name.length < 3) {
      toast.error("Doctor name must be at least 3 characters");
      return;
    }

    if (specialty && specialty.length < 2) {
      toast.error("Specialty must be at least 2 characters");
      return;
    }

    if (hospital && hospital.length < 2) {
      toast.error("Hospital / Clinic must be at least 2 characters");
      return;
    }

    if (!contactNumber) {
      toast.error("Contact number is required");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(contactNumber)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    const payload = {
      name,
      specialty,
      hospital,
      contactNumber,
    };
    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateDoctor(editingId, payload);
        if (res?.success) {
          toast.success("Doctor updated");
          closeModal();
          fetchDoctors();
        } else {
          toast.error(res?.message || "Update failed");
        }
      } else {
        const res = await createDoctor(payload);
        if (res?.success) {
          toast.success("Doctor added to data bank");
          closeModal();
          fetchDoctors();
        } else {
          toast.error(res?.message || "Create failed");
        }
      }
    } catch (err) {
      console.error("Error saving doctor:", err);
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteDoctor(id);
      if (res?.success) {
        toast.success("Doctor removed");
        setDeleteConfirmId(null);
        fetchDoctors();
      } else {
        toast.error(res?.message || "Delete failed");
      }
    } catch (err) {
      console.error("Error deleting doctor:", err);
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span>🩺</span> Doctors Data Bank
            </h1>
            <p className="text-slate-600 mt-1">
              Manage the shared directory of doctors available for check-ins and follow-ups.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm flex items-center gap-2"
          >
            <span>➕</span> Add Doctor
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 ">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, specialty, hospital, or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading doctors…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 mb-2">
                {search ? "No doctors match your search." : "No doctors in the data bank yet."}
              </p>
              {!search && (
                <button
                  onClick={openCreate}
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                >
                  Add the first doctor →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                Showing {filtered.length} of {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Specialty</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Hospital</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Added By</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doctor) => (
                    <tr key={doctor._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{doctor.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {doctor.specialty || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {doctor.hospital || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {doctor.contactNumber ? (
                          <a href={`tel:${doctor.contactNumber}`} className="text-blue-600 hover:underline">
                            {doctor.contactNumber}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {doctor.createdBy?.name || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(doctor)}
                          className="text-purple-600 hover:text-purple-700 font-medium mr-3"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(doctor._id)}
                          className="text-red-500 hover:text-red-600 font-medium"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit Doctor" : "Add New Doctor"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  minLength={3}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Dr. Jane Smith"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                <input
                  type="text"
                  value={form.specialty}
                  minLength={2}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="e.g., Pediatrics, Cardiology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  value={form.hospital}
                  minLength={2}
                  onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                  placeholder="e.g., Apollo Hospitals"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                <input
                  type="tel"
                  value={form.contactNumber}
                  minLength={10}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  placeholder="e.g., +91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Doctor?</h3>
            <p className="text-slate-600 mb-5">
              This will remove the doctor from the data bank. Existing check-ins that reference this
              doctor by name will be unaffected.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
