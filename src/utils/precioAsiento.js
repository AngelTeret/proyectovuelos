export const dinero = (monto) => Math.round((Number(monto) || 0) * 100) / 100;

export const cargoDeCategoria = (precioBase, categoria) => {
  const base = Number(precioBase) || 0;
  if (categoria === 'Premium') {
    return dinero(base * 0.5);
  }
  if (categoria === 'Estándar') {
    return dinero(base * 0.2);
  }
  return 0;
};
