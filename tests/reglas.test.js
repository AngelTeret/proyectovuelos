import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluarCheckin, motivoVentaCerrada } from '../src/utils/checkinVentana.js';
import { cargoDeCategoria } from '../src/utils/precioAsiento.js';
import { calcularReembolso } from '../src/utils/reembolso.js';

const HORA = 60 * 60;
const DIA = 24 * HORA;

describe('venta y check-in', () => {
  it('permite comprar si faltan más de 60 minutos', () => {
    assert.equal(motivoVentaCerrada({ estado: 'Programado', segundosParaSalida: HORA + 1 }), '');
  });

  it('cierra la venta en la hora previa a la salida', () => {
    assert.match(
      motivoVentaCerrada({ estado: 'Programado', segundosParaSalida: HORA }),
      /check-in cierra una hora/
    );
  });

  it('rechaza un vuelo que ya salió', () => {
    assert.equal(motivoVentaCerrada({ estado: 'Programado', segundosParaSalida: 0 }), 'Este vuelo ya salió.');
  });

  it('abre el check-in entre 48 horas y 60 minutos', () => {
    const abierto = evaluarCheckin({
      estadoPago: 'aprobado',
      estadoVuelo: 'Programado',
      segundosParaSalida: 2 * HORA,
    });
    assert.equal(abierto.abierto, true);
  });

  it('mantiene cerrado el check-in si faltan más de 48 horas', () => {
    const cerrado = evaluarCheckin({
      estadoPago: 'aprobado',
      estadoVuelo: 'Programado',
      segundosParaSalida: 48 * HORA + 1,
    });
    assert.equal(cerrado.abierto, false);
  });
});

describe('precio y reembolso', () => {
  it('cobra 20 % en estándar y 50 % en premium', () => {
    assert.equal(cargoDeCategoria(400, 'Básica'), 0);
    assert.equal(cargoDeCategoria(400, 'Estándar'), 80);
    assert.equal(cargoDeCategoria(400, 'Premium'), 200);
  });

  it('devuelve el total si faltan más de 48 horas', () => {
    assert.deepEqual(calcularReembolso(1080, 3 * DIA), {
      permitido: true,
      motivo: 'total',
      parcial: false,
      reembolso: 1080,
    });
  });

  it('devuelve la mitad entre 24 y 48 horas', () => {
    const calculo = calcularReembolso(1080, 30 * HORA);
    assert.equal(calculo.permitido, true);
    assert.equal(calculo.reembolso, 540);
  });

  it('no devuelve si falta menos de un día', () => {
    assert.equal(calcularReembolso(1080, 10 * HORA).permitido, false);
  });
});
