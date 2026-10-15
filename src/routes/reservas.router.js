import { Router } from 'express';
import {
  crearReserva,
  consultarReserva,
  pagarReserva,
} from '../controllers/reservas.controller.js';

const router = Router();

router.post('/', crearReserva);
router.get('/pnr/:pnr', consultarReserva);
router.put('/:id/pago', pagarReserva);

export default router;
