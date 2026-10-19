const estadosPago = {
  aprobado: { texto: 'Aprobado', clase: 'bg-emerald-50 text-emerald-700' },
  pendiente: { texto: 'Pendiente', clase: 'bg-amber-50 text-amber-800' },
  rechazado: { texto: 'Rechazado', clase: 'bg-red-50 text-red-700' },
  reembolsado: { texto: 'Reembolsado', clase: 'bg-slate-100 text-slate-600' },
};

const mostrar = (id) => {
  document.getElementById('estado-carga').classList.add('hidden');
  document.getElementById(id).classList.remove('hidden');
};

const pintarHistorial = (reservas) => {
  if (reservas.length === 0) {
    mostrar('vacio');
    return;
  }

  const lista = document.getElementById('lista-vuelos');
  const plantilla = document.getElementById('plantilla-vuelo');
  reservas.forEach((reserva) => {
    const nodo = plantilla.content.cloneNode(true);
    const estado = estadosPago[reserva.estado_pago] || {
      texto: reserva.estado_pago || 'Sin estado',
      clase: 'bg-slate-100 text-slate-600',
    };
    const etiqueta = nodo.querySelector('[data-campo="estado"]');
    nodo.querySelector('[data-campo="pnr"]').textContent = reserva.codigo_pnr || '';
    etiqueta.textContent = estado.texto;
    etiqueta.className = `rounded-full px-2.5 py-1 text-xs font-medium ${estado.clase}`;
    nodo.querySelector('[data-campo="ruta"]').textContent = `${reserva.origen || ''} → ${reserva.destino || ''}`;
    nodo.querySelector('[data-campo="salida"]').textContent = formatearSalida(reserva.fecha_salida);
    nodo.querySelector('[data-campo="asiento"]').textContent = reserva.numero_asiento || '';
    nodo.querySelector('[data-campo="total"]').textContent = quetzales(reserva.monto_total);
    lista.appendChild(nodo);
  });
  mostrar('lista-vuelos');
};

const cargarHistorial = async () => {
  try {
    const respuesta = await fetch('/api/reservas/mi-historial', {
      headers: autorizacion(),
    });
    if (respuesta.status === 401) {
      localStorage.setItem('redirectAfterLogin', '/mis-vuelos.html');
      window.location.href = '/login.html';
      return;
    }
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el historial');
    }
    pintarHistorial(await respuesta.json());
  } catch (error) {
    mostrar('error-historial');
  }
};

cargarHistorial();
