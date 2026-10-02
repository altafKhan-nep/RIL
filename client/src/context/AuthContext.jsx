import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { api } from '../api';

const AuthContext = createContext();

const CACHED_USER_KEY = 'novacart_user';
const TOKEN_KEY = 'novacart_token';
const CACHE_TIMESTAMP_KEY = 'novacart_cache_ts';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  const persistUser = useCallback((userData) => {
    try {
      const toStore = { ...userData, token: userData.token || localStorage.getItem(TOKEN_KEY) };
      localStorage.setItem(TOKEN_KEY, toStore.token);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(toStore));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {}
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem(CACHED_USER_KEY);
    const cachedTs = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const ts = parseInt(cachedTs, 10);
    const isCacheStale = cachedTs && (Date.now() - ts > CACHE_MAX_AGE);

    if (cached && !isCacheStale) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.token === token && parsed.role) {
          setUser({ ...parsed, token });
        }
      } catch {}
    }

    api.getProfile()
      .then((profile) => {
        const merged = { ...profile, token };
        setUser(merged);
        persistUser(merged);
      })
      .catch((err) => {
        const isAuthError = err?.status === 401 || err?.status === 403 ||
          (err?.message && (err.message.includes('Not authorized') || err.message.includes('token failed')));
        if (isAuthError) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(CACHED_USER_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    setUser({ ...data, token: data.token });
    persistUser({ ...data, token: data.token });
    return data;
  }, [persistUser]);

  const register = useCallback(async (name, email, password) => {
    const data = await api.register(name, email, password);
    setUser({ ...data, token: data.token });
    persistUser({ ...data, token: data.token });
    const profile = await api.getProfile();
    setUser((prev) => ({ ...prev, ...profile }));
    persistUser({ ...prev, ...profile, token: data.token });
    return data;
  }, [persistUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    setUser(null);
  }, []);

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
  }), [user, loading, login, register, logout, refreshProfile, toggleWishlist, isAdmin, hasPermission]);

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