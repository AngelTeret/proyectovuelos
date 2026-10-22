import { Router } from 'express';
import {
  borrarDespacho,
  borrarMantenimiento,
  crearDespacho,
  crearMantenimiento,
  editarDespacho,
  editarMantenimiento,
  listarDespacho,
  listarMantenimiento,
} from '../controller/personal.controller.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/despacho', exigirAdmin, listarDespacho);
router.post('/despacho', exigirAdmin, crearDespacho);
router.put('/despacho/:id', exigirAdmin, editarDespacho);
router.delete('/despacho/:id', exigirAdmin, borrarDespacho);
router.get('/mantenimiento', exigirAdmin, listarMantenimiento);
router.post('/mantenimiento', exigirAdmin, crearMantenimiento);
router.put('/mantenimiento/:id', exigirAdmin, editarMantenimiento);
router.delete('/mantenimiento/:id', exigirAdmin, borrarMantenimiento);

export default router;
