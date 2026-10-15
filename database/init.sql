CREATE DATABASE IF NOT EXISTS bdvuelos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bdvuelos;

CREATE TABLE IF NOT EXISTS vuelos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  origen VARCHAR(100) NOT NULL,
  destino VARCHAR(100) NOT NULL,
  fecha_salida DATETIME NOT NULL,
  estado ENUM(
    'Programado',
    'Abordando',
    'En Curso',
    'Completado',
    'Retrasado',
    'Cancelado'
  ) NOT NULL DEFAULT 'Programado',
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS asientos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vuelo_id INT UNSIGNED NOT NULL,
  numero_asiento VARCHAR(10) NOT NULL,
  estado ENUM(
    'disponible',
    'reservado_temporal',
    'confirmado',
    'bloqueado_mantenimiento'
  ) NOT NULL DEFAULT 'disponible',
  PRIMARY KEY (id),
  UNIQUE KEY uk_vuelo_numero_asiento (vuelo_id, numero_asiento),
  CONSTRAINT fk_asientos_vuelo
    FOREIGN KEY (vuelo_id) REFERENCES vuelos (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pasajeros (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  documento_identidad VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reservas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo_pnr VARCHAR(6) NOT NULL,
  pasajero_id INT UNSIGNED NOT NULL,
  vuelo_id INT UNSIGNED NOT NULL,
  asiento_id INT UNSIGNED NOT NULL,
  estado_pago ENUM(
    'pendiente',
    'aprobado',
    'rechazado',
    'reembolsado'
  ) NOT NULL DEFAULT 'pendiente',
  monto_total DECIMAL(10, 2) NOT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_codigo_pnr (codigo_pnr),
  CONSTRAINT fk_reservas_pasajero
    FOREIGN KEY (pasajero_id) REFERENCES pasajeros (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reservas_vuelo
    FOREIGN KEY (vuelo_id) REFERENCES vuelos (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reservas_asiento
    FOREIGN KEY (asiento_id) REFERENCES asientos (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'cliente') DEFAULT 'cliente',
  saldo_virtual DECIMAL(10,2) DEFAULT 1000.00
) ENGINE=InnoDB;

ALTER TABLE reservas ADD COLUMN usuario_id INT UNSIGNED;
ALTER TABLE reservas ADD CONSTRAINT fk_usuario_reserva FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;