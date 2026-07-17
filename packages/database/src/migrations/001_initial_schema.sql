CREATE TABLE IF NOT EXISTS roles (
  id BINARY(16) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS users (
  id BINARY(16) PRIMARY KEY,
  email VARCHAR(320) NOT NULL UNIQUE,
  display_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_users_disabled (disabled)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BINARY(16) NOT NULL,
  role_id BINARY(16) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitored_servers (
  id BINARY(16) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port SMALLINT UNSIGNED NOT NULL DEFAULT 3306,
  username VARCHAR(128) NOT NULL,
  ssl_mode ENUM('disabled', 'preferred', 'required') NOT NULL DEFAULT 'preferred',
  environment VARCHAR(64) NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status ENUM('enabled', 'disabled', 'unavailable') NOT NULL DEFAULT 'enabled',
  capabilities_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_monitored_servers_name (name),
  INDEX idx_monitored_servers_enabled (enabled, status)
);

CREATE TABLE IF NOT EXISTS server_credentials (
  server_id BINARY(16) PRIMARY KEY,
  encrypted_password VARBINARY(2048) NOT NULL,
  encryption_key_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_server_credentials_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collector_configs (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  metric_group VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  interval_ms INT UNSIGNED NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_collector_configs_server_group (server_id, metric_group),
  CONSTRAINT fk_collector_configs_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collector_runs (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  metric_group VARCHAR(64) NOT NULL,
  started_at TIMESTAMP(3) NOT NULL,
  finished_at TIMESTAMP(3) NULL,
  duration_ms INT UNSIGNED NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  records_collected INT UNSIGNED NOT NULL DEFAULT 0,
  sanitized_error_code VARCHAR(120) NULL,
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_collector_runs_server_group_started (server_id, metric_group, started_at),
  INDEX idx_collector_runs_success_started (success, started_at),
  CONSTRAINT fk_collector_runs_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_status_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  uptime_seconds BIGINT UNSIGNED NULL,
  threads_connected INT UNSIGNED NULL,
  threads_running INT UNSIGNED NULL,
  max_used_connections INT UNSIGNED NULL,
  max_connections INT UNSIGNED NULL,
  questions BIGINT UNSIGNED NULL,
  queries BIGINT UNSIGNED NULL,
  bytes_received BIGINT UNSIGNED NULL,
  bytes_sent BIGINT UNSIGNED NULL,
  questions_per_second DOUBLE NULL,
  queries_per_second DOUBLE NULL,
  bytes_received_per_second DOUBLE NULL,
  bytes_sent_per_second DOUBLE NULL,
  raw_status_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_server_status_server_collected (server_id, collected_at),
  CONSTRAINT fk_server_status_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS innodb_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  buffer_pool_pages_total BIGINT UNSIGNED NULL,
  buffer_pool_pages_dirty BIGINT UNSIGNED NULL,
  buffer_pool_read_requests BIGINT UNSIGNED NULL,
  buffer_pool_reads BIGINT UNSIGNED NULL,
  buffer_pool_hit_ratio DOUBLE NULL,
  raw_status_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_innodb_server_collected (server_id, collected_at),
  CONSTRAINT fk_innodb_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS database_size_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  data_length_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  index_length_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  table_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_database_size_server_collected (server_id, collected_at),
  INDEX idx_database_size_name_collected (database_name, collected_at),
  CONSTRAINT fk_database_size_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS table_size_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  database_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  engine VARCHAR(64) NULL,
  table_rows BIGINT UNSIGNED NULL,
  data_length_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  index_length_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  data_free_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_table_size_server_collected (server_id, collected_at),
  INDEX idx_table_size_table_collected (database_name, table_name, collected_at),
  CONSTRAINT fk_table_size_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS query_digest_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  schema_name VARCHAR(255) NULL,
  digest VARCHAR(128) NOT NULL,
  digest_text TEXT NULL,
  count_star BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sum_timer_wait BIGINT UNSIGNED NULL,
  avg_timer_wait BIGINT UNSIGNED NULL,
  max_timer_wait BIGINT UNSIGNED NULL,
  sum_rows_examined BIGINT UNSIGNED NULL,
  sum_rows_sent BIGINT UNSIGNED NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_query_digest_server_collected (server_id, collected_at),
  INDEX idx_query_digest_digest_collected (digest, collected_at),
  CONSTRAINT fk_query_digest_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS replication_snapshots (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NOT NULL,
  collected_at TIMESTAMP(3) NOT NULL,
  replication_available BOOLEAN NOT NULL DEFAULT FALSE,
  io_thread_running BOOLEAN NULL,
  sql_thread_running BOOLEAN NULL,
  lag_seconds BIGINT NULL,
  raw_status_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_replication_server_collected (server_id, collected_at),
  CONSTRAINT fk_replication_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id BINARY(16) PRIMARY KEY,
  server_id BINARY(16) NULL,
  name VARCHAR(160) NOT NULL,
  metric_key VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  warning_threshold DOUBLE NULL,
  critical_threshold DOUBLE NULL,
  evaluation_window_seconds INT UNSIGNED NOT NULL DEFAULT 300,
  minimum_consecutive_failures INT UNSIGNED NOT NULL DEFAULT 1,
  cooldown_seconds INT UNSIGNED NOT NULL DEFAULT 300,
  auto_resolve BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NULL,
  remediation TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_alert_rules_server_enabled (server_id, enabled),
  CONSTRAINT fk_alert_rules_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_events (
  id BINARY(16) PRIMARY KEY,
  alert_rule_id BINARY(16) NOT NULL,
  server_id BINARY(16) NULL,
  severity ENUM('normal', 'warning', 'critical') NOT NULL,
  status ENUM('open', 'acknowledged', 'resolved') NOT NULL DEFAULT 'open',
  message VARCHAR(500) NOT NULL,
  fingerprint VARCHAR(128) NOT NULL,
  first_seen_at TIMESTAMP(3) NOT NULL,
  last_seen_at TIMESTAMP(3) NOT NULL,
  resolved_at TIMESTAMP(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_alert_events_fingerprint_status (fingerprint, status),
  INDEX idx_alert_events_status_created (status, created_at),
  CONSTRAINT fk_alert_events_rule FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_events_server FOREIGN KEY (server_id) REFERENCES monitored_servers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  id BINARY(16) PRIMARY KEY,
  alert_event_id BINARY(16) NOT NULL,
  acknowledged_by BINARY(16) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_alert_acknowledgements_event (alert_event_id),
  CONSTRAINT fk_alert_ack_event FOREIGN KEY (alert_event_id) REFERENCES alert_events(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_ack_user FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BINARY(16) PRIMARY KEY,
  actor_user_id BINARY(16) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NULL,
  request_id VARCHAR(64) NULL,
  ip_address VARCHAR(64) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_logs_created (created_at),
  INDEX idx_audit_logs_actor_created (actor_user_id, created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);
