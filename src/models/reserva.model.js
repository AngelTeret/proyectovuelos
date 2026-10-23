import { readFileSync } from 'node:fs';
import pool from '../config/db.js';
import { fechaCalendario } from '../utils/fecha.js';
import { evaluarCheckin, motivoVentaCerrada } from '../utils/checkinVentana.js';
import { anularCheckinsDeReserva } from './checkin.model.js';
import { marcarSalidas } from './abordaje.model.js';
import { salidaReal, sumarRetraso } from '../utils/horarioVuelo.js';
import { conTransaccion } from '../utils/transaccion.js';

const paises = new Set(JSON.parse(readFileSync(new URL('../../public/js/codigosTelefono.json', import.meta.url), 'utf8')).map((item) => item.pais));
const letrasNombre = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

const errorCliente = (mensaje) => {
  const error = new Error(mensaje);
  error.codigo = 400;
  return error;
};

const edadAlVuelo = (nacimiento, salida) => {
  const nace = new Date(`${nacimiento}T00:00:00Z`);
  const vuelo = new Date(`${fechaCalendario(salida)}T00:00:00Z`);
  if (Number.isNaN(nace.getTime()) || Number.isNaN(vuelo.getTime())) {
    return -1;
  }
  let edad = vuelo.getUTCFullYear() - nace.getUTCFullYear();
  const mes = vuelo.getUTCMonth() - nace.getUTCMonth();
  if (mes < 0 || (mes === 0 && vuelo.getUTCDate() < nace.getUTCDate())) {
    edad -= 1;
  }
  return edad;
};

const mensajeEdad = (tipo) => {
  if (tipo === 'adulto') {
    return 'Un adulto debe tener 12 años o más en la fecha de salida.';
  }
  if (tipo === 'nino') {
    return 'Un niño debe tener entre 2 y 11 años en la fecha de salida.';
  }
  return 'Un infante debe tener menos de 2 años en la fecha de salida.';
};

const edadValida = (tipo, edad) => {
  if (tipo === 'adulto') {
    return edad >= 12;
  }
  if (tipo === 'nino') {
    return edad >= 2 && edad < 12;
  }
  return edad >= 0 && edad < 2;
};

const documentoRepetidoEnVuelo = async (connection, vueloId, documentos) => {
  const lista = [...new Set(documentos.map((documento) => String(documento || '').trim().toUpperCase()).filter(Boolean))];
  if (!lista.length) {
    return false;
  }
  const marcas = lista.map(() => '?').join(', ');
  const [filas] = await connection.query(
    `SELECT p.documento_identidad
     FROM reservas r
     INNER JOIN pasajeros p ON p.id = r.pasajero_id
     WHERE r.vuelo_id = ? AND r.estado_pago <> 'reembolsado' AND UPPER(p.documento_identidad) IN (${marcas})
     UNION
     SELECT p.documento_identidad
     FROM reserva_pasajeros rp
     INNER JOIN reservas r ON r.id = rp.reserva_id
     INNER JOIN pasajeros p ON p.id = rp.pasajero_id
     WHERE r.vuelo_id = ? AND r.estado_pago <> 'reembolsado' AND UPPER(p.documento_identidad) IN (${marcas})
     LIMIT 1`,
    [vueloId, ...lista, vueloId, ...lista]
  );
  return filas.length > 0;
};

const numeroFactura = (reservaId) => `FAC-${String(reservaId).padStart(6, '0')}`;

const emitirFactura = async (connection, reservaId, monto, estado = 'emitida') => {
  await connection.query(
    `INSERT INTO facturas (reserva_id, numero, monto_total, estado, fecha_anulacion)
     VALUES (?, ?, ?, ?, IF(? = 'anulada', NOW(), NULL))`,
    [reservaId, numeroFactura(reservaId), monto, estado, estado]
  );
};

const anularFactura = async (connection, reservaId, monto) => {
  const [filas] = await connection.query(
    'SELECT id FROM facturas WHERE reserva_id = ? FOR UPDATE',
    [reservaId]
  );
  if (!filas.length) {
    await emitirFactura(connection, reservaId, monto, 'anulada');
    return;
  }
  await connection.query(
    `UPDATE facturas
     SET estado = 'anulada', fecha_anulacion = IFNULL(fecha_anulacion, NOW())
     WHERE reserva_id = ?`,
    [reservaId]
  );
};

