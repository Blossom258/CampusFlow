import { useMemo } from "react";
import { useProcessInstanceStore } from "../../store/processInstanceStore";
import type { ProcessInstance } from "../../types/process";

/* =========================
   工具函数（纯计算）
========================= */

// 单条流程耗时（分钟）
const calculateDuration = (instance: ProcessInstance) => {
  if (!instance.logs || instance.logs.length === 0) return 0;
  const start = instance.createdAt;
  const end = instance.logs[instance.logs.length - 1].date;
  return Number(((end - start) / 1000 / 60).toFixed(1));
};

// 热力图数据聚合
const aggregateHeatmapData = (instances: ProcessInstance[]) => {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));

  instances.forEach((ins) => {
    const d = new Date(ins.createdAt);
    grid[d.getDay()][d.getHours()] += 1;
  });

  const result: [number, number, number][] = [];
  grid.forEach((hours, day) => {
    hours.forEach((count, hour) => {
      if (count > 0) result.push([hour, day, count]);
    });
  });

  return result;
};

/* =========================
   useDashboard（页面级 Hook）
========================= */

export const useDashboard = () => {
  const instancesMap = useProcessInstanceStore((s) => s.instances);

  return useMemo(() => {
    const all = Object.values(instancesMap);
    const total = all.length;

    const approved = all.filter((i) => i.status === "approved").length;
    const rejected = all.filter((i) => i.status === "rejected").length;
    const running = all.filter((i) => i.status === "running").length;

    const finished = all.filter((i) => i.status !== "running");
    const avgDuration = finished.length
      ? (
          finished.reduce((s, i) => s + calculateDuration(i), 0) /
          finished.length
        ).toFixed(1)
      : "0";

    return {
      kpi: {
        total,
        approved,
        rejected,
        running,
        avgDuration,
      },

      funnelData: [
        { value: total, name: "发起申请" },
        { value: total - rejected, name: "进入审批" },
        { value: approved, name: "审批通过" },
      ],

      heatmapData: aggregateHeatmapData(all),
    };
  }, [instancesMap]);
};