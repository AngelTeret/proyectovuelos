import { Router } from 'express';
import {
  bloquearAsiento,
  liberarAsiento,
  obtenerAsientosDeVuelo,
  verBloqueo,
} from '../controller/asientos.controller.js';
import { exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.get('/vuelo/:vuelo_id', obtenerAsientosDeVuelo);
router.post('/bloquear', exigirSesion, bloquearAsiento);
router.post('/liberar', liberarAsiento);
router.get('/:id/bloqueo', verBloqueo);

export default router;
