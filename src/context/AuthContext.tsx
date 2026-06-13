import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  authService,
  usersService,
  rolesService,
  modulesService,
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

function parseUserFromToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      username: payload.email, // will be overridden when we get full user data
      email: payload.email,
      role: payload.role,
      initials: makeInitials(payload.email),
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        return u;
      } catch {
        return parseUserFromToken(token);
      }
    }
    if (token) return parseUserFromToken(token);
    return null;
  });

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  }, []);

  const setModulesOptimistic = useCallback((updatedModules: ApiModule[]) => {
    setModules(updatedModules);
  }, []);

  useEffect(() => {
    if (user) {
      refreshUsers();
      refreshRoles();
      refreshModules();
    }
  }, [user, refreshUsers, refreshRoles, refreshModules]);

  const login = useCallback(async (loginField: string, password: string) => {
    try {
      setLoading(true);
      const res = await authService.login(loginField, password);
      localStorage.setItem('token', res.token);

      const authUser: AuthUser = {
        id: res.user.id || res.user._id || '',
        username: res.user.username,
        email: res.user.email,
        role: res.user.role,
        initials: makeInitials(res.user.username),
      };

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUsers([]);
    setRoles([]);
    setModules([]);
  }, []);

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
        await usersService.updateUser(id, payload);
        await refreshUsers();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update user' };
      }
    },
    [refreshUsers]
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
    if (!user || !user.role) return false;
    if (user.role.roleName.toLowerCase() === 'admin') return true;
    
    if (moduleName) {
      const targetModule = modules.find(m => m.name.toLowerCase() === moduleName.toLowerCase());
      if (!targetModule) return false;

      const perm = user.role.permissions?.find(p => {
        const pModId = typeof p.module === 'object' ? p.module._id : p.module;
        return pModId === targetModule._id;
      });

      if (!perm) return false;
      return perm.actions.includes(action);
    }
    
    return user.role.permissions?.some(p => p.actions.includes(action)) || false;
  }, [user, modules]);

  return (
    <AuthContext.Provider
      value={{ 
        user, users, roles, modules, loading, 
        login, logout, 
        addUser, updateUser, deleteUser, refreshUsers,
        addRole, updateRole, deleteRole, refreshRoles,
        refreshModules, setModulesOptimistic, hasPermission 
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
