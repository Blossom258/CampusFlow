import React from "react";
import { Button, Card, Form, Input, Select, message } from "antd";
import { request } from "../../api/request";
import { PageContainer } from "@project/ui-components";

const ApplyPage: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = async (values: Record<string, unknown>) => {
    await request({
      url: "/applications",
      method: "POST",
      data: values,
    });
    message.success("申请已提交");
    form.resetFields();
  };

  return (
    <PageContainer title="发起学院事务申请">
      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="申请标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="例如：研究生请假申请" />
          </Form.Item>
          <Form.Item name="type" label="事务类型" rules={[{ required: true, message: "请选择类型" }]}>
            <Select
              options={[
                { label: "请假审批", value: "请假审批" },
                { label: "经费审批", value: "经费审批" },
                { label: "课程事务审批", value: "课程事务审批" },
              ]}
            />
          </Form.Item>
          <Form.Item name="reason" label="申请说明" rules={[{ required: true, message: "请输入说明" }]}>
            <Input.TextArea rows={5} placeholder="请填写申请原因和补充信息" />
          </Form.Item>
          <Button type="primary" htmlType="submit">提交申请</Button>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default ApplyPage;
