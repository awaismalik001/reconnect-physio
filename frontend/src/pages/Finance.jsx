import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeAPI, patientsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import {
  Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign,
  Download, AlertCircle, CheckCircle2, Clock, CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const CATEGORIES_INCOME = ['session', 'consultation', 'medicine', 'other'];
const CATEGORIES_EXPENSE = ['rent', 'salary', 'equipment', 'utilities', 'supplies', 'maintenance', 'other'];
const PAYMENT_METHODS = ['cash', 'card', 'bank', 'online'];
const PERIODS = ['daily', 'weekly', 'monthly'];

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

// ── Modal for creating manual finance entry ──
function FinanceModal({ onClose, patients }) {
  const qc = useQueryClient();
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('session');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const mutation = useMutation({
    mutationFn: financeAPI.create,
    onSuccess: () => {
      toast.success('Finance record added!');
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-credits'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error saving record.'),
  });

  const categories = type === 'expense' ? CATEGORIES_EXPENSE : CATEGORIES_INCOME;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !description) return toast.error('Please enter amount and description.');
    mutation.mutate({
      type,
      amount,
      category,
      paymentMethod: type === 'credit' ? null : paymentMethod,
      description,
      patientId: patientId || undefined,
      date,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">Add Finance Record</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector (3 options: Income, Expense, Credit) */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('income'); setCategory('session'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ↑ Income
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory('rent'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ↓ Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('credit'); setCategory('session'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'credit' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔴 Credit
            </button>
          </div>

          <FormField
            label="Amount (PKR) *"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </FormSelect>

            {type !== 'credit' ? (
              <FormSelect label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </FormSelect>
            ) : (
              <div className="flex items-center text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Payment pending from patient
              </div>
            )}
          </div>

          <FormField
            label="Description *"
            placeholder="e.g. Session fee, Medical supplies..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {(type === 'income' || type === 'credit') && (
            <FormSelect label="Associated Patient (Optional)" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">No specific patient</option>
              {patients?.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </FormSelect>
          )}

          <FormField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

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
              {mutation.isPending ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Clear Credit Modal ──
function CollectCreditModal({ creditRecord, onClose }) {
  const qc = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const mutation = useMutation({
    mutationFn: () => financeAPI.markCreditPaid(creditRecord.id || creditRecord._id, { paymentMethod }),
    onSuccess: () => {
      toast.success('Credit collected! Converted to Income.');
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-credits'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      onClose();
    },
    onError: () => toast.error('Failed to collect payment.'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Collect Outstanding Payment</h2>
        <p className="text-xs text-gray-500 mb-4">
          Patient: <strong className="text-gray-800">{creditRecord.patient?.name || 'Walk-in'}</strong>
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-amber-800">Amount Due:</p>
          <p className="text-xl font-black text-amber-700">
            PKR {creditRecord.amount?.toLocaleString()}
          </p>
        </div>

        <FormSelect label="Received Via" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </FormSelect>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Processing...' : '✓ Confirm Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Finance Page ──────────────────────────────────────────
export default function Finance() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [collectCreditRecord, setCollectCreditRecord] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [tab, setTab] = useState('all'); // 'all', 'income', 'expense', 'credits'

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', period],
    queryFn: () => financeAPI.getSummary({ period }).then((r) => r.data),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['finance', tab],
    queryFn: () => {
      const filterType = tab === 'all' || tab === 'credits' ? undefined : tab;
      return financeAPI.getAll(filterType ? { type: filterType } : {}).then((r) => r.data);
    },
  });

  const { data: creditRecords = [] } = useQuery({
    queryKey: ['finance-credits'],
    queryFn: () => financeAPI.getCredits().then((r) => r.data),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsAPI.getAll().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: financeAPI.delete,
    onSuccess: () => {
      toast.success('Finance record and associated session deleted.');
      qc.invalidateQueries({ queryKey: ['finance'] });
      qc.invalidateQueries({ queryKey: ['finance-summary'] });
      qc.invalidateQueries({ queryKey: ['finance-credits'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });

  const unpaidCredits = creditRecords.filter((c) => !c.isPaid);

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Financial Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track clinic revenues, operational expenses & patient credit balances</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-blue-800 shadow-md w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              period === p ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
            }`}
          >
            {p} View
          </button>
        ))}
      </div>

      {/* 4 Financial Stat Cards (Income, Expenses, Net Profit, Outstanding Credit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Total Income</span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 leading-tight">PKR {(summary?.totalIncome || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">Cleared revenue ({period})</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Total Expenses</span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-red-500 leading-tight">PKR {(summary?.totalExpenses || 0).toLocaleString()}</p>
          <p className="text-[11px] text-gray-400 mt-1">Operational costs ({period})</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[11px] font-bold uppercase text-gray-500 tracking-wider">Net Profit</span>
          </div>
          <p className={`text-lg sm:text-xl font-extrabold leading-tight ${(summary?.netProfit || 0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
            PKR {(summary?.netProfit || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Income minus expenses</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200 bg-amber-50/20">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[11px] font-bold uppercase text-amber-800 tracking-wider">Outstanding Credit</span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-600 leading-tight">
            PKR {(summary?.totalCreditOutstanding || 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-amber-700 mt-1">
            {summary?.creditCount || 0} unpaid session(s) owed
          </p>
        </div>
      </div>

      {/* Quick PDF Invoice Generator Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-700" /> Instant Patient Invoice Generator
        </h3>
        <p className="text-xs text-blue-600 mb-3">
          Select any patient to download their branded PDF invoice with full treatment and payment history.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            id="invoicePatientSelect"
            className="flex-1 px-4 py-2.5 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a registered patient...</option>
            {patients?.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.phone})</option>
            ))}
          </select>
          <button
            onClick={() => {
              const select = document.getElementById('invoicePatientSelect');
              if (!select.value) return toast.error('Please select a patient first.');
              const token = localStorage.getItem('token');
              fetch(`/api/finance/invoice/${select.value}`, { headers: { Authorization: `Bearer ${token}` } })
                .then((r) => {
                  if (!r.ok) throw new Error('Invoice generation failed');
                  return r.blob();
                })
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Invoice_Patient_${select.value}_${Date.now()}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Invoice downloaded successfully!');
                })
                .catch(() => toast.error('Failed to download invoice.'));
            }}
            className="px-6 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 flex items-center justify-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Branded PDF
          </button>
        </div>
      </div>

      {/* Tabs Filter (All, Income, Expense, Unpaid Credits) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ['all', 'All Transactions'],
          ['income', '↑ Income Only'],
          ['expense', '↓ Expense Only'],
          ['credits', `🔴 Outstanding Credits (${unpaidCredits.length})`],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === val
                ? val === 'credits'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-blue-700 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table: Switch between General Ledger and Credit Receivables */}
      {tab === 'credits' ? (
        /* ── Outstanding Credits Table ── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <h3 className="font-bold text-sm text-amber-900">Patient Receivables & Outstanding Credit</h3>
            </div>
            <span className="text-xs font-bold text-amber-800">
              Total Due: PKR {unpaidCredits.reduce((s, c) => s + c.amount, 0).toLocaleString()}
            </span>
          </div>

          {unpaidCredits.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-gray-700">No outstanding credit!</p>
              <p className="text-xs mt-1">All patient session balances are cleared.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-slate-50 text-gray-600 text-xs">
                  <tr>
                    <th className="text-left py-3.5 px-4 font-semibold">Patient</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Contact</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Date Incurred</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Session / Description</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Amount Due</th>
                    <th className="text-left py-3.5 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unpaidCredits.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-800">{c.patient?.name || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{c.patient?.phone || '—'}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{format(new Date(c.date), 'MMM d, yyyy')}</td>
                      <td className="py-3 px-4 text-gray-700 text-xs">{c.description}</td>
                      <td className="py-3 px-4 font-black text-amber-700">
                        PKR {c.amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setCollectCreditRecord(c)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm"
                        >
                          Collect Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── All Transactions Table ── */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400">Loading ledger...</div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No finance transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-blue-50 text-blue-900 text-xs">
                  <tr>
                    <th className="text-left py-4 px-4 font-semibold">Type</th>
                    <th className="text-left py-4 px-4 font-semibold">Description</th>
                    <th className="text-left py-4 px-4 font-semibold">Category</th>
                    <th className="text-left py-4 px-4 font-semibold">Method</th>
                    <th className="text-left py-4 px-4 font-semibold">Date</th>
                    <th className="text-left py-4 px-4 font-semibold">Amount</th>
                    <th className="text-left py-4 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => {
                    const isIncome = r.type === 'income';
                    const isCredit = r.type === 'credit';
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-700'
                                : isCredit
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {isIncome ? '↑ Income' : isCredit ? '🔴 Credit' : '↓ Expense'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800 max-w-xs truncate">{r.description}</td>
                        <td className="py-3 px-4 text-gray-500 capitalize text-xs">{r.category}</td>
                        <td className="py-3 px-4 text-gray-500 capitalize text-xs">{r.paymentMethod || '—'}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                        <td
                          className={`py-3 px-4 font-black ${
                            isIncome ? 'text-emerald-600' : isCredit ? 'text-amber-600' : 'text-red-500'
                          }`}
                        >
                          {isIncome ? '+' : isCredit ? '⚪' : '-'}PKR {r.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {isCredit && !r.isPaid && (
                              <button
                                onClick={() => setCollectCreditRecord(r)}
                                className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-200"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this finance entry? Any associated session will also be removed.')) deleteMutation.mutate(r.id || r._id);
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && <FinanceModal onClose={() => setShowModal(false)} patients={patients} />}
      {collectCreditRecord && (
        <CollectCreditModal
          creditRecord={collectCreditRecord}
          onClose={() => setCollectCreditRecord(null)}
        />
      )}
    </Layout>
  );
}
