import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { request } from '../api/request';

/**
 * 用户角色类型
 * 放宽限制，允许从用户名动态推导角色字符串
 */
export type UserRole = 'admin' | string | null; 

interface AuthState {
  token: string | null;
  role: UserRole ;
  username: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
} 

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      username: null,

      /**
       * 登录方法
       * ⭐ 核心逻辑：执行角色标准化处理
       */
      login: async (username, password) => {
        const normalizedUsername = username.trim().toLowerCase();
        const resp = await request<{
          token: string;
          role: string;
          username: string;
        }>({
          url: '/auth/login',
          method: 'POST',
          data: { username: normalizedUsername, password },
        });

        if (!resp?.data?.token) return false;
        set({
          token: resp.data.token,
          role: resp.data.role,
          username: resp.data.username,
        });
        return true;
      }, 

      logout: () => {
        set({ token: null, role: null, username: null });
      },
    }), 
    {
      name: 'enterprise-auth-storage',
      storage: createJSONStorage(() => localStorage), // 持久化存储在 localStorage
    }
  )
);
