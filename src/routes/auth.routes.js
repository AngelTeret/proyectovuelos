import { Router } from 'express';
import {
  actualizarPerfil,
  cambiarContrasena,
  login,
  olvidarContrasena,
  perfil,
  reenviarVerificacion,
  registro,
  restablecerContrasena,
  revisarEnlaceRestablecer,
  verificarCorreo,
} from '../controller/auth.controller.js';
import { exigirSesion } from '../middlewares/sesion.js';

const router = Router();

router.post('/registro', registro);
router.post('/verificar', verificarCorreo);
router.post('/reenviar', reenviarVerificacion);
router.post('/login', login);
router.post('/olvide', olvidarContrasena);
router.post('/restablecer/revisar', revisarEnlaceRestablecer);
router.post('/restablecer', restablecerContrasena);
router.get('/perfil', perfil);
router.put('/perfil', exigirSesion, actualizarPerfil);
router.put('/perfil/contrasena', exigirSesion, cambiarContrasena);

export default router;
