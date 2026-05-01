import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const defaultUsers = [
  { id: "u-admin", username: "admin", password: "fm123321", role: "admin", name: "系统管理员" },
  { id: "u-student", username: "student", password: "fm123321", role: "student", name: "学生" },
  { id: "u-tutor", username: "tutor", password: "fm123321", role: "tutor", name: "导师" },
  { id: "u-academic", username: "academic", password: "fm123321", role: "academic_office", name: "教务办" },
];

const memoryDb = {
  users: [...defaultUsers],
  applications: [],
  tasks: [],
};

let poolPromise = null;

function respond(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function parseAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return token.startsWith("campus-token-") ? token.replace("campus-token-", "") : null;
}

function normalizePath(pathname) {
  if (pathname.startsWith("/api/")) return pathname;
  if (pathname === "/api") return "/api";
  if (pathname.startsWith("/.netlify/functions/api/")) {
    return `/api/${pathname.slice("/.netlify/functions/api/".length)}`;
  }
  if (pathname === "/.netlify/functions/api") return "/api";
  return pathname;
}

async function getPool() {
  const host = Netlify.env.get("MYSQL_HOST");
  const user = Netlify.env.get("MYSQL_USER");
  const password = Netlify.env.get("MYSQL_PASSWORD");
  const database = Netlify.env.get("MYSQL_DATABASE");
  const port = Number(Netlify.env.get("MYSQL_PORT") || 3306);
  if (!host || !user || !password || !database) return null;

  if (!poolPromise) {
    poolPromise = (async () => {
      const pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 5,
      });
      await pool.query("SELECT 1");
      return pool;
    })().catch(() => null);
  }
  return poolPromise;
}

