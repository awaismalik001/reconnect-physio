import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doctorsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Trash2, Eye, X, UserRound, Phone, Mail, Award } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Components defined OUTSIDE to prevent focus loss ──
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

function DoctorModal({ onClose, editData }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editData?.name || '');
  const [specialization, setSpecialization] = useState(editData?.specialization || '');
  const [phone, setPhone] = useState(editData?.phone || '');
  const [email, setEmail] = useState(editData?.email || '');
  const [photo, setPhoto] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) => (editData ? doctorsAPI.update(editData.id || editData._id, data) : doctorsAPI.create(data)),
    onSuccess: () => {
      toast.success(editData ? 'Doctor updated!' : 'Doctor registered successfully!');
      qc.invalidateQueries({ queryKey: ['doctors'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error saving doctor details.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !specialization || !phone || !email) {
      return toast.error('Please fill all required fields.');
    }
    const fd = new FormData();
    fd.append('name', name);
    fd.append('specialization', specialization);
    fd.append('phone', phone);
    fd.append('email', email);
    if (photo) fd.append('photo', photo);
    mutation.mutate(fd);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">{editData ? 'Edit Doctor Profile' : 'Add New Doctor'}</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            label="Doctor Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Dr. Sarah Khan"
          />
          <FormField
            label="Specialization / Department *"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            required
            placeholder="e.g. Musculoskeletal, Neurological, Sports Injury"
          />
          <FormField
            label="Phone Number *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="e.g. 03001234567"
          />
          <FormField
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g. sarah.khan@reconnect.com"
          />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files[0])}
              className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-md"
            >
              {mutation.isPending ? 'Saving...' : editData ? 'Update Profile' : 'Save Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Doctors() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsAPI.getAll().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: doctorsAPI.delete,
    onSuccess: () => {
      toast.success('Doctor removed.');
      qc.invalidateQueries({ queryKey: ['doctors'] });
    },
    onError: () => toast.error('Failed to delete doctor.'),
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Doctors & Therapists</h1>
          <p className="text-gray-500 mt-1">{doctors.length} specialist{doctors.length !== 1 ? 's' : ''} on staff</p>
        </div>
        <button
          onClick={() => { setEditData(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-800 shadow-md"
        >
          <Plus className="w-4 h-4" /> Add Doctor
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading doctor profiles...</div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
          <UserRound className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-bold text-gray-700">No doctors registered yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your team of therapists and doctors here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4">
                  {doc.photo ? (
                    <img
                      src={`/uploads/${doc.photo}`}
                      alt={doc.name}
                      className="w-14 h-14 rounded-2xl object-cover border border-blue-100 shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
                      {doc.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate text-base">Dr. {doc.name}</h3>
                    <p className="text-xs text-blue-700 font-semibold mt-0.5 truncate">{doc.specialization}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-1 truncate">
                      <Phone className="w-3 h-3 text-gray-300" /> {doc.phone}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="w-3 h-3 text-gray-300" /> {doc.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 text-xs">
                <div className="flex gap-3 text-gray-500">
                  <span><strong className="text-gray-800">{doc._count?.patients || 0}</strong> patients</span>
                  <span><strong className="text-gray-800">{doc._count?.sessions || 0}</strong> sessions</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditData(doc); setShowModal(true); }}
                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 font-medium text-xs"
                    title="Edit Doctor"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete Dr. ${doc.name}?`)) deleteMutation.mutate(doc.id || doc._id);
                    }}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                    title="Delete Doctor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DoctorModal
          key={(editData?.id || editData?._id) || 'new'}
          onClose={() => setShowModal(false)}
          editData={editData}
        />
      )}
    </Layout>
  );
}
