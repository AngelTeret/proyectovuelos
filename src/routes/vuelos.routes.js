import { Router } from 'express';
import { obtenerVuelos, crearVuelo, actualizarVuelo, eliminarVuelo } from '../controller/vuelos.controller.js';
import { obtenerAsientosPorVuelo } from '../controller/asientos.controller.js';
import { subirImagen } from '../middlewares/subirImagen.js';

const router = Router();

router.get('/', obtenerVuelos);
router.get('/:id/asientos', obtenerAsientosPorVuelo);
router.post('/', subirImagen, crearVuelo);
router.put('/:id', subirImagen, actualizarVuelo);
router.delete('/:id', eliminarVuelo);

export default router;
