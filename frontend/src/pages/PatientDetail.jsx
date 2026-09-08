import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsAPI, financeAPI } from '../services/api';
import Layout from '../components/common/Layout';
import {
  ArrowLeft, Download, Upload, Trash2, Calendar,
  Clock, FileText, UserRound, Phone, MapPin, Activity,
  CheckCircle2, AlertCircle, FileSpreadsheet, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [docFile, setDocFile] = useState(null);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsAPI.getById(id).then((r) => r.data),
  });

  const uploadDocMutation = useMutation({
    mutationFn: (formData) => patientsAPI.uploadDocument(id, formData),
    onSuccess: () => {
      toast.success('Document uploaded successfully!');
      setDocFile(null);
      qc.invalidateQueries({ queryKey: ['patient', id] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error uploading document.'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => patientsAPI.deleteDocument(docId),
    onSuccess: () => {
      toast.success('Document removed.');
      qc.invalidateQueries({ queryKey: ['patient', id] });
    },
    onError: () => toast.error('Failed to remove document.'),
  });

  const handleUploadDoc = (e) => {
    e.preventDefault();
    if (!docFile) return toast.error('Please select a file to upload.');
    const fd = new FormData();
    fd.append('document', docFile);
    uploadDocMutation.mutate(fd);
  };

  const handleDownloadInvoice = () => {
    const token = localStorage.getItem('token');
    fetch(`/api/finance/invoice/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to generate invoice');
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${patient?.name?.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Invoice downloaded!');
      })
      .catch((e) => toast.error(e.message || 'Error generating invoice.'));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          Loading patient profile...
        </div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout>
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Patient not found.</p>
          <button
            onClick={() => navigate('/patients')}
            className="px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold"
          >
            Back to Patients
          </button>
        </div>
      </Layout>
    );
  }

  // Financial calculations for this patient
  const finances = patient.finances || [];
  const totalPaid = finances
    .filter((f) => f.type === 'income' || f.isPaid)
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const totalCreditOwed = finances
    .filter((f) => f.type === 'credit' && !f.isPaid)
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const paymentBadge = {
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    credit: 'bg-amber-100 text-amber-800 border-amber-200',
    partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    pending: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  return (
    <Layout>
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Patients
        </button>

        <button
          onClick={handleDownloadInvoice}
          className="flex items-center justify-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-800 transition-all shadow-sm w-full sm:w-auto"
        >
          <Download className="w-4 h-4" /> Download Official PDF Invoice
        </button>
      </div>

      {/* Credit Balance Alert if patient owes money */}
      {totalCreditOwed > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Outstanding Balance Due: PKR {totalCreditOwed.toLocaleString()}
              </p>
              <p className="text-xs text-amber-700">
                This patient has pending session fees recorded as credit. Go to Finance to collect.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/finance')}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 shadow-sm text-center"
          >
            Collect in Finance →
          </button>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full lg:w-auto">
            {patient.photo ? (
              <img
                src={`/uploads/${patient.photo}`}
                alt={patient.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-100 shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-black text-2xl flex-shrink-0">
                {patient.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-gray-800">{patient.name}</h1>
                <span
                  className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    paymentBadge[patient.paymentStatus] || paymentBadge.pending
                  }`}
                >
                  {patient.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {patient.age} years old · {patient.gender} · File No: #{String(patient.id || patient._id || '').slice(-6).toUpperCase()}
              </p>
              <p className="text-xs text-blue-600 font-semibold mt-1">
                Registered on {format(new Date(patient.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* 3 Quick Metric Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full lg:w-auto">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Assigned Doctor</p>
              <p className="text-xs font-black text-gray-800 mt-0.5">
                {patient.doctor?.name ? `Dr. ${patient.doctor.name}` : 'Unassigned'}
              </p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Sessions Done</p>
              <p className="text-xs font-black text-blue-700 mt-0.5">
                {patient.sessions?.length || 0} / {patient.totalSessions || '—'}
              </p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase">Total Cleared</p>
              <p className="text-xs font-black text-emerald-600 mt-0.5">
                PKR {totalPaid.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Contact & Medical Details + Document Uploads */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> Patient Medical Profile
            </h2>
            <div className="space-y-3.5 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Diagnosis / Chief Complaint</p>
                <p className="font-bold text-gray-800 mt-0.5">{patient.diagnosis || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Phone Number</p>
                <p className="text-gray-700 flex items-center gap-1.5 mt-0.5 font-medium">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {patient.phone || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Address</p>
                <p className="text-gray-700 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /> {patient.address || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Emergency Contact</p>
                <p className="text-gray-700 mt-0.5">
                  {patient.emergencyContact || '—'} {patient.emergencyPhone ? `(${patient.emergencyPhone})` : ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Treatment Timeline</p>
                <p className="text-gray-700 mt-0.5">
                  {patient.startDate ? format(new Date(patient.startDate), 'MMM d, yyyy') : '—'} to{' '}
                  {patient.endDate ? format(new Date(patient.endDate), 'MMM d, yyyy') : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Documents Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Medical Reports & Documents
            </h2>
            <p className="text-[11px] text-gray-500 mb-4">
              Upload MRI, X-rays, referral letters, or prescriptions.
            </p>

            <form onSubmit={handleUploadDoc} className="space-y-3 mb-4">
              <input
                type="file"
                onChange={(e) => setDocFile(e.target.files[0])}
                className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <button
                type="submit"
                disabled={uploadDocMutation.isPending}
                className="w-full bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadDocMutation.isPending ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {patient.documents?.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No documents attached.</p>
              ) : (
                patient.documents?.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <a
                      href={`/uploads/${doc.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 font-bold hover:underline truncate max-w-[180px]"
                      title={doc.originalName}
                    >
                      {doc.originalName}
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this document?')) deleteDocMutation.mutate(doc.id || doc._id);
                      }}
                      className="text-red-500 hover:bg-red-50 p-1 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sessions History & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sessions List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> Therapy Session History
            </h2>
            {patient.sessions?.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No therapy sessions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {patient.sessions?.map((s) => (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      s.paymentStatus === 'credit'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-gray-100 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {format(new Date(s.date), 'MMMM d, yyyy')} · {s.duration} mins
                      </div>
                      <span
                        className={`font-bold px-2 py-0.5 rounded-full uppercase ${
                          s.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : s.paymentStatus === 'credit'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        PKR {s.paymentAmount?.toLocaleString()} ({s.paymentStatus})
                      </span>
                    </div>
                    {s.notes && (
                      <p className="text-xs text-gray-600 mb-1">
                        <strong className="text-gray-700">Treatment Notes:</strong> {s.notes}
                      </p>
                    )}
                    {s.progress && (
                      <p className="text-xs text-gray-600">
                        <strong className="text-gray-700">Progress:</strong> {s.progress}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billing & Financial Records */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Financial Records & Payments
            </h2>
            {finances.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No financial transactions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[550px] text-xs">
                  <thead className="bg-slate-50 text-gray-600">
                    <tr>
                      <th className="py-2.5 px-3 text-left font-semibold">Date</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Description</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Method</th>
                      <th className="py-2.5 px-3 text-left font-semibold">Status</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {finances.map((f) => {
                      const isIncome = f.type === 'income' || f.isPaid;
                      return (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">{format(new Date(f.date), 'MMM d, yyyy')}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">{f.description}</td>
                          <td className="py-2.5 px-3 uppercase text-gray-500">{f.paymentMethod || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isIncome ? 'Paid' : 'Credit Due'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-black ${
                              isIncome ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {isIncome ? '+' : '⚪'}PKR {f.amount?.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
