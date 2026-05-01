import type { ReactNode } from "react";
import { Tag } from "antd";

export type StatusType = "running" | "approved" | "rejected";

const STATUS_CONFIG: Record<
  StatusType,
  { text: ReactNode; color: string }
> = {
  running: {
    text: "进行中",
    color: "processing",
  },
  approved: {
    text: "已通过",
    color: "success",
  },
  rejected: {
    text: "已拒绝",
    color: "error",
  },
};

type StatusTagProps = {
  status: StatusType;
};

export const StatusTag = ({ status }: StatusTagProps) => {
  const cfg = STATUS_CONFIG[status];

  return <Tag color={cfg.color}>{cfg.text}</Tag>;
};