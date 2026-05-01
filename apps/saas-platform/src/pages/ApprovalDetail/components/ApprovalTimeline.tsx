import React from "react";
import { Card, Timeline } from "antd";
import type { TimelineProps } from "antd";

export type ApprovalTimelineProps = {
  timelineItems: TimelineProps["items"];
};

const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  timelineItems,
}) => {
  return (
    <Card
      title="审批流转记录"
      style={{ width: 400, flexShrink: 0 }}
    >
      <Timeline
        items={(timelineItems ?? []).map(item => ({
          ...item,
          content:
            typeof item?.content === "string" ? (
              <span style={{ whiteSpace: "pre-line" }}>
                {item.content}
              </span>
            ) : (
              item.content
            ),
        }))}
      />
    </Card>
  );
};

export default ApprovalTimeline;