const repo = {
  async findUser(username, password) {
    const pool = await getPool();
    if (pool) {
      const [rows] = await pool.query(
        "SELECT id, username, role, name FROM users WHERE username = ? AND password = ? LIMIT 1",
        [username, password]
      );
      return rows[0] || null;
    }
    return memoryDb.users.find((u) => u.username === username && u.password === password) || null;
  },

  async findUserByUsername(username) {
    const pool = await getPool();
    if (pool) {
      const [rows] = await pool.query("SELECT id, username, role, name FROM users WHERE username = ? LIMIT 1", [username]);
      return rows[0] || null;
    }
    return memoryDb.users.find((u) => u.username === username) || null;
  },

  async createApplication({ title, reason, type, createdBy }) {
    const now = Date.now();
    const id = randomUUID();
    const app = {
      id,
      title: title || "学院事务申请",
      reason: reason || "",
      type: type || "行政审批",
      status: "running",
      createdAt: now,
      createdBy,
      currentNode: "导师审批",
    };

    const pool = await getPool();
    if (pool) {
      await pool.query(
        "INSERT INTO applications (id, title, reason, type, status, created_at, created_by, current_node) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [app.id, app.title, app.reason, app.type, app.status, app.createdAt, app.createdBy, app.currentNode]
      );
      await pool.query("INSERT INTO tasks (id, application_id, status, assignee_role, created_at) VALUES (?, ?, ?, ?, ?)", [
        randomUUID(),
        app.id,
        "pending",
        "tutor",
        now,
      ]);
      return app;
    }

    memoryDb.applications.unshift(app);
    memoryDb.tasks.unshift({
      id: randomUUID(),
      applicationId: app.id,
      status: "pending",
      assigneeRole: "tutor",
      createdAt: now,
    });
    return app;
  },

  async getMyApplications(username) {
    const pool = await getPool();
    if (pool) {
      const [rows] = await pool.query(
        "SELECT id, title, reason, type, status, created_at AS createdAt, created_by AS createdBy, current_node AS currentNode FROM applications WHERE created_by = ? ORDER BY created_at DESC",
        [username]
      );
      return rows;
    }
    return memoryDb.applications.filter((a) => a.createdBy === username);
  },

  async getPendingTasksByRole(role) {
    const pool = await getPool();
    if (pool) {
      const [rows] = await pool.query(
        `SELECT t.id, t.application_id AS applicationId, t.status, t.assignee_role AS assigneeRole, t.created_at AS createdAt,
                a.id AS app_id, a.title, a.type, a.created_by AS createdBy, a.current_node AS currentNode
         FROM tasks t
         LEFT JOIN applications a ON a.id = t.application_id
         WHERE t.status = 'pending' AND t.assignee_role = ?
         ORDER BY t.created_at DESC`,
        [role]
      );
      return rows.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        status: r.status,
        assigneeRole: r.assigneeRole,
        createdAt: r.createdAt,
        application: r.app_id
          ? { id: r.app_id, title: r.title, type: r.type, createdBy: r.createdBy, currentNode: r.currentNode }
          : null,
      }));
    }

    return memoryDb.tasks
      .filter((t) => t.status === "pending" && t.assigneeRole === role)
      .map((t) => {
        const app = memoryDb.applications.find((a) => a.id === t.applicationId);
        return { ...t, application: app || null };
      });
  },

  async getAdminOverview() {
    const pool = await getPool();
    if (pool) {
      const [userRows] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users");
      const [appRows] = await pool.query(
        `SELECT
          COUNT(*) AS totalApplications,
          SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS runningApplications,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedApplications
         FROM applications`
      );
      const [taskRows] = await pool.query("SELECT COUNT(*) AS pendingTasks FROM tasks WHERE status = 'pending'");
      const userStat = Array.isArray(userRows) ? userRows[0] : {};
      const appStat = Array.isArray(appRows) ? appRows[0] : {};
      const taskStat = Array.isArray(taskRows) ? taskRows[0] : {};
      return {
        totalUsers: Number(userStat?.totalUsers || 0),
        totalApplications: Number(appStat?.totalApplications || 0),
        runningApplications: Number(appStat?.runningApplications || 0),
        approvedApplications: Number(appStat?.approvedApplications || 0),
        pendingTasks: Number(taskStat?.pendingTasks || 0),
      };
    }

    return {
      totalUsers: memoryDb.users.length,
      totalApplications: memoryDb.applications.length,
      runningApplications: memoryDb.applications.filter((a) => a.status === "running").length,
      approvedApplications: memoryDb.applications.filter((a) => a.status === "approved").length,
      pendingTasks: memoryDb.tasks.filter((t) => t.status === "pending").length,
    };
  },

  async listUsers() {
    const pool = await getPool();
    if (pool) {
      const [rows] = await pool.query("SELECT id, username, role, name FROM users ORDER BY username ASC");
      return Array.isArray(rows) ? rows : [];
    }
    return memoryDb.users.map(({ id, username, role, name }) => ({ id, username, role, name }));
  },

  async approveTask(taskId, approverRole) {
    const pool = await getPool();
    if (pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [taskRows] = await conn.query(
          "SELECT id, application_id AS applicationId, assignee_role AS assigneeRole, status FROM tasks WHERE id = ? LIMIT 1",
          [taskId]
        );
        const task = taskRows[0];
        if (!task || task.status !== "pending") {
          await conn.rollback();
          return { ok: false, code: 404, message: "任务不存在" };
        }
        if (task.assigneeRole !== approverRole) {
          await conn.rollback();
          return { ok: false, code: 403, message: "无权限审批" };
        }

        await conn.query("UPDATE tasks SET status = ? WHERE id = ?", ["approved", taskId]);
        if (task.assigneeRole === "tutor") {
          await conn.query("UPDATE applications SET current_node = ? WHERE id = ?", ["教务办审批", task.applicationId]);
          await conn.query("INSERT INTO tasks (id, application_id, status, assignee_role, created_at) VALUES (?, ?, ?, ?, ?)", [
            randomUUID(),
            task.applicationId,
            "pending",
            "academic_office",
            Date.now(),
          ]);
        } else {
          await conn.query("UPDATE applications SET current_node = ?, status = ? WHERE id = ?", [
            "审批完成",
            "approved",
            task.applicationId,
          ]);
        }

        await conn.commit();
        return { ok: true };
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    }

    const task = memoryDb.tasks.find((t) => t.id === taskId && t.status === "pending");
    if (!task) return { ok: false, code: 404, message: "任务不存在" };
    if (task.assigneeRole !== approverRole) return { ok: false, code: 403, message: "无权限审批" };

    task.status = "approved";
    const app = memoryDb.applications.find((a) => a.id === task.applicationId);
    if (app) {
      if (task.assigneeRole === "tutor") {
        app.currentNode = "教务办审批";
        memoryDb.tasks.unshift({
          id: randomUUID(),
          applicationId: app.id,
          status: "pending",
          assigneeRole: "academic_office",
          createdAt: Date.now(),
        });
      } else {
        app.currentNode = "审批完成";
        app.status = "approved";
      }
    }
    return { ok: true };
  },
};

