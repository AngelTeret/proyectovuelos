(() => {
if (!tokenDeSesion()) {
  window.location.replace('/login');
} else if (rolDeSesion() !== 'admin') {
  window.location.replace('/');
}

const COLORES = {
  azul: 'bg-blue-600',
  verde: 'bg-emerald-600',
  ambar: 'bg-amber-500',
  rojo: 'bg-red-500',
  slate: 'bg-slate-400',
};

let tipoActivo = 'vuelos';
let paginaActual = 1;

const fechasIniciales = () => {
  const anio = new Date().getFullYear();
  document.getElementById('desde').value = `${anio}-01-01`;
  document.getElementById('hasta').value = `${anio}-12-31`;
};

const marcarTipo = () => {
  document.querySelectorAll('#tipos [data-tipo]').forEach((boton) => {
    const activo = boton.dataset.tipo === tipoActivo;
    boton.setAttribute('aria-selected', activo ? 'true' : 'false');
    boton.className = activo
      ? 'h-10 shrink-0 rounded-full bg-blue-950 px-4 text-sm font-semibold text-white'
      : 'h-10 shrink-0 rounded-full bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50';
  });
};

const textoCelda = (columna, fila) => {
  const valor = fila[columna.clave];
  if (valor == null || valor === '') {
    return '—';
  }
  if (columna.tipo === 'dinero') {
    return quetzales(valor);
  }
  if (columna.tipo === 'porcentaje') {
    return `${Number(valor).toLocaleString('es-GT', { maximumFractionDigits: 1 })} %`;
  }
  if (columna.tipo === 'numero') {
    return Number(valor).toLocaleString('es-GT', { maximumFractionDigits: 1 });
  }
  return String(valor);
};

const textoBarra = (unidad, valor) => {
  if (unidad === 'dinero') {
    return quetzales(valor);
  }
  if (unidad === 'porcentaje') {
    return `${Number(valor).toLocaleString('es-GT', { maximumFractionDigits: 1 })} %`;
  }
  return Number(valor).toLocaleString('es-GT');
};

const pintarGrafica = (grafica) => {
  document.getElementById('titulo-grafica').textContent = grafica.titulo || 'Gráfica';
  const contenedor = document.getElementById('grafica');
  const nota = document.getElementById('nota-grafica');
  const series = grafica.series || [];
  if (series.length === 0) {
    contenedor.innerHTML = '<p class="text-sm text-slate-500">No hay datos para la gráfica en estas fechas.</p>';
    nota.classList.add('hidden');
    return;
  }
  const maximo = Math.max(...series.map((serie) => Number(serie.valor) || 0), 0);
  contenedor.innerHTML = series.map((serie) => {
    const valor = Number(serie.valor) || 0;
    const ancho = grafica.unidad === 'porcentaje'
      ? Math.min(100, valor > 0 ? Math.max(2, valor) : 0)
      : (maximo > 0 ? Math.max(valor > 0 ? 2 : 0, Math.round((valor / maximo) * 100)) : 0);
    const color = COLORES[serie.color] || COLORES.azul;
    return `
      <div>
        <div class="mb-1 flex items-baseline justify-between gap-3 text-sm">
          <span class="min-w-0 truncate text-slate-700">${escapar(serie.etiqueta)}</span>
          <span class="shrink-0 font-semibold text-slate-900">${escapar(textoBarra(grafica.unidad, valor))}</span>
        </div>
        <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full ${color}" style="width: ${ancho}%"></div>
        </div>
      </div>`;
  }).join('');
  contenedor.className = 'mt-4 space-y-4';
  nota.textContent = grafica.nota || '';
  nota.classList.toggle('hidden', !grafica.nota);
};

const pintarTabla = (reporte) => {
  const columnas = reporte.columnas || [];
  document.getElementById('cabeza-tabla').innerHTML = `
    <tr>${columnas.map((columna) => `<th class="px-5 py-3">${escapar(columna.titulo)}</th>`).join('')}</tr>`;
  const cuerpo = document.getElementById('cuerpo-tabla');
  if (!reporte.filas?.length) {
    cuerpo.innerHTML = `<tr><td colspan="${Math.max(columnas.length, 1)}" class="px-5 py-8 text-center text-sm text-slate-500">No hay registros en estas fechas.</td></tr>`;
  } else {
    cuerpo.innerHTML = reporte.filas.map((fila) => `
      <tr class="hover:bg-slate-50">
        ${columnas.map((columna) => `<td data-etiqueta="${escapar(columna.titulo)}" class="px-5 py-4">${escapar(textoCelda(columna, fila))}</td>`).join('')}
      </tr>`).join('');
  }

  const total = Number(reporte.total) || 0;
  const porPagina = Number(reporte.por_pagina) || 20;
  const inicio = total === 0 ? 0 : ((paginaActual - 1) * porPagina) + 1;
  const fin = Math.min(paginaActual * porPagina, total);
  document.getElementById('rango').textContent = total === 0
    ? 'Sin registros'
    : `${inicio}–${fin} de ${total.toLocaleString('es-GT')}`;
  document.getElementById('anterior').disabled = paginaActual <= 1;
  document.getElementById('siguiente').disabled = paginaActual >= (Number(reporte.paginas) || 1);
};

const pintarReporte = (reporte) => {
  document.getElementById('descripcion').textContent = reporte.descripcion || '';
  document.getElementById('resumen').innerHTML = (reporte.resumen || []).map((tarjeta) => `
    <article class="rounded-2xl bg-white p-5 shadow-sm">
      <p class="text-sm font-medium text-slate-500">${escapar(tarjeta.etiqueta)}</p>
      <p class="mt-2 text-2xl font-bold text-slate-900">${escapar(tarjeta.valor)}</p>
    </article>`).join('');
  const nota = document.getElementById('nota-reporte');
  nota.textContent = reporte.nota || '';
  nota.classList.toggle('hidden', !reporte.nota);
  pintarGrafica(reporte.grafica || {});
  pintarTabla(reporte);
};

const consultar = async () => {
  const desde = document.getElementById('desde').value;
  const hasta = document.getElementById('hasta').value;
  const boton = document.getElementById('consultar');
  boton.disabled = true;
  document.getElementById('descargar').disabled = true;
  try {
    const params = new URLSearchParams({ desde, hasta, pagina: String(paginaActual) });
    const respuesta = await fetch(`/api/reportes/${tipoActivo}?${params}`, { headers: autorizacion() });
    if (await cerrarSiSesionRechazada(respuesta, '/reportes')) {
      return;
    }
    if (respuesta.status === 403) {
      window.location.replace('/');
      return;
    }
    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      Swal.fire({ icon: 'warning', title: 'Revisa el reporte', text: data.mensaje || 'No se pudo consultar.' });
      return;
    }
    paginaActual = Number(data.pagina) || paginaActual;
    pintarReporte(data);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo consultar', text: 'Intenta de nuevo.' });
  } finally {
    boton.disabled = false;
    document.getElementById('descargar').disabled = false;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!tokenDeSesion() || rolDeSesion() !== 'admin') {
    return;
  }
  fechasIniciales();
  marcarTipo();

  document.getElementById('tipos').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-tipo]');
    if (!boton || boton.dataset.tipo === tipoActivo) {
      return;
    }
    tipoActivo = boton.dataset.tipo;
    paginaActual = 1;
    marcarTipo();
    consultar();
  });

  document.getElementById('filtros').addEventListener('submit', (evento) => {
    evento.preventDefault();
    paginaActual = 1;
    consultar();
  });

  document.getElementById('descargar').addEventListener('click', () => {
    const desde = document.getElementById('desde').value;
    const hasta = document.getElementById('hasta').value;
    const params = new URLSearchParams({ desde, hasta, formato: 'xlsx' });
    descargarReporte(`/api/reportes/${tipoActivo}?${params}`);
  });

  document.getElementById('anterior').addEventListener('click', () => {
    if (paginaActual > 1) {
      paginaActual -= 1;
      consultar();
    }
  });

  document.getElementById('siguiente').addEventListener('click', () => {
    paginaActual += 1;
    consultar();
  });

  consultar();
});

const descargarReporte = async (url) => {
  const boton = document.getElementById('descargar');
  const texto = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Descargando…';
  try {
    const respuesta = await fetch(url, { headers: autorizacion() });
    if (await cerrarSiSesionRechazada(respuesta, '/reportes')) {
      return;
    }
    if (!respuesta.ok) {
      const data = await respuesta.json().catch(() => ({}));
      Swal.fire({ icon: 'warning', title: 'No se pudo descargar', text: data.mensaje || 'Intenta de nuevo.' });
      return;
    }
    const archivo = await respuesta.blob();
    const disposicion = respuesta.headers.get('Content-Disposition') || '';
    const coincidencia = disposicion.match(/filename="([^"]+)"/);
    const enlace = document.createElement('a');
    const archivoUrl = URL.createObjectURL(archivo);
    enlace.href = archivoUrl;
    enlace.download = coincidencia ? coincidencia[1] : 'reporte.xlsx';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(archivoUrl);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'No se pudo descargar', text: 'Intenta de nuevo.' });
  } finally {
    boton.disabled = false;
    boton.textContent = texto;
  }
};
})();
