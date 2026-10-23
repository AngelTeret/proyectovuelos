import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import vuelosRoutes from './routes/vuelos.routes.js';
import asientosRoutes from './routes/asientos.routes.js';
import reservasRoutes from './routes/reservas.router.js';
import authRoutes from './routes/auth.routes.js';
import pasajerosRoutes from './routes/pasajeros.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import abordajeRoutes from './routes/abordaje.routes.js';
import personalRoutes from './routes/personal.routes.js';
import mantenimientoRoutes from './routes/mantenimiento.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const origenes = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);
const appUrl = String(process.env.APP_URL || '').trim().replace(/\/$/, '');
if (appUrl) {
  origenes.add(appUrl);
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self' https://cdn.tailwindcss.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || origenes.has(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/vuelos', vuelosRoutes);
app.use('/api/asientos', asientosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pasajeros', pasajerosRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/abordaje', abordajeRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);

app.get('/api/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ estado: 'ok' });
  } catch (error) {
    res.status(503).json({ estado: 'sin_base' });
  }
});

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ mensaje: 'La solicitud es demasiado grande.' });
    return;
  }
  next(error);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
