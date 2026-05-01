import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Spin } from "antd";

import { useApprovalDetail } from "./useApprovalDetail";
import ApprovalDetailLayout from "./ApprovalDetailLayout";

import ApprovalHeader from "./components/ApprovalHeader";
import ApprovalSteps from "./components/ApprovalSteps";
import ApprovalForm from "./components/ApprovalForm";
import ApprovalTimeline from "./components/ApprovalTimeline";

const ApprovalDetailPage: React.FC = () => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const {
    instance,
    formData,
    isCreator,
    canApprove,
    stepItems,
    currentStep,
    timelineItems,
    handlers,
    loading,
  } = useApprovalDetail(instanceId);

  // 页面级 Loading
  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  // 实例不存在
  if (!instance) {
    return (
      <Alert
        style={{ margin: 40 }}
        type="error"
        showIcon
        message="未找到审批单"
        description="该审批单可能不存在或已被删除。"
        action={<a onClick={() => navigate(-1)}>返回</a>}
      />
    );
  }

  // 尚未初始化完成
  if (!instance.definitionSnapshot) {
    return (
      <Alert
        style={{ margin: 40 }}
        type="info"
        showIcon
        message="审批单正在初始化中"
        description="请稍后刷新页面。"
      />
    );
  }

  return (
    <ApprovalDetailLayout
      header={
        <ApprovalHeader
          title={(formData?.title as string) || "无标题申请"}
          status={instance.status}
          instanceId={instance.instanceId}
          canApprove={canApprove}
          isCreator={isCreator}
          onBack={handlers.onBack}
          onApprove={handlers.onApprove}
          onReject={handlers.onReject}
        />
      }
      steps={
        <ApprovalSteps
          currentStep={currentStep}
          stepItems={stepItems}
        />
      }
      form={
        <ApprovalForm
          formData={formData}
          createdAt={instance.createdAt}
        />
      }
      timeline={
        <ApprovalTimeline
          timelineItems={timelineItems}
        />
      }
    />
  );
};

export default ApprovalDetailPage;