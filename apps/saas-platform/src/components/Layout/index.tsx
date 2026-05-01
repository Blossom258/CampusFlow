import React from 'react';
import { Layout, Menu, Button, theme, Typography, Space, Avatar, message, Tag } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FormOutlined, AuditOutlined, UserOutlined, LogoutOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/useAuthStore';
import './layout.css';

const preloaders: Record<string, () => Promise<unknown>> = {
  '/apply': () => import('../../pages/Apply'),
  '/my-applications': () => import('../../pages/MyApplications'),
  '/approval': () => import('../../pages/Approval'),
  '/workspace': () => import('../../pages/Workspace'),
};

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const menuItems = [
    { key: '/workspace', icon: <AppstoreOutlined />, label: '角色工作台' },
    ...(role === 'user' || role === 'student' || role === 'admin'
      ? [
          { key: '/apply', icon: <FormOutlined />, label: '发起申请' },
          { key: '/my-applications', icon: <UserOutlined />, label: '我发起的申请' },
        ]
      : []),
    ...(role === 'tutor' || role === 'academic_office' || role === 'admin'
      ? [{ key: '/approval', icon: <AuditOutlined />, label: '审批中心' }]
      : []),
  ];

  const roleLabel =
    role === 'admin' ? '管理员' : role === 'student' ? '学生' : role === 'tutor' ? '导师' : role === 'academic_office' ? '教务办' : role || '用户';

  return (
    <Layout className="cf-layout">
      <Sider width={228} className="cf-sider">
        <div className="cf-brand">
          <Title level={5} className="cf-brand-title">CampusFlow</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>Academy Workflow Suite</Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0, background: 'transparent', padding: '8px' }}
          onClick={(item) => navigate(item.key)}
          onMouseEnter={(info) => {
            const key = (info as { key?: string })?.key;
            if (key && preloaders[key]) preloaders[key]();
          }}
        />
      </Sider>

      <Layout>
        <Header className="cf-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 16 }}>工作台</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>审批流程可视化与任务处理</Text>
          </Space>

          <Space size="large">
            <Space>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: role === 'admin' ? '#1e6fff' : '#14b8a6' }} />
              <Tag color={role === 'admin' ? 'blue' : 'cyan'} style={{ margin: 0 }}>{roleLabel}</Tag>
            </Space>
            <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
          </Space>
        </Header>

        <Content className="cf-content">
          <div className="cf-content-inner" style={{ borderRadius: borderRadiusLG }}>
            <Outlet />
          </div>
        </Content>

        <Layout.Footer style={{ textAlign: 'center', color: '#6b7280', background: 'transparent' }}>
          CampusFlow ©{new Date().getFullYear()} 学院流程审批
        </Layout.Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
