# CampusFlow 学院流程审批平台（精简版）

CampusFlow 是一个面向学院行政办公场景的流程审批系统，覆盖“学生发起申请 -> 导师审批 -> 教务办审批 -> 归档”的核心闭环。

本版本已补充后端服务与数据持久化，避免“纯前端 Demo 无真实数据来源”的问题。

## 项目定位

- 场景：学院内部事务流转与多角色审批协作
- 目标：流程线上化、审批规范化、状态可追踪
- 角色：学生、导师、教务办、管理员

## 核心能力（精简保留）

- 登录认证（后端校验账号密码）
- 发起申请（学院事务）
- 审批中心（待办任务审批）
- 我的申请（查看本人提交记录）

已去除与当前目标无关模块（如数据看板等）。

## 技术架构

### 前端

- React 18 + TypeScript + Vite
- Ant Design + Zustand
- Axios（统一请求封装）

### 后端

- Node.js 原生 HTTP 服务（`apps/campus-api`）
- RESTful API（登录/申请/待办/审批）
- MySQL 8（默认推荐，Docker 启动）
- JSON 文件数据库（开发兜底模式，`apps/campus-api/data/db.json`）

## 登录与数据来源说明（面试可直接说明）

1. 登录不是前端硬编码校验，而是调用 `POST /api/auth/login`。
2. 后端校验账号密码后返回 token 与角色信息。
3. 前端后续请求通过 `Authorization: Bearer <token>` 访问 API。
4. 业务数据优先落在 MySQL（users/applications/tasks 表）；MySQL 不可用时可回退到 `db.json`。

## 主要接口

- `POST /api/auth/login`：用户登录
- `POST /api/applications`：发起申请
- `GET /api/applications/my`：查询我的申请
- `GET /api/tasks/pending`：查询当前角色待办
- `POST /api/tasks/:id/approve`：审批通过

## 本地运行（MySQL）

```bash
pnpm install
docker compose up -d
pnpm dev:web
pnpm dev:api:mysql
```

启动后：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`
- MySQL：`127.0.0.1:3306`（数据库 `campusflow`）

## 本地运行（JSON 兜底模式）

```bash
pnpm install
pnpm dev
```

该模式不依赖 MySQL，可用于本地快速调试。

## Netlify 线上部署（前后端一体）

本项目已支持通过 Netlify Functions 提供 `/api/*` 接口，不依赖本地 `localhost:3001`。

关键文件：
- `netlify/functions/api.mjs`
- `netlify.toml`（已把 `/api/*` 重写到函数）

建议在 Netlify 里配置以下环境变量，让线上函数直连 MySQL（推荐）：
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

如果不配置上述环境变量，函数会回退到内存数据模式（仅用于演示，不适合生产持久化数据）。

## 账号说明

- 开发与测试账号由系统管理员统一分配
- 请勿在前端页面与公开文档中暴露账号口令信息
