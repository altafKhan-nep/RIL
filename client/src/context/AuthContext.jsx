import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';

const AuthContext = createContext();

// The session lives in an httpOnly cookie, so nothing auth-related is stored
// in localStorage/sessionStorage. Only non-sensitive display data is cached so
// the UI can render instantly on reload; the cookie remains the sole source of
// truth for authorisation.
const CACHED_USER_KEY = 'lip_user';
const CACHE_TIMESTAMP_KEY = 'lip_user_ts';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((userData) => {
    try {
      // Strip any token defensively; it must never reach web storage.
      const { token, ...safe } = userData || {};
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(safe));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(CACHED_USER_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      // Remove any legacy token left behind by the previous implementation.
      localStorage.removeItem('novacart_token');
      localStorage.removeItem('novacart_user');
      localStorage.removeItem('novacart_cache_ts');
    } catch {}
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Render from cache immediately, then confirm with the cookie.
    try {
      const cached = localStorage.getItem(CACHED_USER_KEY);
      const cachedTs = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const ts = parseInt(cachedTs, 10);
      const fresh = cachedTs && Date.now() - ts < CACHE_MAX_AGE;
      if (cached && fresh) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.role) {
          if (!cancelled) setUser(parsed);
        }
      }
    } catch {}

    api.getProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        persistUser(profile);
      })
      .catch((err) => {
        const isAuthError =
          err?.status === 401 || err?.status === 403 ||
          (err?.message && (err.message.includes('Not authorized') || err.message.includes('token failed')));
        if (isAuthError || err?.status === 404) {
          if (!cancelled) clearSession();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, persistUser]);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    const profile = await api.getProfile();
    const merged = { ...data, ...profile };
    delete merged.token;
    setUser(merged);
    persistUser(merged);
    return data;
  }, [persistUser]);

  const register = useCallback(async (name, email, password) => {
    const data = await api.register(name, email, password);
    const profile = await api.getProfile();
    const merged = { ...data, ...profile };
    delete merged.token;
    setUser(merged);
    persistUser(merged);
    return data;
  }, [persistUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Even if the request fails, drop local state so the UI locks.
    }
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const profile = await api.getProfile();
    setUser((prev) => {
      const merged = { ...prev, ...profile };
      persistUser(merged);
      return merged;
    });
    return profile;
  }, [persistUser]);

  const toggleWishlist = useCallback(async (productId) => {
    const data = await api.addToWishlist(productId);
    setUser((prev) => ({ ...prev, wishlist: data.wishlist }));
    return data;
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return (user.permissions || []).includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...perms) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return perms.some((p) => (user.permissions || []).includes(p));
  }, [user]);

  const isAdminRole = user?.role && user.role !== 'customer';
  const isAdmin = user?.isAdmin || (user?.role && user.role !== 'customer');

  const value = useMemo(() => ({
    user, loading, login, register, logout, refreshProfile, toggleWishlist,
    isAdmin,
    role: user?.role,
    permissions: user?.permissions || [],
    hasPermission,
    hasAnyPermission,
    isAdminRole,
  }), [user, loading, login, register, logout, refreshProfile, toggleWishlist, isAdmin, hasPermission, hasAnyPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};