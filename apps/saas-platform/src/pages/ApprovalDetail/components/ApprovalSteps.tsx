import React from "react";
import { Card, Steps } from "antd";
import type { StepsProps } from "antd";

export type ApprovalStepsProps = {
  currentStep: number;
  stepItems: StepsProps["items"];
};

const ApprovalSteps: React.FC<ApprovalStepsProps> = ({
  currentStep,
  stepItems,
}) => {
  return (
    <Card title="流程进度">
      <Steps
        current={currentStep}
        titlePlacement="vertical"
        items={(stepItems ?? []).map((item) => ({
          ...item,
          description:
            typeof item?.description === "string" ? (
              <span style={{ whiteSpace: "pre-line" }}>
                {item.description}
              </span>
            ) : (
              item.description
            ),
        }))}
      />
    </Card>
  );
};

export default ApprovalSteps;