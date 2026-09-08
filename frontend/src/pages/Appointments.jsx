import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { appointmentsAPI, patientsAPI, doctorsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Trash2, X, CalendarDays, ClipboardCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUSES = ['scheduled', 'completed', 'cancelled'];

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

function AppointmentModal({ onClose, patients, doctors }) {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: appointmentsAPI.create,
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['today-appointments'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error booking appointment.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !date || !time) {
      return toast.error('Please select patient, doctor, date and time.');
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) {
      return toast.error('Appointment date cannot be before today.');
    }
    mutation.mutate({ patientId, doctorId, date, time, notes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Book Future Appointment</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormSelect label="Patient *" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Select Patient</option>
            {patients?.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.phone})</option>
            ))}
          </FormSelect>

          <FormSelect label="Doctor / Therapist *" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors?.map((d) => (
              <option key={d.id || d._id} value={d.id || d._id}>Dr. {d.name} ({d.specialization})</option>
            ))}
          </FormSelect>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Date *"
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <FormField
              label="Time *"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason / Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white resize-none"
              placeholder="e.g. Follow-up session, Assessment..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-md text-center"
            >
              {mutation.isPending ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Appointments() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', filterStatus],
    queryFn: () => appointmentsAPI.getAll(filterStatus ? { status: filterStatus } : {}).then((r) => r.data),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsAPI.getAll().then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsAPI.getAll().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appointmentsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Status updated!');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['today-appointments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: appointmentsAPI.delete,
    onSuccess: () => {
      toast.success('Appointment deleted.');
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['today-appointments'] });
    },
  });

  const statusColor = {
    scheduled: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule patient visits and convert them into completed therapy sessions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-800 shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          ['', 'All Bookings'],
          ['scheduled', '📅 Scheduled'],
          ['completed', '✅ Completed'],
          ['cancelled', '❌ Cancelled'],
        ].map(([s, label]) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterStatus === s
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-gray-700">No appointments found</p>
            <p className="text-xs mt-1">Book an appointment to begin scheduling visits.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-blue-50 text-blue-900 text-xs">
                <tr>
                  <th className="text-left py-4 px-5 font-semibold">Patient</th>
                  <th className="text-left py-4 px-5 font-semibold">Doctor</th>
                  <th className="text-left py-4 px-5 font-semibold">Scheduled Date & Time</th>
                  <th className="text-left py-4 px-5 font-semibold">Status</th>
                  <th className="text-left py-4 px-5 font-semibold">Convert to Session</th>
                  <th className="text-left py-4 px-5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-4 px-5">
                      <p className="font-bold text-gray-800">{apt.patient?.name}</p>
                      <p className="text-xs text-gray-400">{apt.patient?.phone}</p>
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      <p className="font-medium text-gray-800">Dr. {apt.doctor?.name}</p>
                      <p className="text-xs text-gray-400">{apt.doctor?.specialization}</p>
                    </td>
                    <td className="py-4 px-5 text-gray-600">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {apt.time}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(apt.date), 'EEEE, MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="py-4 px-5">
                      <select
                        value={apt.status}
                        onChange={(e) => updateMutation.mutate({ id: apt.id || apt._id, data: { status: e.target.value } })}
                        className={`px-3 py-1 rounded-full text-xs font-bold border-0 outline-none cursor-pointer uppercase ${
                          statusColor[apt.status] || statusColor.scheduled
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-5">
                      {apt.status === 'scheduled' ? (
                        <button
                          onClick={() => navigate('/sessions')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" /> Start Session
                        </button>
                      ) : apt.status === 'completed' ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          ✓ Session Done
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this appointment?')) deleteMutation.mutate(apt.id || apt._id);
                        }}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          patients={patients}
          doctors={doctors}
        />
      )}
    </Layout>
  );
}
