import { Router } from 'express';
import { borrarDespacho, crearDespacho, editarDespacho, listarDespacho } from '../controller/personal.controller.js';
import { exigirAdmin } from '../middlewares/sesion.js';

const router = Router();

router.get('/despacho', exigirAdmin, listarDespacho);
router.post('/despacho', exigirAdmin, crearDespacho);
router.put('/despacho/:id', exigirAdmin, editarDespacho);
router.delete('/despacho/:id', exigirAdmin, borrarDespacho);

export default router;
