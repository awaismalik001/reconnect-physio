import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { patientsAPI, doctorsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Search, Trash2, Eye, Pencil, X, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const GENDERS = ['Male', 'Female', 'Other'];

// ── Moved OUTSIDE PatientModal to prevent re-render focus loss ──
function FormField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
      >
        {children}
      </select>
    </div>
  );
}

// ── Patient Modal ────────────────────────────────────────────────
function PatientModal({ onClose, editData, doctors }) {
  const qc = useQueryClient();

  const [name, setName] = useState(editData?.name || '');
  const [age, setAge] = useState(editData?.age || '');
  const [gender, setGender] = useState(editData?.gender || 'Male');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [address, setAddress] = useState(editData?.address || '');
  const [diagnosis, setDiagnosis] = useState(editData?.diagnosis || '');
  const [emergencyContact, setEmergencyContact] = useState(editData?.emergencyContact || '');
  const [emergencyPhone, setEmergencyPhone] = useState(editData?.emergencyPhone || '');
  const [doctorId, setDoctorId] = useState(
    editData?.doctorId?._id || editData?.doctorId?.id || editData?.doctorId || editData?.doctor?._id || editData?.doctor?.id || ''
  );
  const [totalSessions, setTotalSessions] = useState(editData?.totalSessions || '');
  const [startDate, setStartDate] = useState(editData?.startDate ? editData.startDate.split('T')[0] : '');
  const [endDate, setEndDate] = useState(editData?.endDate ? editData.endDate.split('T')[0] : '');
  const [photo, setPhoto] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) =>
      editData ? patientsAPI.update(editData.id || editData._id, data) : patientsAPI.create(data),
    onSuccess: () => {
      toast.success(editData ? 'Patient updated!' : 'Patient added!');
      qc.invalidateQueries({ queryKey: ['patients'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error saving patient.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    if (name) fd.append('name', name);
    if (age) fd.append('age', age);
    if (gender) fd.append('gender', gender);
    if (phone) fd.append('phone', phone);
    if (address) fd.append('address', address);
    if (diagnosis) fd.append('diagnosis', diagnosis);
    if (emergencyContact) fd.append('emergencyContact', emergencyContact);
    if (emergencyPhone) fd.append('emergencyPhone', emergencyPhone);
    if (doctorId) fd.append('doctorId', doctorId);
    if (totalSessions) fd.append('totalSessions', totalSessions);
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    if (photo) fd.append('photo', photo);
    mutation.mutate(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {editData ? 'Edit Patient' : 'Add New Patient'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Full Name *"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. John Doe"
            />
            <FormField
              label="Age *"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              placeholder="e.g. 35"
              min="1"
              max="120"
            />
            <FormSelect label="Gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </FormSelect>
            <FormField
              label="Phone *"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. 03001234567"
            />
            <div className="col-span-1 sm:col-span-2">
              <FormField
                label="Address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. House 12, Street 5, Lahore"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <FormField
                label="Diagnosis *"
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                required
                placeholder="e.g. Lower back pain, Frozen shoulder"
              />
            </div>
            <FormField
              label="Emergency Contact Name"
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Jane Doe"
            />
            <FormField
              label="Emergency Phone"
              type="text"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="e.g. 03009876543"
            />
            <FormSelect
              label="Assigned Doctor"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Select Doctor</option>
              {doctors?.map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.name}</option>
              ))}
            </FormSelect>
            <FormField
              label="Total Sessions Planned"
              type="number"
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              placeholder="e.g. 12"
              min="0"
            />
            <FormField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <FormField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {editData?.photo && (
                <p className="text-xs text-gray-400 mt-1">Current photo exists. Upload new to replace.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-md text-center"
            >
              {mutation.isPending ? 'Saving...' : editData ? 'Update Patient' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Patients Page ───────────────────────────────────────────
export default function Patients() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientsAPI.getAll({ search }).then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsAPI.getAll().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: patientsAPI.delete,
    onSuccess: () => {
      toast.success('Patient deleted.');
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => toast.error('Failed to delete patient.'),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete patient "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const openAdd = () => { setEditData(null); setShowModal(true); };
  const openEdit = (patient) => { setEditData(patient); setShowModal(true); };

  const paymentBadgeClass = (status) => {
    const map = {
      paid: 'bg-green-100 text-green-700',
      credit: 'bg-red-100 text-red-700',
      partial: 'bg-yellow-100 text-yellow-700',
      pending: 'bg-gray-100 text-gray-600',
    };
    return map[status] || map.pending;
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">{patients.length} total patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-800 transition-colors shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Patient
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, phone or diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white shadow-sm"
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading patients...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No patients found.</p>
            <p className="text-sm mt-1">Click "Add Patient" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Patient</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Contact</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Diagnosis</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Doctor</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Sessions</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Payment</th>
                  <th className="text-left py-4 px-5 font-semibold text-blue-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                    {/* Patient Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {p.photo ? (
                          <img
                            src={`/uploads/${p.photo}`}
                            alt={p.name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                            {p.name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.age} yrs · {p.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-gray-600">{p.phone}</td>
                    <td className="py-4 px-5 text-gray-500 max-w-[240px]">
                      <p className="truncate" title={p.diagnosis}>{p.diagnosis}</p>
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      {p.doctor?.name ? `Dr. ${p.doctor.name}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      <span className="font-medium text-blue-700">{p._count?.sessions || 0}</span>
                      {p.totalSessions ? <span className="text-gray-400"> / {p.totalSessions}</span> : ''}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${paymentBadgeClass(p.paymentStatus)}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/patients/${p.id || p._id}`)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                          title="Edit Patient"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id || p._id, p.name)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                          title="Delete Patient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PatientModal
          key={(editData?.id || editData?._id) || 'new'}
          onClose={() => setShowModal(false)}
          editData={editData}
          doctors={doctors}
        />
      )}
    </Layout>
  );
}
