import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  ensureProfile: (u: User, name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure profile exists
  const ensureProfile = async (u: User, name?: string) => {
    const docRef = doc(db, 'users', u.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const isAdmin = u.email === 'sabushmike@gmail.com';
      await setDoc(docRef, {
        uid: u.uid,
        email: u.email,
        displayName: name || u.displayName || u.email?.split('@')[0] || 'User',
        photoURL: u.photoURL || '',
        role: isAdmin ? 'admin' : 'customer',
        preferredLanguage: 'pt',
        createdAt: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        console.log("Authenticated User:", {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous
        });
        
        // Use onSnapshot for the profile to handle real-time updates (especially during registration)
        const profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Auto-promote specific owner to admin
            if (user.email === 'sabushmike@gmail.com' && data.role !== 'admin') {
              try {
                await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
                // No need to setProfile here, onSnapshot will fire again
              } catch (error) {
                console.error("Error promoting admin:", error);
              }
            } else {
              setProfile(data);
              setLoading(false);
            }
          } else {
            // Profile doesn't exist yet (e.g., registration in progress)
            setProfile(null);
            // Wait for profile creation (usually happens in Login.tsx right after auth)
            // If after 5 seconds it still doesn't exist, we stop the loading spinner
            // so the user can at least see the UI or retry.
            const timer = setTimeout(() => {
              if (!profile) {
                console.warn("User authenticated but no profile document found after timeout");
                setLoading(false);
              }
            }, 5000);
            return () => clearTimeout(timer);
          }
        }, (error) => {
          // If the user already logged out or is logging out, ignore errors from the profile listener
          if (!auth.currentUser || (error.code === 'permission-denied' && !auth.currentUser)) {
            console.log("Profile listener detached or blocked due to logout/session expiration.");
            return;
          }
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });

        return () => profileUnsubscribe();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let idleTimer: any;
    
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (user) {
        // 15 minutes session timeout
        idleTimer = setTimeout(() => {
          console.warn("Session expired due to inactivity");
          auth.signOut();
        }, 15 * 60 * 1000);
      }
    };

    if (user) {
      window.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('keydown', resetIdleTimer);
      window.addEventListener('click', resetIdleTimer);
      resetIdleTimer();
    }

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
    };
  }, [user]);

  const signOut = async () => {
    await auth.signOut();
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, name?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    await ensureProfile(result.user, name);
    try {
      await sendEmailVerification(result.user);
    } catch (e) {
      console.warn("Verification email failed to send", e);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureProfile(result.user);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, signIn, signUp, signInWithGoogle, ensureProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
