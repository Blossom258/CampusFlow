import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import type { Role } from '../types/process';

interface Props {
  children: ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role as Role | null);
  const location = useLocation();

  // 1. 未登录 -> 跳转登录页
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. 角色权限校验
  // 只有当 allowedRoles 存在 且 role 是合法角色时才校验
  if (allowedRoles && role && !allowedRoles.includes(role as Role)) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              返回上一页
            </Button>
          }
        />
      </div>
    );
  }

  // 3. 校验通过
  return <>{children}</>;
}