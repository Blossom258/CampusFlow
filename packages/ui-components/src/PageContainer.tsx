import type { ReactNode } from "react";
import { Card } from "antd";

type PageContainerProps = {
  title?: ReactNode;
  children: ReactNode;
  padding?: number;
};

export const PageContainer = ({
  title,
  children,
  padding = 24,
}: PageContainerProps) => {
  return (
    <div style={{ padding }}>
      <Card bordered title={title}>
        {children}
      </Card>
    </div>
  );
};