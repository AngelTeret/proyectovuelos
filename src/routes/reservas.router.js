import { Router } from 'express';
import {
  crearReserva,
  consultarReserva,
  cancelarReserva,
  obtenerFactura,
  obtenerHistorialUsuario,
  obtenerReservas,
  pagarReserva,
  descargarFactura,
} from '../controller/reservas.controller.js';
import { verificarIdempotencia } from '../middlewares/idempotencia.js';
import { exigirAdmin, exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.get('/', exigirAdmin, obtenerReservas);
router.get('/mi-historial', obtenerHistorialUsuario);
router.post('/', exigirSesion, verificarIdempotencia, crearReserva);
router.get('/pnr/:pnr', exigirSesion, consultarReserva);
router.get('/:id/factura/pdf', descargarFactura);
router.get('/:id/factura', obtenerFactura);
router.get('/:id/comprobante', obtenerFactura);
router.get('/:id/boleto', descargarFactura);
router.put('/:id/cancelar', cancelarReserva);
router.put('/:id/pago', exigirSesion, pagarReserva);

export default router;
