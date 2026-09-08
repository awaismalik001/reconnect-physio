import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { financeAPI, appointmentsAPI, patientsAPI } from '../services/api';
import Layout from '../components/common/Layout';
import {
  Users, DollarSign, CalendarDays, TrendingUp, TrendingDown,
  CreditCard, Clock, AlertCircle, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

function StatCard({ label, value, icon: Icon, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-4 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200' : ''
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeAPI.getSummary({ period: 'monthly' }).then((r) => r.data),
  });

  const { data: todayAppts } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => appointmentsAPI.getToday().then((r) => r.data),
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-recent'],
    queryFn: () => patientsAPI.getAll().then((r) => r.data),
  });

  const recentPatients = patients?.slice(0, 5) || [];

  const chartData = [
    { name: 'Income', amount: summary?.totalIncome || 0, fill: '#10b981' },
    { name: 'Expenses', amount: summary?.totalExpenses || 0, fill: '#ef4444' },
    { name: 'Net Profit', amount: Math.max(0, summary?.netProfit || 0), fill: '#2563eb' },
    { name: 'Credit Due', amount: summary?.totalCreditOutstanding || 0, fill: '#f59e0b' },
  ];

  const hasCredit = (summary?.totalCreditOutstanding || 0) > 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Real-time clinic activity, treatment schedules & financial metrics
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <button
            onClick={() => navigate('/sessions')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 shadow-sm transition-colors text-center"
          >
            + Record Session
          </button>
          <button
            onClick={() => navigate('/appointments')}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors text-center"
          >
            + Book Appointment
          </button>
        </div>
      </div>

      {/* Credit Alert Bar if credit is outstanding */}
      {hasCredit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Outstanding Credit: PKR {(summary?.totalCreditOutstanding || 0).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700">
                {summary?.creditCount || 0} unpaid session(s) pending payment across {summary?.creditPatients || 0} patient(s).
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/finance')}
            className="flex items-center justify-center gap-1 text-xs font-bold text-amber-900 bg-amber-200 px-3.5 py-2 rounded-xl hover:bg-amber-300 transition-colors w-full sm:w-auto"
          >
            Collect in Finance <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <StatCard
          label="Total Patients"
          value={summary?.totalPatients || 0}
          icon={Users}
          color="bg-blue-600"
          sub="Registered in system"
          onClick={() => navigate('/patients')}
        />
        <StatCard
          label="Today's Appointments"
          value={summary?.todayAppointments || 0}
          icon={CalendarDays}
          color="bg-indigo-600"
          sub={format(new Date(), 'EEEE, MMM d')}
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          label="Monthly Income"
          value={`PKR ${(summary?.totalIncome || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="bg-emerald-600"
          sub="Cleared collections"
          onClick={() => navigate('/finance')}
        />
        <StatCard
          label="Outstanding Credit"
          value={`PKR ${(summary?.totalCreditOutstanding || 0).toLocaleString()}`}
          icon={CreditCard}
          color="bg-amber-500"
          sub={`${summary?.creditCount || 0} unpaid session(s)`}
          onClick={() => navigate('/finance')}
        />
      </div>

      {/* Charts + Today's Appointments Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Financial Flow Bar Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Financial Performance</h2>
              <p className="text-xs text-gray-400">Income vs Expenses vs Profit vs Unpaid Credit</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              This Month
            </span>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => [`PKR ${Number(value).toLocaleString()}`, 'Amount']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
              />
              <Bar dataKey="amount" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Appointments List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Today's Schedule</h2>
              <p className="text-xs text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>

          {todayAppts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-gray-400">
              <CalendarDays className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
              {todayAppts?.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{apt.patient?.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {apt.time} · Dr. {apt.doctor?.name}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      apt.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : apt.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Patients Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">Recent Patient Dossiers</h2>
          <button
            onClick={() => navigate('/patients')}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            View All Patients
          </button>
        </div>

        {recentPatients.length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-6">No patient records yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0">
            <table className="w-full min-w-[550px] text-xs">
              <thead className="bg-slate-50 text-gray-600">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold">Patient Name</th>
                  <th className="text-left py-3 px-3 font-semibold">Diagnosis</th>
                  <th className="text-left py-3 px-3 font-semibold">Doctor</th>
                  <th className="text-left py-3 px-3 font-semibold">Payment Status</th>
                  <th className="text-right py-3 px-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-gray-800">{p.name}</td>
                    <td className="py-2.5 px-3 text-gray-500 max-w-[200px] truncate">{p.diagnosis}</td>
                    <td className="py-2.5 px-3 text-gray-600">{p.doctor?.name ? `Dr. ${p.doctor.name}` : '—'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.paymentStatus === 'credit'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => navigate(`/patients/${p.id}`)}
                        className="text-blue-700 font-bold hover:underline"
                      >
                        View Profile →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
