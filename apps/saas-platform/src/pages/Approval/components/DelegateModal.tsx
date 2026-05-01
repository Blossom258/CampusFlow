import React from "react";
import { Modal, Select, message } from "antd";
import type { UserRole } from "../../../store/useAuthStore";

interface DelegateModalProps {
  open: boolean;
  currentUserRole: UserRole;

  delegateToRole: UserRole | null;
  onChangeRole: (role: UserRole) => void;

  onCancel: () => void;
  onConfirm: () => void;
}

const DelegateModal: React.FC<DelegateModalProps> = ({
  open,
  currentUserRole,
  delegateToRole,
  onChangeRole,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title="委派审批任务"
      open={open}
      onCancel={onCancel}
      onOk={() => {
        if (!delegateToRole) {
          message.error("请选择委派角色");
          return;
        }
        onConfirm();
      }}
    >
      <Select<UserRole>
        placeholder="请选择委派给的角色"
        style={{ width: "100%" }}
        value={delegateToRole}
        onChange={onChangeRole}
        options={[
          { label: "管理员 (Admin)", value: "admin" },
          { label: "人事 (HR)", value: "hr" },
          { label: "财务 (Finance)", value: "finance" },
          { label: "部门经理 (Manager)", value: "manager" },
        ].filter((opt) => opt.value !== currentUserRole)}
      />
    </Modal>
  );
};

export default DelegateModal;