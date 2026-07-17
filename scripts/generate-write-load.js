import mysql from 'mysql2/promise';

const url =
  process.env.TEST_MYSQL_URL ?? 'mysql://monitor_user:monitor_password@localhost:3307/sample_app';
const connection = await mysql.createConnection(url);

try {
  await connection.execute('INSERT INTO orders (customer_email, total_cents) VALUES (?, ?)', [
    `load-${Date.now()}@example.test`,
    1999
  ]);
  console.log('Generated write load');
} finally {
  await connection.end();
}
