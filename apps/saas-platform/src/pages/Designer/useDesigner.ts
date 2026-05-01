import { message } from "antd";
import { useFlowStore } from "../../store/flowStore";

export function useDesigner() {
  const publishFlow = useFlowStore((s) => s.publishFlow);
  const resetFlow = useFlowStore((s) => s.resetFlow);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const publishedFlows = useFlowStore((s) => s.publishedFlows);
  const validateFlow = useFlowStore((s) => s.validateFlow);

  const editingMode = useFlowStore((s) => s.editingMode);
  const processId = useFlowStore((s) => s.processId);
  const duplicatePublishedAsDraft = useFlowStore(
    (s) => s.duplicatePublishedAsDraft
  );

  // 派生当前发布版本信息
  const currentPublished = publishedFlows.find(
    (f) => f.id === processId
  );

  const currentVersionLabel =
    currentPublished && currentPublished.version
      ? `v${currentPublished.version}`
      : null;

  const handlePublish = () => {
    const result = validateFlow();

    if (!result.success) {
      message.error(result.error);
      return;
    }

    publishFlow();
    message.success("校验通过，模板已成功发布！");
  };

  const handleCreateNew = () => {
    resetFlow();
    message.success("已创建新画布");
  };

  const handleLoadFlow = (id: string) => {
    const target = publishedFlows.find((f) => f.id === id);
    if (!target) return;

    loadFlow(target);
    message.success(`已加载流程: ${target.name}`);
  };

  const handleDuplicateDraft = () => {
    if (!processId) return;
    duplicatePublishedAsDraft(processId);
    message.success("已基于当前版本创建草稿，可继续编辑");
  };

  return {
    headerProps: {
      publishedFlows,
      editingMode,
      currentVersionLabel,
      onPublish: handlePublish,
      onCreateNew: handleCreateNew,
      onLoadFlow: handleLoadFlow,
      onDuplicateDraft: handleDuplicateDraft,
    },
  };
}