import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, Chrome, ShieldCheck, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, RouterContext } from '../components/common/RouteLink';
import { signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { parseFirestoreError } from '../lib/firebaseErrors';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useContext } from 'react';
import { cn } from '../lib/utils';

export function Login({ redirect }: { redirect?: string }) {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [strength, setStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { path } = useContext(RouterContext);
  const location = window.location.search;
  
  const redirectPath = redirect || new URLSearchParams(location).get('redirect') || '/';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'register') setIsRegister(true);
    else if (mode === 'login') setIsRegister(false);
  }, [path, location]);

  useEffect(() => {
    if (isRegister) {
      validatePassword(password);
    } else {
      setStrength(0);
      setPasswordFeedback([]);
    }
  }, [password, isRegister]);

  const validatePassword = (pass: string) => {
    let score = 0;
    const feedback: string[] = [];
    if (pass.length >= 8) score++;
    else feedback.push('At least 8 characters');
    if (/[A-Z]/.test(pass)) score++;
    else feedback.push('One uppercase letter');
    if (/[0-9]/.test(pass)) score++;
    else feedback.push('One number');
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    else feedback.push('One special character');
    setStrength(score);
    setPasswordFeedback(feedback);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate(redirectPath);
    } catch (err: any) {
      setError(parseFirestoreError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setResetLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        if (strength < 2) {
          setError('Please choose a stronger password.');
          setLoading(false);
          return;
        }
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate(redirectPath);
    } catch (err: any) {
      setError(parseFirestoreError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 md:p-12 relative overflow-hidden border border-gray-100"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
             <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Premium Marketplace</div>
          </div>
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-3xl italic mb-6 shadow-lg shadow-blue-100">S</div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {isRegister ? t('auth.create_account') : t('auth.welcome_back')}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">{t('auth.experience_best')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-shake">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-2xl text-xs font-bold">
            {message}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="seunome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-4">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {isRegister && password.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 px-2 space-y-3"
              >
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        strength >= i 
                          ? (strength <= 1 ? "bg-red-400" : strength <= 2 ? "bg-orange-400" : strength <= 3 ? "bg-yellow-400" : "bg-green-400")
                          : "bg-gray-100"
                      )}
                    />
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  {strength === 4 ? (
                    <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                       <ShieldCheck className="w-3 h-3" /> Secure Password
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <Shield className="w-3 h-3" /> {strength <= 1 ? 'Very Weak' : strength <= 2 ? 'Weak' : 'Medium'}
                    </div>
                  )}
                  
                  {passwordFeedback.length > 0 && (
                    <div className="flex gap-1">
                      {passwordFeedback.slice(0, 2).map((msg, i) => (
                        <span key={i} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                          {msg}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {!isRegister && (
             <div className="text-right">
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : t('auth.forgot_password')}
                </button>
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRegister ? t('auth.create_account') : t('nav.login'))}
            {!loading && <ArrowRight className="w-6 h-6" />}
          </button>
        </form>

        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-gray-400 bg-white px-4">Or continue with</div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all shadow-sm font-bold text-sm"
        >
          <Chrome className="w-5 h-5 text-red-500" /> Google
        </button>

        <p className="text-center mt-10 text-sm text-gray-500 font-medium">
          {isRegister ? t('auth.have_account') : t('auth.no_account')} <br />
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className={cn(
              "font-black hover:underline mt-2 p-2 transition-colors",
              isRegister ? "text-blue-600" : "text-gray-900"
            )}
          >
            {isRegister ? t('nav.login') : t('auth.create_account')}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
