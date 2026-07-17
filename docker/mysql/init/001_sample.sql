CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_email VARCHAR(320) NOT NULL,
  total_cents INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS order_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_events_order_id (order_id),
  CONSTRAINT fk_order_events_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

INSERT INTO orders (customer_email, total_cents)
VALUES ('alice@example.test', 1299), ('bob@example.test', 4599), ('casey@example.test', 999);

INSERT INTO order_events (order_id, event_type)
SELECT id, 'created' FROM orders;