const completarFacturas = async (whereSql, params) => {
  await pool.query(
    `INSERT IGNORE INTO facturas (reserva_id, numero, monto_total, estado, fecha_anulacion)
     SELECT r.id,
            CONCAT('FAC-', LPAD(r.id, GREATEST(6, CHAR_LENGTH(r.id)), '0')),
            r.monto_total,
            IF(r.estado_pago = 'reembolsado', 'anulada', 'emitida'),
            IF(r.estado_pago = 'reembolsado', NOW(), NULL)
     FROM reservas r
     LEFT JOIN facturas f ON f.reserva_id = r.id
     WHERE f.id IS NULL
       AND r.estado_pago IN ('aprobado', 'reembolsado')
       AND ${whereSql}`,
    params
  );
};

const generarCodigoPnr = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';

  for (let i = 0; i < 6; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres[indice];
  }

  return codigo;
};

const crearReservaGrupo = async (datos) => {
  const {
    viajeros,
    asientos,
    email,
    telefono,
    vuelo_id,
    usuario_id,
    equipaje_extra_kg = 0,
    costo_servicios_extra = 0.00,
    metodo_pago = 'tarjeta',
    llave_idempotencia,
    bloqueo_llave,
  } = datos;

  return conTransaccion(async (connection) => {
    if (!Array.isArray(viajeros) || viajeros.length < 1 || viajeros.length > 4) {
      throw errorCliente('Puedes agregar de 1 a 4 viajeros');
    }
    if (!Array.isArray(asientos)) {
      throw errorCliente('Elige el asiento de cada pasajero');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim()) || String(email).length > 255) {
      throw errorCliente('Ingresa un correo electrónico válido');
    }
    if (!/^\+\d{9,18}$/.test(String(telefono || '').replace(/[\s()-]/g, ''))) {
      throw errorCliente('Ingresa un teléfono de 8 a 15 dígitos con un código de país válido');
    }

    const limpios = viajeros.map((viajero) => ({
      tipo: viajero.tipo,
      nombre: String(viajero.nombre ?? '').trim(),
      apellido: String(viajero.apellido ?? '').trim(),
      documento_identidad: String(viajero.documento_identidad ?? '').trim(),
      fecha_nacimiento: String(viajero.fecha_nacimiento ?? '').trim(),
      nacionalidad: String(viajero.nacionalidad ?? '').trim(),
    }));

    const adultos = limpios.filter((viajero) => viajero.tipo === 'adulto').length;
    const infantes = limpios.filter((viajero) => viajero.tipo === 'infante').length;
    if (adultos < 1) {
      throw errorCliente('Agrega al menos un adulto');
    }
    if (infantes > adultos) {
      throw errorCliente('Cada adulto puede viajar con un solo infante');
    }

    const documentos = new Set();
    limpios.forEach((viajero) => {
      if (!['adulto', 'nino', 'infante'].includes(viajero.tipo)) {
        throw errorCliente('El tipo de viajero no es válido');
      }
      if (!letrasNombre.test(viajero.nombre) || viajero.nombre.length > 100) {
        throw errorCliente('El nombre solo puede contener letras');
      }
      if (!letrasNombre.test(viajero.apellido) || viajero.apellido.length > 100) {
        throw errorCliente('El apellido solo puede contener letras');
      }
      if (!/^[A-Za-z0-9]{6,15}$/.test(viajero.documento_identidad)) {
        throw errorCliente('El documento debe tener entre 6 y 15 letras o números');
      }
      if (documentos.has(viajero.documento_identidad.toUpperCase())) {
        throw errorCliente('Ese documento ya está en la reserva');
      }
      documentos.add(viajero.documento_identidad.toUpperCase());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(viajero.fecha_nacimiento)) {
        throw errorCliente('Ingresa la fecha de nacimiento');
      }
      if (!paises.has(viajero.nacionalidad)) {
        throw errorCliente('Elige una nacionalidad válida');
      }
    });

    const [filasVuelo] = await connection.query(
      `SELECT precio_base, fecha_salida, retraso_minutos, estado,
              TIMESTAMPDIFF(SECOND, NOW(), ${salidaReal()}) AS segundos
       FROM vuelos WHERE id = ? FOR UPDATE`,
      [vuelo_id]
    );
    if (filasVuelo.length === 0) {
      throw new Error('El vuelo no existe');
    }
    const ventaCerrada = motivoVentaCerrada({
      estado: filasVuelo[0].estado,
      segundosParaSalida: filasVuelo[0].segundos,
    });
    if (ventaCerrada) {
      throw errorCliente(ventaCerrada);
    }
    const precioBase = parseFloat(filasVuelo[0].precio_base ?? 0);
    const diaDelVuelo = sumarRetraso(filasVuelo[0].fecha_salida, filasVuelo[0].retraso_minutos) || filasVuelo[0].fecha_salida;
    const edades = limpios.map((viajero) => edadAlVuelo(viajero.fecha_nacimiento, diaDelVuelo));
    edades.forEach((edad, indice) => {
      if (edad < 0) {
        throw errorCliente('La fecha de nacimiento no puede ser posterior al día del vuelo');
      }
      if (edad > 120) {
        throw errorCliente('Ingresa una fecha de nacimiento válida');
      }
      if (!edadValida(limpios[indice].tipo, edad)) {
        throw errorCliente(mensajeEdad(limpios[indice].tipo));
      }
    });
    const responsables = limpios.filter((viajero, indice) => viajero.tipo === 'adulto' && edades[indice] >= 18).length;
    if (infantes > responsables) {
      throw errorCliente('Un infante solo puede ir con una persona que tenga 18 años o más en la fecha de salida');
    }
    if (await documentoRepetidoEnVuelo(connection, vuelo_id, limpios.map((viajero) => viajero.documento_identidad))) {
      throw errorCliente('Ese documento ya tiene una reserva en este vuelo');
    }

    const sentados = [];
    let cursor = 0;
    limpios.forEach((viajero) => {
      if (viajero.tipo === 'infante') {
        sentados.push({ viajero, asientoId: null, asiento: null });
        return;
      }
      const asientoId = Number(asientos[cursor]);
      cursor += 1;
      sentados.push({ viajero, asientoId, asiento: null });
    });
    if (cursor !== asientos.length || sentados.some((item) => item.viajero.tipo !== 'infante' && !item.asientoId)) {
      throw errorCliente('Elige el asiento de cada pasajero');
    }
    if (new Set(sentados.filter((item) => item.asientoId).map((item) => item.asientoId)).size !== cursor) {
      throw errorCliente('Elige un asiento distinto para cada pasajero');
    }

    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE estado = 'reservado_temporal' AND bloqueo_hasta <= NOW()`
    );

    for (const item of sentados) {
      if (!item.asientoId) {
        continue;
      }
      const [filasAsiento] = await connection.query(
        `SELECT *, bloqueo_hasta > NOW() AS vigente
         FROM asientos
         WHERE id = ? AND vuelo_id = ?
         FOR UPDATE`,
        [item.asientoId, vuelo_id]
      );
      const asiento = filasAsiento[0];
      const propio = asiento && asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === String(bloqueo_llave || '');
      if (!asiento || !propio || Number(asiento.vigente) !== 1) {
        throw new Error('El asiento ya no está disponible o no existe');
      }
      item.asiento = asiento;
    }

    let montoTotal = 0;
    sentados.forEach((item) => {
      if (!item.asiento) {
        return;
      }
      montoTotal += precioBase + parseFloat(item.asiento.precio_adicional ?? 0);
    });
    montoTotal = Math.round(montoTotal * 100) / 100;

    if (metodo_pago === 'saldo') {
      if (!usuario_id) {
        throw new Error('Debes iniciar sesión para pagar con saldo');
      }
      const [usuarios] = await connection.query(
        'SELECT saldo_virtual FROM usuarios WHERE id = ? FOR UPDATE',
        [usuario_id]
      );
      if (usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }
      if (parseFloat(usuarios[0].saldo_virtual) < montoTotal) {
        throw new Error('Saldo insuficiente');
      }
      await connection.query(
        'UPDATE usuarios SET saldo_virtual = saldo_virtual - ? WHERE id = ?',
        [montoTotal, usuario_id]
      );
    }

    for (const item of sentados) {
      if (!item.asientoId) {
        continue;
      }
      await connection.query(
        "UPDATE asientos SET estado = 'confirmado', bloqueo_hasta = NULL, bloqueo_llave = NULL WHERE id = ?",
        [item.asientoId]
      );
    }

    const idsPasajero = [];
    for (const item of sentados) {
      const [pasajero] = await connection.query(
        `INSERT INTO pasajeros
         (nombre, apellido, documento_identidad, email, telefono, fecha_nacimiento, nacionalidad, tipo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.viajero.nombre,
          item.viajero.apellido,
          item.viajero.documento_identidad,
          email,
          telefono,
          item.viajero.fecha_nacimiento,
          item.viajero.nacionalidad,
          item.viajero.tipo,
        ]
      );
      idsPasajero.push(pasajero.insertId);
    }

    const principal = sentados.find((item) => item.asientoId);
    const codigoPnr = generarCodigoPnr();
    const metodo = metodo_pago === 'saldo' ? 'saldo' : 'tarjeta';
    const [resultadoReserva] = await connection.query(
      'INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, estado_pago, metodo_pago, monto_total, usuario_id, equipaje_extra_kg, costo_servicios_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigoPnr, idsPasajero[0], vuelo_id, principal.asientoId, 'aprobado', metodo, montoTotal, usuario_id, equipaje_extra_kg, metodo === 'saldo' ? 0 : costo_servicios_extra]
    );

    for (let orden = 0; orden < sentados.length; orden += 1) {
      await connection.query(
        'INSERT INTO reserva_pasajeros (reserva_id, pasajero_id, asiento_id, orden) VALUES (?, ?, ?, ?)',
        [resultadoReserva.insertId, idsPasajero[orden], sentados[orden].asientoId, orden + 1]
      );
    }

    await emitirFactura(connection, resultadoReserva.insertId, montoTotal);

    await connection.query(
      "INSERT INTO idempotencia_pagos (llave_idempotencia, reserva_id, estado_respuesta, codigo_http, cuerpo_respuesta) VALUES (?, ?, 'COMPLETADO', 201, ?)",
      [
        llave_idempotencia,
        resultadoReserva.insertId,
        JSON.stringify({
          mensaje: 'Reserva confirmada',
          reservaId: resultadoReserva.insertId,
          pnr: codigoPnr,
          total: montoTotal,
        }),
      ]
    );

    return { codigo_pnr: codigoPnr, id: resultadoReserva.insertId };
  });
};

