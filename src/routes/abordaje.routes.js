import { Router } from 'express';
import {
  abrirAbordaje,
  consultarAbordaje,
  finalizarAbordaje,
  listarAbordaje,
  registrarAbordaje,
} from '../controller/abordaje.controller.js';
import { exigirPersonal } from '../middlewares/sesion.js';

const router = Router();

router.get('/vuelos', exigirPersonal, listarAbordaje);
router.get('/vuelos/:id', exigirPersonal, consultarAbordaje);
router.post('/vuelos/:id/iniciar', exigirPersonal, abrirAbordaje);
router.post('/vuelos/:id/abordar', exigirPersonal, registrarAbordaje);
router.post('/vuelos/:id/cerrar', exigirPersonal, finalizarAbordaje);

export default router;