export default async (req) => {
  try {
    const url = new URL(req.url);
    const path = normalizePath(url.pathname);

    if (req.method === "POST" && path === "/api/auth/login") {
      const body = await req.json();
      const username = String(body.username || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = await repo.findUser(username, password);
      if (!user) return respond({ code: 401, message: "用户名或密码错误", data: null }, 401);
      return respond({
        code: 200,
        message: "登录成功",
        data: { token: `campus-token-${user.username}`, role: user.role, name: user.name, username: user.username },
      });
    }

    if (req.method === "GET" && path === "/api/applications/my") {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const data = await repo.getMyApplications(username);
      return respond({ code: 200, message: "ok", data });
    }

    if (req.method === "POST" && path === "/api/applications") {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const user = await repo.findUserByUsername(username);
      if (!user) return respond({ code: 401, message: "用户不存在", data: null }, 401);
      if (!["student", "admin"].includes(user.role)) {
        return respond({ code: 403, message: "当前角色不能发起申请", data: null }, 403);
      }
      const body = await req.json();
      const app = await repo.createApplication({ ...body, createdBy: username });
      return respond({ code: 200, message: "提交成功", data: app });
    }

    if (req.method === "GET" && path === "/api/tasks/pending") {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const user = await repo.findUserByUsername(username);
      if (!user) return respond({ code: 401, message: "用户不存在", data: null }, 401);
      const tasks = await repo.getPendingTasksByRole(user.role);
      return respond({ code: 200, message: "ok", data: tasks });
    }

    if (req.method === "POST" && /^\/api\/tasks\/[^/]+\/approve$/.test(path)) {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const taskId = path.split("/")[3];
      const user = await repo.findUserByUsername(username);
      if (!user) return respond({ code: 401, message: "用户不存在", data: null }, 401);
      const result = await repo.approveTask(taskId, user.role);
      if (!result.ok) return respond({ code: result.code, message: result.message, data: null }, result.code);
      return respond({ code: 200, message: "审批通过", data: null });
    }

    if (req.method === "GET" && path === "/api/admin/overview") {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const user = await repo.findUserByUsername(username);
      if (!user || user.role !== "admin") return respond({ code: 403, message: "无权限访问", data: null }, 403);
      const data = await repo.getAdminOverview();
      return respond({ code: 200, message: "ok", data });
    }

    if (req.method === "GET" && path === "/api/admin/users") {
      const username = parseAuth(req);
      if (!username) return respond({ code: 401, message: "未登录", data: null }, 401);
      const user = await repo.findUserByUsername(username);
      if (!user || user.role !== "admin") return respond({ code: 403, message: "无权限访问", data: null }, 403);
      const data = await repo.listUsers();
      return respond({ code: 200, message: "ok", data });
    }

    return respond({ code: 404, message: "接口不存在", data: null }, 404);
  } catch (error) {
    return respond({ code: 500, message: "服务器内部错误", data: null, detail: String(error?.message || error) }, 500);
  }
};

export const config = {
  path: "/api/*",
};
