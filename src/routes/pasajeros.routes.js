import { Router } from 'express';
import { crearPasajero } from '../controller/pasajeros.controller.js';

const router = Router();

router.post('/', crearPasajero);

export default router;
