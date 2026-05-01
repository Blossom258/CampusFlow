import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, List, Row, Statistic, Table, Tag } from 'antd';
import { PageContainer } from '@project/ui-components';
import { request } from '../../api/request';
import { useAuthStore } from '../../store/useAuthStore';

type ApplicationItem = {
  id: string;
  title: string;
  status: string;
  currentNode: string;
};

type PendingTask = {
  id: string;
  application?: {
    title: string;
    type: string;
    createdBy: string;
  } | null;
};

type AdminOverview = {
  totalUsers: number;
  totalApplications: number;
  runningApplications: number;
  approvedApplications: number;
  pendingTasks: number;
};

type AdminUser = {
  id: string;
  username: string;
  role: string;
  name: string;
};

const roleMap: Record<string, string> = {
  student: '学生',
  tutor: '导师',
  academic_office: '教务办',
  admin: '管理员',
};

const Workspace: React.FC = () => {
  const role = useAuthStore((s) => s.role) || '';
  const [myApplications, setMyApplications] = useState<ApplicationItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    const load = async () => {
      if (role === 'student') {
        const apps = await request<ApplicationItem[]>({ url: '/applications/my', method: 'GET' });
        setMyApplications(apps.data || []);
        return;
      }

      if (role === 'tutor' || role === 'academic_office') {
        const tasks = await request<PendingTask[]>({ url: '/tasks/pending', method: 'GET' });
        setPendingTasks(tasks.data || []);
        return;
      }

      if (role === 'admin') {
        const [overviewResp, usersResp] = await Promise.all([
          request<AdminOverview>({ url: '/admin/overview', method: 'GET' }),
          request<AdminUser[]>({ url: '/admin/users', method: 'GET' }),
        ]);
        setOverview(overviewResp.data);
        setUsers(usersResp.data || []);
      }
    };

    void load();
  }, [role]);

  const roleLabel = useMemo(() => roleMap[role] || role || '用户', [role]);

  if (role === 'student') {
    const running = myApplications.filter((item) => item.status === 'running').length;
    const approved = myApplications.filter((item) => item.status === 'approved').length;

    return (
      <PageContainer title="学生工作台" subtitle="查看我发起的申请进度与处理状态">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}><Card><Statistic title="我的申请总数" value={myApplications.length} /></Card></Col>
          <Col xs={24} md={8}><Card><Statistic title="处理中" value={running} /></Card></Col>
          <Col xs={24} md={8}><Card><Statistic title="已完成" value={approved} /></Card></Col>
        </Row>
        <Card title="最近申请" style={{ marginTop: 16 }}>
          <List
            dataSource={myApplications.slice(0, 5)}
            locale={{ emptyText: '暂无申请记录' }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta title={item.title} description={`当前节点：${item.currentNode}`} />
                <Tag color={item.status === 'approved' ? 'green' : 'blue'}>{item.status}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </PageContainer>
    );
  }

  if (role === 'tutor' || role === 'academic_office') {
    return (
      <PageContainer title="审批工作台" subtitle="集中处理待办审批任务">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}><Card><Statistic title="我的待办任务" value={pendingTasks.length} /></Card></Col>
          <Col xs={24} md={12}><Card><Statistic title="当前角色" value={roleLabel} /></Card></Col>
        </Row>
        <Card title="待办预览" style={{ marginTop: 16 }}>
          <List
            dataSource={pendingTasks.slice(0, 6)}
            locale={{ emptyText: '暂无待审批任务' }}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={item.application?.title || '未关联申请'}
                  description={`类型：${item.application?.type || '-'} | 申请人：${item.application?.createdBy || '-'}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="管理员控制台" subtitle="系统概览与账号权限视图">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Card><Statistic title="系统用户" value={overview?.totalUsers ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="申请总量" value={overview?.totalApplications ?? 0} /></Card></Col>
        <Col xs={24} md={8}><Card><Statistic title="待办任务" value={overview?.pendingTasks ?? 0} /></Card></Col>
        <Col xs={24} md={12}><Card><Statistic title="处理中申请" value={overview?.runningApplications ?? 0} /></Card></Col>
        <Col xs={24} md={12}><Card><Statistic title="已完成申请" value={overview?.approvedApplications ?? 0} /></Card></Col>
      </Row>

      <Card title="账号与角色" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={users}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '用户名', dataIndex: 'username' },
            { title: '角色', dataIndex: 'role', render: (value) => <Tag>{roleMap[value] || value}</Tag> },
          ]}
        />
      </Card>
    </PageContainer>
  );
};

export default Workspace;
