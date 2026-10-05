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
import { MODULE_KEYS, isSuperAdminRole, permissionModuleId, type ModuleKey } from '@/utils/permissions';

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
  /** The name-based super admin role ("admin"): unrestricted access. */
  isSuperAdmin: boolean;
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
  /** Whether the user's role grants `action` (default 'read') on the system module with this key. Super admins always can. */
  can: (key: ModuleKey, action?: string) => boolean;
  /** Whether any of `actions` (default read) is granted on any of these modules. */
  canAny: (keys: ModuleKey[], actions?: string[]) => boolean;
  /** Whether the current user's role grants `action` (default 'read') on the module with this id. Super admins always can. */
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

  const isSuperAdmin = hasRoleObject(user?.role) && isSuperAdminRole(user!.role);

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

  const canAccessModule = useCallback((moduleId: string, action = 'read') => {
    if (!user || !hasRoleObject(user.role)) return false;
    if (isSuperAdmin) return true;
    const perm = user.role.permissions?.find(p => permissionModuleId(p.module) === moduleId);
    return !!perm?.actions?.includes(action);
  }, [user, isSuperAdmin]);

  const can = useCallback((key: ModuleKey, action = 'read') => {
    if (!user || !hasRoleObject(user.role)) return false;
    if (isSuperAdmin) return true;
    const mod = modules.find(m => m.key === key);
    return !!mod && canAccessModule(mod._id, action);
  }, [user, isSuperAdmin, modules, canAccessModule]);

  const canAny = useCallback(
    (keys: ModuleKey[], actions: string[] = ['read']) => keys.some(key => actions.some(action => can(key, action))),
    [can]
  );

  const canReadUsers = can(MODULE_KEYS.adminUsers);
  const canManageUsers = can(MODULE_KEYS.adminUsers, 'update');
  const canReadRoles = canReadUsers || can(MODULE_KEYS.adminRoles);

  const userId = user?.id;

  useEffect(() => {
    if (userId) refreshModules();
  }, [userId, refreshModules]);

  // Only user/role managers need the full lists; other pages fetch what they need themselves.
  useEffect(() => {
    if (userId && canReadUsers) refreshUsers();
  }, [userId, canReadUsers, refreshUsers]);

  useEffect(() => {
    if (userId && canReadRoles) refreshRoles();
  }, [userId, canReadRoles, refreshRoles]);

  // Pick up profile changes made since this session was stored. The role is deliberately kept:
  // the backend enforces the permissions captured at login, so the UI reflects the same snapshot.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    usersService.getUserById(userId)
      .then((res) => {
        if (cancelled || !res?.data) return;
        setUser((current) => {
          if (!current) return current;
          const fresh = toAuthUser({ ...res.data, role: current.role });
          localStorage.setItem('user', JSON.stringify(fresh));
          return fresh;
        });
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

  const clearSession = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setUsers([]);
    setRoles([]);
    setModules([]);
    setModulesLoaded(false);
    invalidateAll();
  }, []);

  const logout = useCallback(() => {
    // Best effort: lets the audit log record the sign-out. The request carries the token before it is cleared.
    if (localStorage.getItem('token')) authService.logout().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    const onExpired = () => {
      if (!localStorage.getItem('token')) return;
      clearSession();
      toast.warn('Your session has expired. Please sign in again.', { toastId: 'session-expired' });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

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
          // Keep the session's role: permission changes take effect on the next login.
          const authUser = toAuthUser({ ...res.data, role: user.role });
          localStorage.setItem('user', JSON.stringify(authUser));
          setUser(authUser);
        }
        if (canReadUsers) await refreshUsers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update user' };
      }
    },
    [user, canReadUsers, refreshUsers]
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

  return (
    <AuthContext.Provider
      value={{
        user, users, roles, modules, modulesLoaded, modulesError, isSuperAdmin, loading,
        login, logout, 
        addUser, updateUser, deleteUser, refreshUsers,
        addRole, updateRole, deleteRole, refreshRoles,
        refreshModules, setModulesOptimistic, can, canAny, canAccessModule
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
