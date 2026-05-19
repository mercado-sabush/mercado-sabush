import React, { useState } from 'react';
import { User, Mail, Shield, Trash2, AlertTriangle, CheckCircle, Smartphone, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function Settings() {
  const { user, profile, signOut } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [reauthError, setReauthError] = useState('');

  const handleSendVerification = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await sendEmailVerification(user);
      setMessage({ text: 'Verification email sent! Check your inbox.', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message || 'Failed to send verification email.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !password) return;
    setLoading(true);
    setReauthError('');
    try {
      // Re-authenticate user before deletion
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete user profile and other data (simplified)
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete auth user
      await deleteUser(user);
      
      // Cleanup completed (though deleteUser might redirect or trigger sign out automatically)
      window.location.href = '/';
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setReauthError('Incorrect password. Please try again.');
      } else {
        setReauthError(error.message || 'Failed to delete account.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic mb-2">Account Settings</h1>
        <p className="text-gray-500 font-medium">Manage your security and account preferences.</p>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-8 p-6 rounded-3xl border flex items-center gap-4 shadow-sm",
            message.type === 'success' ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
          )}
        >
          {message.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          <p className="font-black italic">{message.text}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-[35px] mx-auto mb-6 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-300" />
              )}
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-1">{profile.displayName || 'No Name'}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{profile.role}</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-bold text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => signOut()}
            className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3"
          >
            Sign Out
          </button>
        </div>

        {/* Security Actions */}
        <div className="lg:col-span-8 space-y-6">
          {/* Email Verification */}
          {!user.emailVerified && user.providerData?.[0]?.providerId === 'password' && (
            <div className="bg-orange-50 p-8 rounded-[40px] border border-orange-100">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-white rounded-2xl text-orange-600 shadow-sm">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Verify Your Email</h3>
                  <p className="text-sm text-gray-600 font-medium">Protect your account and unlock all features by verifying your email address.</p>
                </div>
              </div>
              <button 
                onClick={handleSendVerification}
                disabled={loading}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                Send Verification Email
              </button>
            </div>
          )}

          {/* MFA / Security Info */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-6 italic">Security Shield</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-gray-100">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 underline decoration-blue-500/30">Two-Factor Authentication</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Highly Recommended</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-gray-100 text-[10px] font-black text-gray-500 uppercase rounded-full">Not Active</div>
              </div>

              <div className="flex items-center justify-between p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 shadow-sm border border-gray-100">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 underline decoration-purple-500/30">Active Sessions</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Currently 1 Device</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-purple-600 uppercase hover:underline">Manage</button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/50 p-8 rounded-[40px] border border-red-100 border-dashed">
            <h3 className="text-xl font-black text-red-600 mb-2 italic">Danger Zone</h3>
            <p className="text-sm text-red-500 font-medium mb-6">Irreversible actions that affect your account and data.</p>
            
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="p-4 bg-white rounded-2xl border border-red-200 shadow-sm">
                  <p className="text-xs font-black text-red-600 mb-2 uppercase tracking-widest">Verify Password to Proceed</p>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500 outline-none pr-12 font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {reauthError && <p className="mt-2 text-[10px] font-bold text-red-600">{reauthError}</p>}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={loading || !password}
                    className="flex-2 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    Confirm Permanent Deletion
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
