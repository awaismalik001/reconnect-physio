import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsAPI, patientsAPI, doctorsAPI, appointmentsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import { Plus, Trash2, X, ClipboardList, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PAYMENT_METHODS = ['cash', 'card', 'bank', 'online'];

// ── Components defined OUTSIDE to prevent re-render focus loss ──
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

function FormTextarea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white resize-none"
      />
    </div>
  );
}

// ── Session Modal ──────────────────────────────────────────────
function SessionModal({ onClose, patients, doctors, therapyTypes, appointments }) {
  const qc = useQueryClient();

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [therapyTypeId, setTherapyTypeId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');

  // Filter appointments for the selected patient (only scheduled ones)
  const patientAppointments = appointments?.filter(
    (a) => String(a.patientId) === String(patientId) && a.status === 'scheduled'
  ) || [];

  // When appointment is selected, auto-fill patient, doctor, date
  const handleAppointmentSelect = (aptId) => {
    setAppointmentId(aptId);
    if (!aptId) return;
    const apt = appointments?.find((a) => String(a.id) === String(aptId));
    if (apt) {
      setPatientId(String(apt.patientId));
      setDoctorId(String(apt.doctorId));
      setDate(apt.date.split('T')[0]);
    }
  };

  const mutation = useMutation({
    mutationFn: sessionsAPI.create,
    onSuccess: () => {
      toast.success('Session recorded! Finance updated automatically.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error recording session.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientId || !doctorId || !date || !duration) {
      return toast.error('Please fill Patient, Doctor, Date and Duration.');
    }
    mutation.mutate({
      patientId, doctorId, therapyTypeId: therapyTypeId || undefined,
      appointmentId: appointmentId || undefined,
      date, duration, notes, progress, nextSteps,
      paymentAmount, paymentMethod, paymentStatus,
    });
  };

  const isCreditOrPending = paymentStatus === 'credit' || paymentStatus === 'pending';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Record Session</h2>
            <p className="text-xs text-gray-400 mt-0.5">Finance record is created automatically</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* STEP 1: Link Appointment (optional but smart) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">
              📅 Link to Appointment (optional)
            </p>
            <p className="text-xs text-blue-600 mb-3">
              Selecting an appointment auto-fills the patient, doctor and date.
            </p>
            <select
              value={appointmentId}
              onChange={(e) => handleAppointmentSelect(e.target.value)}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">No appointment — enter details manually</option>
              {appointments?.filter((a) => a.status === 'scheduled').map((a) => (
                <option key={a.id} value={a.id}>
                  {a.patient?.name} — Dr. {a.doctor?.name} — {format(new Date(a.date), 'MMM d')} at {a.time}
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: Patient & Doctor */}
          <div className="grid grid-cols-2 gap-4">
            <FormSelect label="Patient *" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select Patient</option>
              {patients?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </FormSelect>
            <FormSelect label="Doctor *" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Select Doctor</option>
              {doctors?.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
            </FormSelect>
            <FormSelect label="Therapy Type" value={therapyTypeId} onChange={(e) => setTherapyTypeId(e.target.value)}>
              <option value="">Select Type</option>
              {therapyTypes?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </FormSelect>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              <FormField label="Duration (min) *" type="number" placeholder="60" value={duration} onChange={(e) => setDuration(e.target.value)} required min="1" />
            </div>
          </div>

          {/* STEP 3: Payment — Simplified */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">💳 Payment Details</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <FormField label="Amount (PKR)" type="number" placeholder="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} min="0" />
              <FormSelect label="Payment Status" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                <option value="paid">✅ Paid</option>
                <option value="credit">🔴 Credit (Owed)</option>
                <option value="pending">⏳ Pending</option>
              </FormSelect>
              <FormSelect label="Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </FormSelect>
            </div>
            {/* Status explanation */}
            {paymentStatus === 'paid' && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Payment received — Income record will be created automatically.
              </div>
            )}
            {paymentStatus === 'credit' && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Patient owes this amount — Credit record will be created. You can clear it later.
              </div>
            )}
            {paymentStatus === 'pending' && (
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 p-2 rounded-lg">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                No finance record yet — mark as Paid or Credit when ready.
              </div>
            )}
          </div>

          {/* STEP 4: Notes */}
          <FormTextarea label="Session Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done during this session..." />
          <FormTextarea label="Patient Progress" value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="How is the patient improving?" />
          <FormTextarea label="Next Steps / Homework" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} placeholder="What should happen next..." />

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 shadow-md">
              {mutation.isPending ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Mark-Paid Modal ────────────────────────────────────────────
function MarkPaidModal({ session, onClose }) {
  const qc = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const mutation = useMutation({
    mutationFn: () => sessionsAPI.markPaid(session.id, { paymentMethod }),
    onSuccess: () => {
      toast.success('Credit cleared! Payment recorded as income.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
    onError: () => toast.error('Failed to mark as paid.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Clear Credit</h2>
        <p className="text-sm text-gray-500 mb-4">
          <strong>{session.patient?.name}</strong> owes{' '}
          <strong className="text-red-600">PKR {session.paymentAmount?.toLocaleString()}</strong>.
          Select how they're paying now:
        </p>
        <FormSelect label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </FormSelect>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {mutation.isPending ? 'Processing...' : '✓ Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Sessions Page ─────────────────────────────────────────
export default function Sessions() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [markPaidSession, setMarkPaidSession] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', filterStatus],
    queryFn: () => sessionsAPI.getAll(filterStatus ? { paymentStatus: filterStatus } : {}).then((r) => r.data),
  });

  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: () => patientsAPI.getAll().then((r) => r.data) });
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsAPI.getAll().then((r) => r.data) });
  const { data: therapyTypes = [] } = useQuery({ queryKey: ['therapy-types'], queryFn: () => sessionsAPI.getTherapyTypes().then((r) => r.data) });
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsAPI.getAll({}).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: sessionsAPI.delete,
    onSuccess: () => {
      toast.success('Session deleted.');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const paymentBadge = {
    paid: 'bg-green-100 text-green-700',
    credit: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  // Stats
  const creditTotal = sessions.filter((s) => s.paymentStatus === 'credit').reduce((sum, s) => sum + (s.paymentAmount || 0), 0);
  const creditCount = sessions.filter((s) => s.paymentStatus === 'credit').length;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sessions</h1>
          <p className="text-gray-500 mt-1">{sessions.length} session{sessions.length !== 1 ? 's' : ''} recorded</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-800 shadow-md">
          <Plus className="w-4 h-4" /> Record Session
        </button>
      </div>

      {/* Credit Alert Banner */}
      {creditCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">{creditCount} Credit Session{creditCount > 1 ? 's' : ''} Outstanding</p>
              <p className="text-xs text-red-500">Total owed: PKR {creditTotal.toLocaleString()} — Click "Clear" on any session to collect payment.</p>
            </div>
          </div>
          <button onClick={() => setFilterStatus('credit')} className="text-xs font-semibold text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200">
            Show Credits
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5">
        {[['', 'All Sessions'], ['paid', '✅ Paid'], ['credit', '🔴 Credit'], ['pending', '⏳ Pending']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterStatus === val ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No sessions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Patient</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Doctor</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Therapy</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Dur.</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Amount</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Appt.</th>
                  <th className="text-left py-4 px-4 font-semibold text-blue-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s.id} className={`hover:bg-blue-50/30 transition-colors ${s.paymentStatus === 'credit' ? 'bg-red-50/30' : ''}`}>
                    <td className="py-3 px-4 font-medium text-gray-800">{s.patient?.name}</td>
                    <td className="py-3 px-4 text-gray-500">Dr. {s.doctor?.name}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{s.therapyType?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{format(new Date(s.date), 'MMM d, yyyy')}</td>
                    <td className="py-3 px-4 text-gray-500">{s.duration}m</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">PKR {(s.paymentAmount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${paymentBadge[s.paymentStatus] || paymentBadge.pending}`}>
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">
                      {s.appointment ? (
                        <span className="text-blue-600 font-medium">#{s.appointmentId}</span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {s.paymentStatus === 'credit' && (
                          <button
                            onClick={() => setMarkPaidSession(s)}
                            className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => { if (window.confirm('Delete this session? The finance record will also be removed.')) deleteMutation.mutate(s.id); }}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-500"
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

      {showModal && (
        <SessionModal
          onClose={() => setShowModal(false)}
          patients={patients}
          doctors={doctors}
          therapyTypes={therapyTypes}
          appointments={appointments}
        />
      )}
      {markPaidSession && (
        <MarkPaidModal session={markPaidSession} onClose={() => setMarkPaidSession(null)} />
      )}
    </Layout>
  );
}
