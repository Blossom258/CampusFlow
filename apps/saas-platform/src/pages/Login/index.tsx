import { useState } from 'react';
import { Button, Card, Input, message, Typography, Tag, Space } from 'antd';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { UserOutlined, KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import './login.css';

const { Text, Title } = Typography;

export default function Login() {
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const success = await login(username, password);
    if (!success) {
      message.error('用户名或密码错误');
      return;
    }
    message.success(`登录成功！当前角色: ${username}`);
    navigate('/apply');
  };

  const quickFill = (role: string) => {
    setUsername(role);
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div>
            <Title level={2} style={{ color: '#eff6ff', marginBottom: 0 }}>
              CampusFlow
            </Title>
            <h2>学院流程审批平台</h2>
            <p>把申请、流转、审批和归档放进同一条标准化链路，减少线下沟通成本，提升事务处理效率。</p>
          </div>
          <Space direction="vertical" size={6}>
            <Text style={{ color: 'rgba(239,246,255,0.9)' }}>支持角色：学生 / 导师 / 教务办 / 管理员</Text>
            <Text style={{ color: 'rgba(239,246,255,0.75)' }}>统一登录入口，按权限进入对应工作区</Text>
          </Space>
        </section>

        <Card bordered={false} className="login-card">
          <div style={{ marginBottom: 20 }}>
            <Title level={3} style={{ marginBottom: 6 }}>登录工作台</Title>
            <Text type="secondary">输入账号后进入业务流程页面</Text>
          </div>

          <Input
            prefix={<UserOutlined style={{ color: '#8da1bf' }} />}
            placeholder="用户名 / 角色"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="large"
            style={{ marginBottom: 14, borderRadius: 12 }}
          />
          <Input.Password
            prefix={<KeyOutlined style={{ color: '#8da1bf' }} />}
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="large"
            style={{ marginBottom: 18, borderRadius: 12 }}
          />

          <Button
            type="primary"
            block
            size="large"
            icon={<SafetyCertificateOutlined />}
            onClick={handleLogin}
            style={{ height: 46, borderRadius: 12, marginBottom: 22 }}
          >
            进入 CampusFlow
          </Button>

          <Text type="secondary" style={{ fontSize: 12 }}>常用角色入口</Text>
          <div className="quick-tags">
            <Tag className="role-tag" onClick={() => quickFill('student')}>学生</Tag>
            <Tag className="role-tag" onClick={() => quickFill('tutor')}>导师</Tag>
            <Tag className="role-tag" onClick={() => quickFill('academic')}>教务办</Tag>
            <Tag className="role-tag" onClick={() => quickFill('admin')}>管理员</Tag>
          </div>
        </Card>
      </div>
    </div>
  );
}
