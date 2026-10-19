import { Router } from 'express';
import {
  bloquearAsiento,
  liberarAsiento,
  obtenerAsientosDeVuelo,
  verBloqueo,
} from '../controller/asientos.controller.js';

const router = Router();

router.get('/vuelo/:vuelo_id', obtenerAsientosDeVuelo);
router.post('/bloquear', bloquearAsiento);
router.post('/liberar', liberarAsiento);
router.get('/:id/bloqueo', verBloqueo);

export default router;
