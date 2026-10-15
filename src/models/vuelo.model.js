import pool from '../config/db.js';

const obtenerTodos = async () => {
  const [rows] = await pool.query('SELECT * FROM vuelos');
  return rows;
};

const crear = async (datos) => {
  const { origen, destino, fecha_salida, estado } = datos;
  const [result] = await pool.query(
    'INSERT INTO vuelos (origen, destino, fecha_salida, estado) VALUES (?, ?, ?, ?)',
    [origen, destino, fecha_salida, estado]
  );
  return result;
};

export default { obtenerTodos, crear };
