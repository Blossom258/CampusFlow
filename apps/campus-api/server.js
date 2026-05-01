import http from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'data', 'db.json');

if (!existsSync(dbPath)) {
  writeFileSync(dbPath, JSON.stringify({ users: [], applications: [], tasks: [] }, null, 2));
}

const mysqlEnabled = process.env.USE_MYSQL === 'true';
let pool = null;

async function initMySQL() {
  if (!mysqlEnabled) return;
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'campus_user',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'campusflow',
    waitForConnections: true,
    connectionLimit: 10,
  });
  await pool.query('SELECT 1');
  console.log('[Campus API] MySQL connected');
}

function readDb() {
  return JSON.parse(readFileSync(dbPath, 'utf-8'));
}

function writeDb(db) {
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function send(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function parseAuth(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return token.startsWith('campus-token-') ? token.replace('campus-token-', '') : null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const repo = {
  async findUser(username, password) {
    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, username, role, name FROM users WHERE username = ? AND password = ? LIMIT 1',
        [username, password]
      );
      return rows[0] || null;
    }
    const db = readDb();
    return db.users.find((u) => u.username === username && u.password === password) || null;
  },

  async findUserByUsername(username) {
    if (pool) {
      const [rows] = await pool.query('SELECT id, username, role, name FROM users WHERE username = ? LIMIT 1', [username]);
      return rows[0] || null;
    }
    const db = readDb();
    return db.users.find((u) => u.username === username) || null;
  },

  async createApplication({ title, reason, type, createdBy }) {
    const now = Date.now();
    const id = randomUUID();
    const app = {
      id,
      title: title || '学院事务申请',
      reason: reason || '',
      type: type || '行政审批',
      status: 'running',
      createdAt: now,
      createdBy,
      currentNode: '导师审批',
    };

    if (pool) {
      await pool.query(
        'INSERT INTO applications (id, title, reason, type, status, created_at, created_by, current_node) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [app.id, app.title, app.reason, app.type, app.status, app.createdAt, app.createdBy, app.currentNode]
      );
      await pool.query(
        'INSERT INTO tasks (id, application_id, status, assignee_role, created_at) VALUES (?, ?, ?, ?, ?)',
        [randomUUID(), app.id, 'pending', 'tutor', now]
      );
      return app;
    }

    const db = readDb();
    db.applications.unshift(app);
    db.tasks.unshift({
      id: randomUUID(),
      applicationId: app.id,
      status: 'pending',
      assigneeRole: 'tutor',
      createdAt: now,
    });
    writeDb(db);
    return app;
  },

  async getMyApplications(username) {
    if (pool) {
      const [rows] = await pool.query(
        'SELECT id, title, reason, type, status, created_at AS createdAt, created_by AS createdBy, current_node AS currentNode FROM applications WHERE created_by = ? ORDER BY created_at DESC',
        [username]
      );
      return rows;
    }
    const db = readDb();
    return db.applications.filter((a) => a.createdBy === username);
  },

  async getPendingTasksByRole(role) {
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

    const db = readDb();
    return db.tasks
      .filter((t) => t.status === 'pending' && t.assigneeRole === role)
      .map((t) => {
        const app = db.applications.find((a) => a.id === t.applicationId);
        return { ...t, application: app || null };
      });
  },

  async getAdminOverview() {
    if (pool) {
      const [userRows] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
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

    const db = readDb();
    return {
      totalUsers: db.users.length,
      totalApplications: db.applications.length,
      runningApplications: db.applications.filter((a) => a.status === 'running').length,
      approvedApplications: db.applications.filter((a) => a.status === 'approved').length,
      pendingTasks: db.tasks.filter((t) => t.status === 'pending').length,
    };
  },

  async listUsers() {
    if (pool) {
      const [rows] = await pool.query('SELECT id, username, role, name FROM users ORDER BY username ASC');
      return Array.isArray(rows) ? rows : [];
    }
    const db = readDb();
    return db.users.map(({ id, username, role, name }) => ({ id, username, role, name }));
  },

  async approveTask(taskId, approverRole) {
    if (pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [taskRows] = await conn.query(
          'SELECT id, application_id AS applicationId, assignee_role AS assigneeRole, status FROM tasks WHERE id = ? LIMIT 1',
          [taskId]
        );
        const task = taskRows[0];
        if (!task || task.status !== 'pending') {
          await conn.rollback();
          return { ok: false, code: 404, message: '任务不存在' };
        }
        if (task.assigneeRole !== approverRole) {
          await conn.rollback();
          return { ok: false, code: 403, message: '无权限审批' };
        }

        await conn.query('UPDATE tasks SET status = ? WHERE id = ?', ['approved', taskId]);

        if (task.assigneeRole === 'tutor') {
          await conn.query('UPDATE applications SET current_node = ? WHERE id = ?', ['教务办审批', task.applicationId]);
          await conn.query(
            'INSERT INTO tasks (id, application_id, status, assignee_role, created_at) VALUES (?, ?, ?, ?, ?)',
            [randomUUID(), task.applicationId, 'pending', 'academic_office', Date.now()]
          );
        } else {
          await conn.query('UPDATE applications SET current_node = ?, status = ? WHERE id = ?', ['审批完成', 'approved', task.applicationId]);
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

    const db = readDb();
    const task = db.tasks.find((t) => t.id === taskId && t.status === 'pending');
    if (!task) return { ok: false, code: 404, message: '任务不存在' };
    if (task.assigneeRole !== approverRole) return { ok: false, code: 403, message: '无权限审批' };

    task.status = 'approved';
    const app = db.applications.find((a) => a.id === task.applicationId);
    if (app) {
      if (task.assigneeRole === 'tutor') {
        app.currentNode = '教务办审批';
        db.tasks.unshift({ id: randomUUID(), applicationId: app.id, status: 'pending', assigneeRole: 'academic_office', createdAt: Date.now() });
      } else {
        app.currentNode = '审批完成';
        app.status = 'approved';
      }
    }
    writeDb(db);
    return { ok: true };
  },
};

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url || '/', 'http://localhost');

  try {
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await parseBody(req);
      const user = await repo.findUser(body.username, body.password);
      if (!user) return send(res, 401, { code: 401, message: '用户名或密码错误', data: null });
      return send(res, 200, {
        code: 200,
        message: '登录成功',
        data: { token: `campus-token-${user.username}`, role: user.role, name: user.name, username: user.username },
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/applications/my') {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const data = await repo.getMyApplications(username);
      return send(res, 200, { code: 200, message: 'ok', data });
    }

    if (req.method === 'POST' && url.pathname === '/api/applications') {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const user = await repo.findUserByUsername(username);
      if (!user) return send(res, 401, { code: 401, message: '用户不存在', data: null });
      if (!['student', 'admin'].includes(user.role)) {
        return send(res, 403, { code: 403, message: '当前角色不能发起申请', data: null });
      }
      const body = await parseBody(req);
      const app = await repo.createApplication({ ...body, createdBy: username });
      return send(res, 200, { code: 200, message: '提交成功', data: app });
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks/pending') {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const user = await repo.findUserByUsername(username);
      if (!user) return send(res, 401, { code: 401, message: '用户不存在', data: null });
      const tasks = await repo.getPendingTasksByRole(user.role);
      return send(res, 200, { code: 200, message: 'ok', data: tasks });
    }

    if (req.method === 'POST' && url.pathname.match(/^\/api\/tasks\/[^/]+\/approve$/)) {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const taskId = url.pathname.split('/')[3];
      const user = await repo.findUserByUsername(username);
      if (!user) return send(res, 401, { code: 401, message: '用户不存在', data: null });
      const result = await repo.approveTask(taskId, user.role);
      if (!result.ok) return send(res, result.code, { code: result.code, message: result.message, data: null });
      return send(res, 200, { code: 200, message: '审批通过', data: null });
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/overview') {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const user = await repo.findUserByUsername(username);
      if (!user || user.role !== 'admin') return send(res, 403, { code: 403, message: '无权限访问', data: null });
      const data = await repo.getAdminOverview();
      return send(res, 200, { code: 200, message: 'ok', data });
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/users') {
      const username = parseAuth(req);
      if (!username) return send(res, 401, { code: 401, message: '未登录', data: null });
      const user = await repo.findUserByUsername(username);
      if (!user || user.role !== 'admin') return send(res, 403, { code: 403, message: '无权限访问', data: null });
      const data = await repo.listUsers();
      return send(res, 200, { code: 200, message: 'ok', data });
    }

    return send(res, 404, { code: 404, message: '接口不存在', data: null });
  } catch (error) {
    console.error(error);
    return send(res, 500, { code: 500, message: '服务器内部错误', data: null });
  }
});

const port = Number(process.env.PORT || 3001);
initMySQL()
  .catch((err) => {
    // Ensure repository methods fall back to JSON mode after MySQL init failure.
    pool = null;
    console.warn('[Campus API] MySQL unavailable, fallback to JSON file mode:', err.message);
  })
  .finally(() => {
    server.listen(port, () => {
      console.log(`Campus API running at http://localhost:${port}`);
    });
  });
