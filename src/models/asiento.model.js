import pool from '../config/db.js';
import { conTransaccion } from '../utils/transaccion.js';

export const MINUTOS_BLOQUEO = 5;

const llaveValida = (llave) => /^[A-Za-z0-9-]{16,64}$/.test(String(llave || ''));

export const liberarBloqueosVencidos = async (ejecutor = pool, vueloId = null) => {
  const db = ejecutor || pool;
  const filtroVuelo = vueloId ? ' AND vuelo_id = ?' : '';
  await db.query(
    `UPDATE asientos
     SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
     WHERE estado = 'reservado_temporal' AND bloqueo_hasta <= NOW()${filtroVuelo}`,
    vueloId ? [vueloId] : []
  );
};

export const reservarTemporal = async ({ asientoId, vueloId, llave }) => {
  if (!llaveValida(llave)) {
    throw new Error('No se pudo reservar el asiento');
  }

  return conTransaccion(async (connection) => {
    const [filas] = await connection.query(
      `SELECT id, estado, bloqueo_llave, bloqueo_hasta > NOW() AS vigente
       FROM asientos
       WHERE id = ? AND vuelo_id = ?
       FOR UPDATE`,
      [asientoId, vueloId]
    );

    if (filas.length === 0) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const asiento = filas[0];
    const vigente = Number(asiento.vigente) === 1;
    const propio = asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === llave && vigente;
    const libre = asiento.estado === 'disponible' || (asiento.estado === 'reservado_temporal' && !vigente);

    if (!propio && !libre) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE bloqueo_llave = ? AND id <> ? AND estado = 'reservado_temporal'`,
      [llave, asientoId]
    );

    await connection.query(
      `UPDATE asientos
       SET estado = 'reservado_temporal', bloqueo_llave = ?, bloqueo_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE id = ?`,
      [llave, MINUTOS_BLOQUEO, asientoId]
    );

    const [tiempo] = await connection.query(
      'SELECT TIMESTAMPDIFF(SECOND, NOW(), bloqueo_hasta) AS segundos FROM asientos WHERE id = ?',
      [asientoId]
    );

    return { segundos: Number(tiempo[0].segundos) || MINUTOS_BLOQUEO * 60 };
  });
};

export const liberarBloqueo = async ({ asientoId, vueloId, llave }) => {
  if (!llaveValida(llave)) {
    throw new Error('No se pudo liberar el asiento');
  }

  return conTransaccion(async (connection) => {
    const [filas] = await connection.query(
      `SELECT id, estado, bloqueo_llave
       FROM asientos
       WHERE id = ? AND vuelo_id = ?
       FOR UPDATE`,
      [asientoId, vueloId]
    );

    if (filas.length === 0) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const asiento = filas[0];
    if (asiento.estado === 'confirmado') {
      throw new Error('El asiento ya fue confirmado');
    }
    if (asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave !== llave) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    if (asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === llave) {
      await connection.query(
        `UPDATE asientos
         SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
         WHERE id = ? AND estado = 'reservado_temporal' AND bloqueo_llave = ?`,
        [asientoId, llave]
      );
    }

    return { liberado: true };
  });
};

export const consultarBloqueo = async ({ asientoId, llave }) => {
  if (!llaveValida(llave)) {
    return null;
  }

  const [filas] = await pool.query(
    `SELECT estado, bloqueo_llave, TIMESTAMPDIFF(SECOND, NOW(), bloqueo_hasta) AS segundos
     FROM asientos
     WHERE id = ?`,
    [asientoId]
  );

  if (filas.length === 0) {
    return null;
  }

  const asiento = filas[0];
  const propio = asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === llave;

  if (propio && Number(asiento.segundos) <= 0) {
    await pool.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE id = ? AND estado = 'reservado_temporal' AND bloqueo_llave = ?`,
      [asientoId, llave]
    );
    return null;
  }

  if (!propio || Number(asiento.segundos) <= 0) {
    return null;
  }

  return { segundos: Number(asiento.segundos) };
};

export const obtenerPorVuelo = async (vuelo_id) => {
  const [rows] = await pool.query(
    'SELECT * FROM asientos WHERE vuelo_id = ? ORDER BY numero_asiento',
    [vuelo_id]
  );
  return rows;
};

export const idsConReserva = async (vuelo_id) => {
  const [rows] = await pool.query(
    'SELECT asiento_id FROM reservas WHERE vuelo_id = ?',
    [vuelo_id]
  );
  return rows.map((fila) => fila.asiento_id);
};

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const CATEGORIAS = ['Premium', 'Estándar', 'Básica'];

const dinero = (monto) => Math.round((Number(monto) || 0) * 100) / 100;

export const repartirFilas = (filas) => {
  const total = Math.max(3, Number(filas) || 3);
  let premium = Math.max(1, Math.round(total * 0.25));
  let basica = Math.max(1, Math.round(total * 0.35));
  let estandar = total - premium - basica;
  while (estandar < 1 && (premium > 1 || basica > 1)) {
    if (premium >= basica && premium > 1) {
      premium -= 1;
    } else if (basica > 1) {
      basica -= 1;
    }
    estandar = total - premium - basica;
  }
  return { premium, estandar, basica };
};

export const categoriaDeFila = (fila, reparto) => {
  if (fila <= reparto.premium) {
    return 'Premium';
  }
  if (fila <= reparto.premium + reparto.estandar) {
    return 'Estándar';
  }
  return 'Básica';
};

export const cargoDeCategoria = (precioBase, categoria) => {
  const base = Number(precioBase) || 0;
  if (categoria === 'Premium') {
    return dinero(base * 0.5);
  }
  if (categoria === 'Estándar') {
    return dinero(base * 0.2);
  }
  return 0;
};

const filaDeAsiento = (numero) => {
  const coincidencia = String(numero ?? '').match(/^(\d+)/);
  return coincidencia ? Number(coincidencia[1]) : 0;
};

export const actualizarCargosDelVuelo = async (vueloId, precioBase) => {
  const [asientos] = await pool.query(
    'SELECT id, numero_asiento, categoria FROM asientos WHERE vuelo_id = ?',
    [vueloId]
  );
  if (asientos.length === 0) {
    return;
  }
  const maxFila = Math.max(...asientos.map((asiento) => filaDeAsiento(asiento.numero_asiento)));
  const reparto = repartirFilas(maxFila);
  await Promise.all(asientos.map((asiento) => {
    const conocida = CATEGORIAS.includes(asiento.categoria);
    const categoria = conocida
      ? asiento.categoria
      : categoriaDeFila(filaDeAsiento(asiento.numero_asiento), reparto);
    return pool.query(
      'UPDATE asientos SET categoria = ?, precio_adicional = ? WHERE id = ?',
      [categoria, cargoDeCategoria(precioBase, categoria), asiento.id]
    );
  }));
};

export const generarAsientosParaVuelo = async (vuelo_id, capacidad = 30, precioBase = 0) => {
  const filasPedidas = Math.floor(Number(capacidad) / LETRAS.length);
  const filas = Math.min(Math.max(filasPedidas, 3), 17);
  const reparto = repartirFilas(filas);

  for (let fila = 1; fila <= filas; fila++) {
    const categoria = categoriaDeFila(fila, reparto);
    const cargo = cargoDeCategoria(precioBase, categoria);
    for (const letra of LETRAS) {
      await pool.query(
        'INSERT INTO asientos (vuelo_id, numero_asiento, estado, categoria, precio_adicional) VALUES (?, ?, ?, ?, ?)',
        [vuelo_id, `${fila}${letra}`, 'disponible', categoria, cargo]
      );
    }
  }
};
