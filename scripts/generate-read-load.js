import mysql from 'mysql2/promise';

const url =
  process.env.TEST_MYSQL_URL ?? 'mysql://monitor_user:monitor_password@localhost:3307/sample_app';
const connection = await mysql.createConnection(url);

try {
  for (let index = 0; index < 100; index += 1) {
    await connection.query('SELECT COUNT(*) AS order_count FROM orders WHERE created_at <= NOW()');
  }
  console.log('Generated read load');
} finally {
  await connection.end();
}
