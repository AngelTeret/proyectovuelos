export const salidaReal = (alias = '') => {
  const prefijo = alias ? `${alias}.` : '';
  return `DATE_ADD(${prefijo}fecha_salida, INTERVAL ${prefijo}retraso_minutos MINUTE)`;
};

export const sumarRetraso = (fecha, minutos) => {
  const base = new Date(fecha).getTime();
  const retraso = Number(minutos) || 0;
  if (!Number.isFinite(base)) {
    return null;
  }
  return new Date(base + (retraso * 60 * 1000));
};
