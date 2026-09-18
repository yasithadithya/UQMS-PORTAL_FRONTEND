import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  authService,
  usersService,
  rolesService,
  modulesService,
  invalidateAll,
  AUTH_EXPIRED_EVENT,
  type ApiUser,
  type ApiRole,
  type ApiModule,
} from '@/api';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: ApiRole;
  initials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  users: ApiUser[];
  roles: ApiRole[];
  modules: ApiModule[];
  modulesLoaded: boolean;
  modulesError: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  addUser: (payload: {
    username: string;
    email: string;
    password: string;
    role: string;
    fullName: string;
    nameWithInitials?: string;
    phoneNumber: string;
    address?: string;
    dob?: string;
    empNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, payload: {
    username?: string;
    email?: string;
    password?: string;
    role?: string;
    fullName?: string;
    nameWithInitials?: string;
    phoneNumber?: string;
    address?: string;
    dob?: string;
    empNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
  
  addRole: (payload: { roleName: string; permissions?: { module: string; actions: string[] }[] }) => Promise<{ success: boolean; error?: string }>;
  updateRole: (id: string, payload: { roleName?: string; permissions?: { module: string; actions: string[] }[] }) => Promise<{ success: boolean; error?: string }>;
  deleteRole: (id: string) => Promise<{ success: boolean; error?: string }>;
  refreshRoles: () => Promise<void>;
  refreshModules: () => Promise<void>;
  setModulesOptimistic: (modules: ApiModule[]) => void;
  hasPermission: (moduleName: string | null, action: string) => boolean;
  /** Whether the current user's role grants `action` (default 'read') on the module with this id. Admins always can. */
  canAccessModule: (moduleId: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function makeInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function decodeTokenPayload(token: string): any | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function hasRoleObject(role: unknown): role is ApiRole {
  return typeof role === 'object' && role !== null && typeof (role as ApiRole).roleName === 'string';
}

function parseUserFromToken(token: string): AuthUser | null {
  const payload = decodeTokenPayload(token);
  if (!payload?.id || !hasRoleObject(payload.role)) return null;
  return {
    id: payload.id,
    username: payload.email, // will be overridden when we get full user data
    email: payload.email,
    role: payload.role,
    initials: makeInitials(payload.email || 'U'),
  };
}

function clearStoredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/** Restore the session from localStorage, discarding it if the token is expired or the data is unusable. */
function loadStoredUser(): AuthUser | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const payload = decodeTokenPayload(token);
  if (!payload || (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now())) {
    clearStoredSession();
    return null;
  }

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u?.id && hasRoleObject(u.role)) return u;
    } catch {
      // fall through to the token
    }
  }

  const fromToken = parseUserFromToken(token);
  if (!fromToken) clearStoredSession();
  return fromToken;
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id || u._id || '',
    username: u.username,
    email: u.email,
    role: u.role,
    initials: makeInitials(u.username),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = hasRoleObject(user?.role) && user!.role.roleName.toLowerCase() === 'admin';

  // Fetch users and roles when logged in
  const refreshUsers = useCallback(async () => {
    try {
      const res = await usersService.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const res = await rolesService.getRoles();
      setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  }, []);

  const refreshModules = useCallback(async () => {
    try {
      const res = await modulesService.getModules();
      setModules(res.data);
      setModulesError(null);
    } catch (err: any) {
      console.error('Failed to fetch modules:', err);
      setModulesError(err?.message || 'Failed to load modules.');
    } finally {
      setModulesLoaded(true);
    }
  }, []);

  const setModulesOptimistic = useCallback((updatedModules: ApiModule[]) => {
    setModules(updatedModules);
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (userId) refreshModules();
  }, [userId, refreshModules]);

  // Only admins manage users and roles; other pages fetch what they need themselves.
  useEffect(() => {
    if (userId && isAdmin) {
      refreshUsers();
      refreshRoles();
    }
  }, [userId, isAdmin, refreshUsers, refreshRoles]);

  // Pick up role/permission changes made since this session was stored.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    usersService.getUserById(userId)
      .then((res) => {
        if (cancelled || !res?.data || !hasRoleObject(res.data.role)) return;
        const fresh = toAuthUser(res.data);
        localStorage.setItem('user', JSON.stringify(fresh));
        setUser(fresh);
      })
      .catch(() => { /* a 401 is handled by the auth-expired listener */ });
    return () => { cancelled = true; };
  }, [userId]);

  const login = useCallback(async (loginField: string, password: string) => {
    try {
      setLoading(true);
      const res = await authService.login(loginField, password);
      localStorage.setItem('token', res.token);

      const authUser = toAuthUser(res.user);

      localStorage.setItem('user', JSON.stringify(authUser));
      setUser(authUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setUsers([]);
    setRoles([]);
    setModules([]);
    setModulesLoaded(false);
    invalidateAll();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      if (!localStorage.getItem('token')) return;
      logout();
      toast.warn('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout]);

  const addUser = useCallback(
    async (payload: {
      username: string;
      email: string;
      password: string;
      role: string;
      fullName: string;
      nameWithInitials?: string;
      phoneNumber: string;
      address?: string;
      dob?: string;
      empNumber?: string;
    }) => {
      try {
        await usersService.createUser(payload);
        await refreshUsers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create user' };
      }
    },
    [refreshUsers]
  );

  const updateUser = useCallback(
    async (id: string, payload: {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
      fullName?: string;
      nameWithInitials?: string;
      phoneNumber?: string;
      address?: string;
      dob?: string;
      empNumber?: string;
    }) => {
      try {
        const res = await usersService.updateUser(id, payload);
        if (user && id === user.id && res.data) {
          // Keep the current role if the response didn't populate it.
          const authUser = toAuthUser({ ...res.data, role: hasRoleObject(res.data.role) ? res.data.role : user.role });
          localStorage.setItem('user', JSON.stringify(authUser));
          setUser(authUser);
        }
        if (isAdmin) await refreshUsers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update user' };
      }
    },
    [user, isAdmin, refreshUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      try {
        await usersService.deleteUser(id);
        await refreshUsers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete user' };
      }
    },
    [refreshUsers]
  );

  const addRole = useCallback(
    async (payload: { roleName: string; permissions?: { module: string; actions: string[] }[] }) => {
      try {
        await rolesService.createRole(payload);
        await refreshRoles();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to create role' };
      }
    },
    [refreshRoles]
  );

  const updateRole = useCallback(
    async (id: string, payload: { roleName?: string; permissions?: { module: string; actions: string[] }[] }) => {
      try {
        await rolesService.updateRole(id, payload);
        await refreshRoles();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update role' };
      }
    },
    [refreshRoles]
  );

  const deleteRole = useCallback(
    async (id: string) => {
      try {
        await rolesService.deleteRole(id);
        await refreshRoles();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete role' };
      }
    },
    [refreshRoles]
  );

  const hasPermission = useCallback((moduleName: string | null, action: string) => {
    if (!user || !hasRoleObject(user.role)) return false;
    if (isAdmin) return true;
    
    if (moduleName) {
      const targetModule = modules.find(m => m.name.toLowerCase() === moduleName.toLowerCase());
      if (!targetModule) return false;

      const perm = user.role.permissions?.find(p => {
        const pModId = typeof p.module === 'object' && p.module ? p.module._id : p.module;
        return pModId === targetModule._id;
      });

      if (!perm) return false;
      return !!perm.actions?.includes(action);
    }

    return user.role.permissions?.some(p => p.actions?.includes(action)) || false;
  }, [user, isAdmin, modules]);

  const canAccessModule = useCallback((moduleId: string, action = 'read') => {
    if (!user || !hasRoleObject(user.role)) return false;
    if (isAdmin) return true;
    const perm = user.role.permissions?.find(p => {
      const pModId = typeof p.module === 'object' && p.module ? p.module._id : p.module;
      return pModId === moduleId;
    });
    return !!perm?.actions?.includes(action);
  }, [user, isAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user, users, roles, modules, modulesLoaded, modulesError, isAdmin, loading,
        login, logout, 
        addUser, updateUser, deleteUser, refreshUsers,
        addRole, updateRole, deleteRole, refreshRoles,
        refreshModules, setModulesOptimistic, hasPermission, canAccessModule
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
