const FRANQUICIA = {
  Básica: {
    mano: false,
    bodegaKg: 0,
    textoMano: 'Maleta de mano no incluida',
    textoBodega: 'Bodega no incluida',
  },
  Estándar: {
    mano: true,
    bodegaKg: 0,
    textoMano: 'Maleta de mano incluida, hasta 10 kg',
    textoBodega: 'Bodega no incluida',
  },
  Premium: {
    mano: true,
    bodegaKg: 23,
    textoMano: 'Maleta de mano incluida, hasta 10 kg',
    textoBodega: 'Bodega incluida, hasta 23 kg',
  },
};

export const franquiciaDe = (categoria) => FRANQUICIA[categoria] || FRANQUICIA.Básica;

export const textoEquipajeBoleto = (boleto, grupo = []) => {
  if (boleto.tipo === 'infante') {
    return 'Viaja en regazo, sin equipaje propio';
  }
  const sentados = (Array.isArray(grupo) ? grupo : []).filter((item) => item.tipo !== 'infante' && (item.asiento_id || item.numero_asiento));
  const indice = sentados.findIndex((item) => item.id === boleto.id);
  const tope = Number(boleto.equipaje_extra_kg) || 0;
  const parte = indice < 0 || tope <= 0 || sentados.length === 0
    ? 0
    : Math.floor(tope / sentados.length) + (indice < (tope % sentados.length) ? 1 : 0);
  const franquicia = franquiciaDe(boleto.categoria);
  const bodega = franquicia.bodegaKg + parte;
  const partes = [];
  if (bodega > 0) {
    partes.push(`Este boleto lleva ${bodega} kg en bodega`);
  }
  partes.push(franquicia.mano
    ? 'Puede llevar maleta de mano de 10 kg'
    : 'No puede llevar maleta de mano');
  return `${partes.join('. ')}.`;
};
