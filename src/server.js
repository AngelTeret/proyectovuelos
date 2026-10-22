import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/db.js';
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

app.use(cors());
app.use(express.json());
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

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
