import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../src/server.js';
import pool from '../src/config/db.js';
import { respuestaDeSesion } from '../src/middlewares/sesion.js';

let base;
let servidor;
let admin;
let cliente;

const tokenDe = (usuario) => jwt.sign(
  { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);

before(async () => {
  servidor = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
  const [admins] = await pool.query("SELECT id, nombre, rol FROM usuarios WHERE rol = 'admin' LIMIT 1");
  const [clientes] = await pool.query("SELECT id, nombre, rol FROM usuarios WHERE rol = 'cliente' LIMIT 1");
  admin = admins[0];
  cliente = clientes[0];
  assert.ok(admin);
  assert.ok(cliente);
});

after(async () => {
  await new Promise((resolve, reject) => {
    servidor.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

describe('api', () => {
  it('rechaza un pago que no usa la billetera', async () => {
    const respuesta = await fetch(`${base}/api/reservas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'prueba-pago-tarjeta',
        Authorization: `Bearer ${tokenDe(cliente)}`,
      },
      body: JSON.stringify({ metodo_pago: 'tarjeta' }),
    });
    const data = await respuesta.json();
    assert.equal(respuesta.status, 400);
    assert.match(data.mensaje, /billetera virtual/);
  });

  it('muestra la bitácora solo al administrador', async () => {
    const sinSesion = await fetch(`${base}/api/bitacora`);
    assert.equal(sinSesion.status, 401);

    const comoCliente = await fetch(`${base}/api/bitacora`, {
      headers: { Authorization: `Bearer ${tokenDe(cliente)}` },
    });
    assert.equal(comoCliente.status, 403);

    const comoAdmin = await fetch(`${base}/api/bitacora`, {
      headers: { Authorization: `Bearer ${tokenDe(admin)}` },
    });
    const filas = await comoAdmin.json();
    assert.equal(comoAdmin.status, 200);
    assert.equal(Array.isArray(filas), true);
  });

  it('bloquea el noveno intento de entrada del mismo correo', async () => {
    const email = `cupo-${Date.now()}@example.com`;
    for (let intento = 0; intento < 8; intento += 1) {
      const respuesta = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'clave-incorrecta' }),
      });
      assert.equal(respuesta.status, 401);
      await respuesta.json();
    }

    const bloqueado = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'clave-incorrecta' }),
    });
    const data = await bloqueado.json();
    assert.equal(bloqueado.status, 429);
    assert.match(data.mensaje, /Demasiados intentos/);
  });

  it('no elimina un vuelo que ya tiene reservas', async () => {
    const encabezado = { Authorization: `Bearer ${tokenDe(admin)}` };
    const crear = async () => {
      const datos = new FormData();
      datos.append('origen', 'Prueba');
      datos.append('destino', 'Borrado');
      datos.append('fecha_salida', '2026-12-31 10:00:00');
      datos.append('precio_base', '100');
      datos.append('capacidad_asientos', '18');
      datos.append('duracion_minutos', '120');
      const respuesta = await fetch(`${base}/api/vuelos`, {
        method: 'POST',
        headers: encabezado,
        body: datos,
      });
      const cuerpo = await respuesta.json();
      assert.equal(respuesta.status, 201);
      return cuerpo.id;
    };

    const vacio = await crear();
    const borrado = await fetch(`${base}/api/vuelos/${vacio}`, { method: 'DELETE', headers: encabezado });
    assert.equal(borrado.status, 200);

    const ocupado = await crear();
    const [asientos] = await pool.query(
      'SELECT id FROM asientos WHERE vuelo_id = ? LIMIT 1',
      [ocupado]
    );
    const [pasajero] = await pool.query(
      'INSERT INTO pasajeros (nombre, apellido, documento_identidad, email, telefono) VALUES (?, ?, ?, ?, ?)',
      ['Prueba', 'Borrado', `PB${Date.now()}`.slice(0, 15), 'borrado@example.com', '55555555']
    );
    const codigo = `T${String(Date.now()).slice(-5)}`;
    const [reserva] = await pool.query(
      'INSERT INTO reservas (codigo_pnr, pasajero_id, vuelo_id, asiento_id, usuario_id, estado_pago, metodo_pago, monto_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [codigo, pasajero.insertId, ocupado, asientos[0].id, cliente.id, 'aprobado', 'saldo', 100]
    );

    try {
      const respuesta = await fetch(`${base}/api/vuelos/${ocupado}`, { method: 'DELETE', headers: encabezado });
      const cuerpo = await respuesta.json();
      assert.equal(respuesta.status, 400);
      assert.match(cuerpo.mensaje, /ya tiene reservas/);
      const [sigue] = await pool.query('SELECT id FROM vuelos WHERE id = ?', [ocupado]);
      assert.equal(sigue.length, 1);
    } finally {
      await pool.query('DELETE FROM reservas WHERE id = ?', [reserva.insertId]);
      await pool.query('DELETE FROM pasajeros WHERE id = ?', [pasajero.insertId]);
      await fetch(`${base}/api/vuelos/${ocupado}`, { method: 'DELETE', headers: encabezado });
    }
  });

  it('avisa la hora sin actividad cuando el servidor cierra la sesión', () => {
    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';
    error.motivo = 'inactiva';
    let estado = 0;
    let cuerpo = {};
    const res = {
      status(codigo) {
        estado = codigo;
        return this;
      },
      json(data) {
        cuerpo = data;
      },
    };
    assert.equal(respuestaDeSesion(res, error), true);
    assert.equal(estado, 401);
    assert.equal(cuerpo.motivo, 'inactiva');
    assert.match(cuerpo.mensaje, /1 hora sin actividad/);
  });
});
