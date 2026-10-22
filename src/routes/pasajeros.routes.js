import { Router } from 'express';
import { crearPasajero } from '../controller/pasajeros.controller.js';
import { exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.post('/', exigirSesion, crearPasajero);

export default router;
