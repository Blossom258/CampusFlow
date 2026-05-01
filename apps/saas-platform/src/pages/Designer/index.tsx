import React from "react";
import DesignerLayout from "./DesignerLayout";
import DesignerHeader from "./components/DesignerHeader";
import NodePanel from "./components/NodePanel";
import Canvas from "./components/Canvas";
import PropertiesPanel from "./components/PropertiesPanel";
import { useDesigner } from "./useDesigner";

const DesignerPage: React.FC = () => {
  const designer = useDesigner();

  return (
    <DesignerLayout
      header={<DesignerHeader {...designer.headerProps} />}
      left={<NodePanel />}
      center={<Canvas />}
      right={<PropertiesPanel />}
    />
  );
};

export default DesignerPage;