import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Placed OUTSIDE component so React doesn't recreate inputs on each keystroke ──
function PasswordInput({ label, value, onChange, placeholder = '••••••••' }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { admin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: authAPI.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to change password.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match.');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }
    mutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <Layout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your admin account and credentials</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Admin Profile Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate">{admin?.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{admin?.email}</p>
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Administrator
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Change Password</h2>
              <p className="text-xs sm:text-sm text-gray-400">Update your account login password</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {/* Live Password Requirements Checklist */}
            <div className="bg-blue-50/80 rounded-xl p-4 text-xs text-blue-800 space-y-1.5 border border-blue-100">
              <p className="font-bold mb-1">Password Requirements:</p>
              <p className={`flex items-center gap-2 ${newPassword.length >= 6 ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                {newPassword.length >= 6 ? '✓' : '○'} At least 6 characters
              </p>
              <p
                className={`flex items-center gap-2 ${
                  newPassword && newPassword === confirmPassword ? 'text-emerald-700 font-semibold' : 'text-gray-500'
                }`}
              >
                {newPassword && newPassword === confirmPassword ? '✓' : '○'} Passwords match
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full sm:w-auto px-8 py-3 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm text-center"
              >
                {mutation.isPending ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>


      </div>
    </Layout>
  );
}
