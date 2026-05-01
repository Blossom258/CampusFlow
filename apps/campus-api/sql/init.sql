CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  reason TEXT,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at BIGINT NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  current_node VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  assignee_role VARCHAR(64) NOT NULL,
  created_at BIGINT NOT NULL,
  INDEX idx_task_assignee_status (assignee_role, status),
  CONSTRAINT fk_task_app FOREIGN KEY (application_id) REFERENCES applications(id)
);

INSERT INTO users (id, username, password, role, name) VALUES
('u-admin', 'admin', 'fm123321', 'admin', '系统管理员'),
('u-student', 'student', 'fm123321', 'student', '学生'),
('u-tutor', 'tutor', 'fm123321', 'tutor', '导师'),
('u-academic', 'academic', 'fm123321', 'academic_office', '教务办')
ON DUPLICATE KEY UPDATE username = VALUES(username);
