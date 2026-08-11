import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loginStaff, changeStaffPassword, stopStaffPresence, fetchStaffRecord } from '../services/firebaseService';
import { SESSION_DURATION } from '../config/branch';
import { isPwaStandalone } from '../utils/pwaStandalone';

const SESSION_KEY = 'staffSession';
const SESSION_VERSION = 2;
const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.version !== SESSION_VERSION) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (!session.staff?.id) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const persistSession = session.rememberMe || isPwaStandalone();
    if (!persistSession && session.timestamp) {
      if (Date.now() - session.timestamp > SESSION_DURATION) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    }
    return session.staff;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(loadSession);
  const [phase, setPhase] = useState(() => (loadSession() ? 'splash' : 'login'));
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const validatingRef = useRef(false);

  const saveSession = useCallback((staffData, rememberMe) => {
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          version: SESSION_VERSION,
          staff: staffData,
          timestamp: Date.now(),
          rememberMe: rememberMe || isPwaStandalone(),
        })
      );
    } catch {
      /* iOS gizli sekme vb. */
    }
  }, []);

  const updateStaff = useCallback((updates) => {
    setStaff((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw);
          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ ...session, staff: next, timestamp: Date.now() })
          );
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const login = useCallback(async (password, rememberMe = false) => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const result = await loginStaff(password);
      if (result.success && result.staff) {
        setStaff(result.staff);
        saveSession(result.staff, rememberMe);
        setPhase('splash');
        return true;
      }
      setLoginError(result.error || 'Şifre hatalı');
      return false;
    } catch {
      setLoginError('Bağlantı hatası — internet bağlantınızı kontrol edin');
      return false;
    } finally {
      setLoggingIn(false);
    }
  }, [saveSession]);

  const logout = useCallback((message) => {
    stopStaffPresence(true);
    localStorage.removeItem(SESSION_KEY);
    setStaff(null);
    setPhase('login');
    if (message) setLoginError(message);
  }, []);

  const completeSplash = useCallback(() => setPhase('app'), []);
  const forceLogout = useCallback((message) => logout(message), [logout]);

  useEffect(() => {
    if (staff && phase === 'login') setPhase('splash');
  }, [staff, phase]);

  const refreshStaffProfile = useCallback(async () => {
    if (!staff?.id) return null;
    try {
      const fresh = await fetchStaffRecord(staff.id);
      if (!fresh) {
        logout('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
        return null;
      }
      if (fresh.id !== staff.id) {
        logout('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
        return null;
      }
      updateStaff(fresh);
      return fresh;
    } catch {
      /* ignore */
    }
    return null;
  }, [staff?.id, updateStaff, logout]);

  useEffect(() => {
    if (!staff?.id || validatingRef.current) return undefined;
    validatingRef.current = true;
    refreshStaffProfile().finally(() => {
      validatingRef.current = false;
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshStaffProfile();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [staff?.id, refreshStaffProfile]);

  return (
    <AuthContext.Provider
      value={{
        staff,
        phase,
        loginError,
        loggingIn,
        login,
        logout,
        updateStaff,
        refreshStaffProfile,
        completeSplash,
        forceLogout,
        setLoginError,
        changePassword: changeStaffPassword,
        isAuthenticated: !!staff && phase === 'app',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
