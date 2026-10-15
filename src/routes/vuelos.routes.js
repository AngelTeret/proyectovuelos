import { Router } from 'express';
import { obtenerVuelos, crearVuelo } from '../controllers/vuelos.controller.js';

const router = Router();

router.get('/', obtenerVuelos);
router.post('/', crearVuelo);

export default router;
