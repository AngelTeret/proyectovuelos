import { Router } from 'express';
import { login, registro } from '../controllers/auth.controller.js';

const router = Router();

router.post('/registro', registro);
router.post('/login', login);

export default router;