export const crearReservaTransaccion = async (datos) => {
  if (Array.isArray(datos.viajeros)) {
    return crearReservaGrupo(datos);
  }

  const {
    nombre,
    apellido,
    documento_identidad,
    email,
    telefono,
    vuelo_id,
    asiento_id,
    usuario_id,
    pasajero_id,
    equipaje_extra_kg = 0,
    costo_servicios_extra = 0.00,
    metodo_pago = 'tarjeta',
    llave_idempotencia,
    bloqueo_llave,
  } = datos;

  return conTransaccion(async (connection) => {
    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE estado = 'reservado_temporal' AND bloqueo_hasta <= NOW() AND id <> ?`,
      [asiento_id]
    );

    const [asientos] = await connection.query(
      `SELECT *, bloqueo_hasta > NOW() AS vigente
       FROM asientos
       WHERE id = ? AND vuelo_id = ?
       FOR UPDATE`,
      [asiento_id, vuelo_id]
    );

    if (asientos.length === 0) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const asiento = asientos[0];
    const propio = asiento.estado === 'reservado_temporal' && asiento.bloqueo_llave === String(bloqueo_llave || '');

    if (propio && Number(asiento.vigente) !== 1) {
      await connection.query(
        `UPDATE asientos
         SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
         WHERE id = ?`,
        [asiento_id]
      );
      throw new Error('El tiempo para completar el pago terminó. Vuelve a elegir un asiento.');
    }

    if (!propio) {
      throw new Error('El asiento ya no está disponible o no existe');
    }

    const [filasVuelo] = await connection.query(
      'SELECT precio_base FROM vuelos WHERE id = ? FOR UPDATE',
      [vuelo_id]
    );
    if (filasVuelo.length === 0) {
      throw new Error('El vuelo no existe');
    }
    if (await documentoRepetidoEnVuelo(connection, vuelo_id, [documento_identidad])) {
      throw errorCliente('Ese documento ya tiene una reserva en este vuelo');
    }
    const precioBase = parseFloat(filasVuelo[0].precio_base ?? 0);
    const cargoAsiento = parseFloat(asiento.precio_adicional ?? 0);
    const montoTotal = Math.round((precioBase + cargoAsiento) * 100) / 100;

    if (metodo_pago === 'saldo') {
      if (!usuario_id) {
        throw new Error('Debes iniciar sesión para pagar con saldo');
      }

      const [usuarios] = await connection.query(
        'SELECT saldo_virtual FROM usuarios WHERE id = ? FOR UPDATE',
        [usuario_id]
      );

      if (usuarios.length === 0) {
        throw new Error('Usuario no encontrado');
      }

      const saldo = parseFloat(usuarios[0].saldo_virtual);
      if (saldo < montoTotal) {
        throw new Error('Saldo insuficiente');
      }

      await connection.query(
        'UPDATE usuarios SET saldo_virtual = saldo_virtual - ? WHERE id = ?',
        [montoTotal, usuario_id]
      );
    }

    await connection.query(
      "UPDATE asientos SET estado = 'confirmado', bloqueo_hasta = NULL, bloqueo_llave = NULL WHERE id = ?",
      [asiento_id]
    );

    let idPasajero = pasajero_id;
    if (!idPasajero) {
      const [pasajero] = await connection.query(
        'INSERT INTO pasajeros (nombre, apellido, documento_identidad, email, telefono) VALUES (?, ?, ?, ?, ?)',
        [nombre, apellido, documento_identidad, email, telefono]
      );
      idPasajero = pasajero.insertId;
    }

    const codigoPnr = generarCodigoPnr();

    const estadoPago = 'aprobado';
    const metodo = metodo_pago === 'saldo' ? 'saldo' : 'tarjeta';
    const [resultadoReserva] = await connection.query(
      'INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, estado_pago, metodo_pago, monto_total, usuario_id, equipaje_extra_kg, costo_servicios_extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [codigoPnr, idPasajero, vuelo_id, asiento_id, estadoPago, metodo, montoTotal, usuario_id, equipaje_extra_kg, metodo === 'saldo' ? 0 : costo_servicios_extra]
    );

    await connection.query(
      'INSERT INTO reserva_pasajeros (reserva_id, pasajero_id, asiento_id, orden) VALUES (?, ?, ?, 1)',
      [resultadoReserva.insertId, idPasajero, asiento_id]
    );

    await emitirFactura(connection, resultadoReserva.insertId, montoTotal);

    await connection.query(
      "INSERT INTO idempotencia_pagos (llave_idempotencia, reserva_id, estado_respuesta, codigo_http, cuerpo_respuesta) VALUES (?, ?, 'COMPLETADO', 201, ?)",
      [
        llave_idempotencia,
        resultadoReserva.insertId,
        JSON.stringify({
          mensaje: 'Reserva confirmada',
          reservaId: resultadoReserva.insertId,
          pnr: codigoPnr,
          total: montoTotal,
        }),
      ]
    );

    return {
      codigo_pnr: codigoPnr,
      id: resultadoReserva.insertId,
    };
  });
};

export const obtenerTodas = async () => {
  const [rows] = await pool.query(
    `SELECT
      r.codigo_pnr,
      CONCAT(p.nombre, ' ', p.apellido) AS nombre_cliente,
      v.origen,
      v.destino,
      a.numero_asiento,
      r.monto_total - r.monto_reembolsado AS total_pagado,
      r.fecha_creacion
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    ORDER BY r.fecha_creacion DESC`
  );

  return rows;
};

export const obtenerHistorialPorUsuario = async (usuarioId) => {
  await marcarSalidas();
  await completarFacturas('r.usuario_id = ?', [usuarioId]);
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      f.numero AS numero_factura,
      f.estado AS estado_factura,
      v.origen,
      v.destino,
      ${salidaReal('v')} AS fecha_salida,
      v.retraso_minutos,
      v.duracion_minutos,
      v.estado AS estado_vuelo,
      IFNULL((
        SELECT GROUP_CONCAT(ax.numero_asiento ORDER BY rp.orden SEPARATOR ', ')
        FROM reserva_pasajeros rp
        INNER JOIN asientos ax ON ax.id = rp.asiento_id
        WHERE rp.reserva_id = r.id
      ), a.numero_asiento) AS numero_asiento,
      r.estado_pago,
      r.metodo_pago,
      r.monto_total,
      r.monto_reembolsado,
      TIMESTAMPDIFF(SECOND, NOW(), ${salidaReal('v')}) AS segundos_para_salida,
      r.fecha_creacion,
      (
        SELECT COUNT(*)
        FROM checkins c
        INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
        WHERE rp.reserva_id = r.id AND c.estado IN ('chequeado', 'abordado', 'no_show')
      ) AS boletos_emitidos,
      (
        SELECT COUNT(*)
        FROM checkins c
        INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
        WHERE rp.reserva_id = r.id AND c.estado = 'abordado'
      ) AS abordados,
      (
        SELECT COUNT(*)
        FROM checkins c
        INNER JOIN reserva_pasajeros rp ON rp.id = c.reserva_pasajero_id
        WHERE rp.reserva_id = r.id AND c.estado = 'no_show'
      ) AS ausentes,
      (
        SELECT COUNT(*)
        FROM reserva_pasajeros rp
        WHERE rp.reserva_id = r.id
      ) AS viajeros_total
    FROM reservas r
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    LEFT JOIN facturas f ON f.reserva_id = r.id
    WHERE r.usuario_id = ?
    ORDER BY r.fecha_creacion DESC`,
    [usuarioId]
  );

  return rows.map((fila) => {
    const checkin = evaluarCheckin({
      estadoPago: fila.estado_pago,
      estadoVuelo: fila.estado_vuelo,
      segundosParaSalida: fila.segundos_para_salida,
    });
    return {
      ...fila,
      boletos_emitidos: Number(fila.boletos_emitidos) || 0,
      abordados: Number(fila.abordados) || 0,
      ausentes: Number(fila.ausentes) || 0,
      viajeros_total: Number(fila.viajeros_total) || 0,
      checkin_abierto: checkin.abierto,
      checkin_motivo: checkin.motivo,
      checkin_mensaje: checkin.mensaje,
    };
  });
};

export const obtenerComprobantePorUsuario = async (reservaId, usuarioId) => {
  await completarFacturas('r.id = ? AND r.usuario_id = ?', [reservaId, usuarioId]);
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      f.numero AS numero_factura,
      f.estado AS estado_factura,
      r.estado_pago,
      r.metodo_pago,
      r.monto_total,
      r.fecha_creacion,
      p.nombre,
      p.apellido,
      p.documento_identidad,
      p.email,
      p.nacionalidad,
      DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
      v.origen,
      v.destino,
      ${salidaReal('v')} AS fecha_salida,
      v.retraso_minutos,
      v.duracion_minutos,
      v.estado AS estado_vuelo,
      a.numero_asiento
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    LEFT JOIN facturas f ON f.reserva_id = r.id
    WHERE r.id = ? AND r.usuario_id = ?`,
    [reservaId, usuarioId]
  );

  const boleto = rows[0];
  if (!boleto) {
    return null;
  }

  const [viajeros] = await pool.query(
    `SELECT
      p.nombre,
      p.apellido,
      p.documento_identidad,
      p.nacionalidad,
      DATE_FORMAT(p.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
      p.tipo,
      a.numero_asiento
    FROM reserva_pasajeros rp
    INNER JOIN pasajeros p ON p.id = rp.pasajero_id
    LEFT JOIN asientos a ON a.id = rp.asiento_id
    WHERE rp.reserva_id = ?
    ORDER BY rp.orden`,
    [reservaId]
  );
  boleto.viajeros = viajeros.length
    ? viajeros
    : [{
      nombre: boleto.nombre,
      apellido: boleto.apellido,
      documento_identidad: boleto.documento_identidad,
      nacionalidad: boleto.nacionalidad || '',
      fecha_nacimiento: boleto.fecha_nacimiento || '',
      tipo: 'adulto',
      numero_asiento: boleto.numero_asiento,
    }];
  if (boleto.viajeros.length > 1) {
    boleto.numero_asiento = boleto.viajeros
      .map((viajero) => viajero.numero_asiento)
      .filter(Boolean)
      .join(', ');
  }

  return boleto;
};

export const obtenerDatosCorreoReserva = async (reservaId) => {
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      r.monto_total,
      r.metodo_pago,
      r.fecha_creacion,
      r.equipaje_extra_kg,
      f.numero AS numero_factura,
      f.estado AS estado_factura,
      p.nombre,
      p.apellido,
      p.email,
      p.telefono,
      p.documento_identidad,
      v.origen,
      v.destino,
      ${salidaReal('v')} AS fecha_salida,
      v.retraso_minutos,
      v.duracion_minutos,
      a.numero_asiento,
      a.categoria
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    LEFT JOIN facturas f ON f.reserva_id = r.id
    WHERE r.id = ?`,
    [reservaId]
  );

  const boleto = rows[0];
  if (!boleto) {
    return null;
  }

  const [viajeros] = await pool.query(
    `SELECT
      p.nombre,
      p.apellido,
      p.documento_identidad,
      p.tipo,
      a.numero_asiento
    FROM reserva_pasajeros rp
    INNER JOIN pasajeros p ON p.id = rp.pasajero_id
    LEFT JOIN asientos a ON a.id = rp.asiento_id
    WHERE rp.reserva_id = ?
    ORDER BY rp.orden`,
    [reservaId]
  );
  boleto.viajeros = viajeros;
  if (viajeros.length > 1) {
    boleto.numero_asiento = viajeros
      .map((viajero) => viajero.numero_asiento)
      .filter(Boolean)
      .join(', ');
  }

  return boleto;
};

export const obtenerPorPNR = async (codigo_pnr) => {
  const [rows] = await pool.query(
    `SELECT
      r.id,
      r.codigo_pnr,
      p.nombre,
      p.apellido,
      p.documento_identidad,
      p.email,
      p.telefono,
      v.origen,
      v.destino,
      a.numero_asiento,
      r.estado_pago,
      r.usuario_id
    FROM reservas r
    INNER JOIN pasajeros p ON r.pasajero_id = p.id
    INNER JOIN vuelos v ON r.vuelo_id = v.id
    INNER JOIN asientos a ON r.asiento_id = a.id
    WHERE r.codigo_pnr = ?`,
    [codigo_pnr]
  );

  return rows[0] || null;
};

export const actualizarPago = async (id, usuarioId) => {
  return conTransaccion(async (connection) => {
    const [reservas] = await connection.query(
      'SELECT monto_total, usuario_id, estado_pago FROM reservas WHERE id = ? FOR UPDATE',
      [id]
    );

    const reserva = reservas[0];
    if (!reserva || Number(reserva.usuario_id) !== Number(usuarioId)) {
      throw errorDeReserva('Reserva no encontrada', 404);
    }
    if (reserva.estado_pago === 'aprobado' || reserva.estado_pago === 'reembolsado') {
      throw errorDeReserva('Esta reserva ya está pagada', 400);
    }

    const { monto_total, usuario_id } = reserva;

    await connection.query(
      "UPDATE reservas SET estado_pago = 'aprobado' WHERE id = ?",
      [id]
    );
    await emitirFactura(connection, id, monto_total);

    await connection.query(
      'UPDATE usuarios SET saldo_virtual = saldo_virtual - ? WHERE id = ?',
      [monto_total, usuario_id]
    );

    const [usuarios] = await connection.query(
      'SELECT saldo_virtual FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    return { saldo_virtual: usuarios[0].saldo_virtual };
  });
};

const SEGUNDOS_DIA = 24 * 60 * 60;
const SEGUNDOS_DOS_DIAS = 2 * SEGUNDOS_DIA;

const errorDeReserva = (mensaje, codigo) => {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
};

export const calcularReembolso = (monto, segundos) => {
  const total = Math.round(Number(monto) * 100) / 100;
  const restante = Number(segundos);
  if (!Number.isFinite(total) || total < 0 || !Number.isFinite(restante) || restante <= 0) {
    return { permitido: false, motivo: 'salio', parcial: false, reembolso: 0 };
  }
  if (restante < SEGUNDOS_DIA) {
    return { permitido: false, motivo: 'cercano', parcial: false, reembolso: 0 };
  }
  const parcial = restante <= SEGUNDOS_DOS_DIAS;
  const reembolso = parcial ? Math.round((total / 2) * 100) / 100 : total;
  return { permitido: true, motivo: parcial ? 'parcial' : 'total', parcial, reembolso };
};

export const cancelarReservaUsuario = async ({ reservaId, usuarioId }) => {
  return conTransaccion(async (connection) => {
    const [filas] = await connection.query(
      `SELECT
        r.id,
        r.usuario_id,
        r.estado_pago,
        r.metodo_pago,
        r.monto_total,
        r.asiento_id,
        TIMESTAMPDIFF(SECOND, NOW(), ${salidaReal('v')}) AS segundos
      FROM reservas r
      INNER JOIN vuelos v ON v.id = r.vuelo_id
      WHERE r.id = ?
      FOR UPDATE`,
      [reservaId]
    );

    const reserva = filas[0];
    if (!reserva || Number(reserva.usuario_id) !== Number(usuarioId)) {
      throw errorDeReserva('Reserva no encontrada', 404);
    }
    if (reserva.estado_pago === 'reembolsado') {
      throw errorDeReserva('Esta reserva ya fue cancelada', 400);
    }
    if (reserva.estado_pago !== 'aprobado' || reserva.metodo_pago !== 'saldo') {
      throw errorDeReserva('Solo se puede cancelar una reserva pagada con billetera', 400);
    }

    const calculo = calcularReembolso(reserva.monto_total, reserva.segundos);
    if (!calculo.permitido) {
      const mensaje = calculo.motivo === 'cercano'
        ? 'Por el poco tiempo que queda para el vuelo no se puede devolver el dinero.'
        : 'El vuelo ya salió y no se puede cancelar';
      throw errorDeReserva(mensaje, 400);
    }

    await connection.query(
      `UPDATE asientos
       SET estado = 'disponible', bloqueo_hasta = NULL, bloqueo_llave = NULL
       WHERE estado = 'confirmado' AND id IN (
         SELECT id FROM (
           SELECT asiento_id AS id FROM reservas WHERE id = ? AND asiento_id IS NOT NULL
           UNION
           SELECT asiento_id AS id FROM reserva_pasajeros WHERE reserva_id = ? AND asiento_id IS NOT NULL
         ) AS asientos_reserva
       )`,
      [reserva.id, reserva.id]
    );
    await connection.query(
      'UPDATE usuarios SET saldo_virtual = saldo_virtual + ? WHERE id = ?',
      [calculo.reembolso, usuarioId]
    );
    await connection.query(
      `UPDATE reservas
       SET estado_pago = 'reembolsado', monto_reembolsado = ?
       WHERE id = ?`,
      [calculo.reembolso, reserva.id]
    );
    await anularFactura(connection, reserva.id, reserva.monto_total);
    await anularCheckinsDeReserva(connection, reserva.id);

    const [usuarios] = await connection.query(
      'SELECT saldo_virtual FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    return {
      reembolso: calculo.reembolso,
      parcial: calculo.parcial,
      saldo_virtual: usuarios[0]?.saldo_virtual ?? null,
    };
  });
};
