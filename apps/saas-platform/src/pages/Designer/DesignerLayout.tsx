import React from "react";

interface DesignerLayoutProps {
  header: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}

/**
 * DesignerLayout
 * 只负责页面结构与布局，不包含任何业务逻辑
 */
const DesignerLayout: React.FC<DesignerLayoutProps> = ({
  header,
  left,
  center,
  right,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        padding: 16,
        background: "#f0f2f5",
      }}
    >
      {/* Header */}
      <div>{header}</div>

      {/* Main */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr 300px",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Panel */}
        <div style={{ height: "100%", overflow: "auto" }}>{left}</div>

        {/* Center Canvas */}
        <div
          style={{
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {center}
        </div>

        {/* Right Panel */}
        <div
          style={{
            height: "100%",
            position: "sticky",
            top: 16,
          }}
        >
          {right}
        </div>
      </div>
    </div>
  );
};

export default DesignerLayout;