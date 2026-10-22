import { Router } from 'express';
import {
  consultarAsientos,
  consultarCheckin,
  crearCheckin,
  descargarBoletos,
  guardarAjustes,
} from '../controller/checkin.controller.js';
import { exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.get('/elegibilidad/:pnr', exigirSesion, consultarCheckin);
router.get('/pnr/:pnr/asientos', exigirSesion, consultarAsientos);
router.get('/pnr/:pnr/pdf', exigirSesion, descargarBoletos);
router.post('/', exigirSesion, crearCheckin);
router.put('/', exigirSesion, guardarAjustes);

export default router;
