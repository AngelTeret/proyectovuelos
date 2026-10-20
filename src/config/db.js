import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const ZONA_HORARIA = '-06:00';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: ZONA_HORARIA,
});

const zonasAplicadas = new WeakSet();
const obtenerConexion = pool.getConnection.bind(pool);

const aplicarZona = async (connection) => {
  const nucleo = connection.connection || connection;
  if (zonasAplicadas.has(nucleo)) {
    return connection;
  }
  await connection.query(`SET time_zone = '${ZONA_HORARIA}'`);
  zonasAplicadas.add(nucleo);
  return connection;
};

pool.getConnection = async () => {
  const connection = await obtenerConexion();
  try {
    return await aplicarZona(connection);
  } catch (error) {
    connection.release();
    throw error;
  }
};

pool.query = async (sql, valores) => {
  const connection = await pool.getConnection();
  try {
    return valores === undefined
      ? await connection.query(sql)
      : await connection.query(sql, valores);
  } finally {
    connection.release();
  }
};

try {
  const connection = await pool.getConnection();
  console.log('Conexión a MySQL exitosa');
  connection.release();
} catch (error) {
  console.error(`No se pudo conectar a MySQL: ${error.message}`);
}

export default pool;
