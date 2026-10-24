const iconosNav = {
  inicio: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>',
  administracion: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>',
  finanzas: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/></svg>',
  bitacora: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/></svg>',
  vuelos: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"/></svg>',
  abordaje: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"/></svg>',
  puerta: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/></svg>',
  mantenimiento: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/></svg>',
  asientos: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"/></svg>',
  entrar: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m3.75-3 3-3m0 0-3-3m3 3H2.25"/></svg>',
  salir: '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/></svg>',
};

const paginaActual = () => {
  const ruta = location.pathname.split('/').pop() || '/';
  if (ruta === 'administracion') {
    return 'administracion';
  }
  if (ruta === 'personal') {
    return 'puerta';
  }
  if (ruta === 'cuentas-mantenimiento') {
    return 'mantenimiento';
  }
  if (ruta === 'mantenimiento') {
    return 'asientos';
  }
  if (ruta === 'abordaje') {
    return 'abordaje';
  }
  if (ruta === 'finanzas') {
    return 'finanzas';
  }
  if (ruta === 'bitacora') {
    return 'bitacora';
  }
  if (ruta === 'mis-vuelos' || ruta === 'confirmacion' || ruta === 'checkin') {
    return 'mis-vuelos';
  }
  return 'inicio';
};

const claseNav = (id, actual) => {
  const activo = id === actual;
  const extra = id === 'administracion' || id === 'finanzas' || id === 'bitacora' || id === 'puerta' || id === 'mantenimiento'
    ? ' solo-admin'
    : id === 'abordaje'
      ? ' solo-personal'
      : id === 'asientos'
        ? ' solo-mantenimiento'
        : id === 'mis-vuelos'
          ? ' solo-sesion oculto-despacho oculto-mantenimiento'
          : id === 'inicio'
            ? ' oculto-despacho oculto-mantenimiento'
            : '';
  const color = activo ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50';
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${color}${extra}`;
};

const pintarMenu = () => {
  const marco = document.querySelector('body > div');
  if (!marco || marco.querySelector('aside')) {
    return;
  }

  const actual = paginaActual();
  marco.insertAdjacentHTML('afterbegin', `
    <aside id="menu-lateral" class="flex w-[232px] shrink-0 flex-col border-r border-slate-100 bg-white px-4 py-5">
      <a href="${rolDeSesion() === 'despacho' ? '/abordaje' : rolDeSesion() === 'mantenimiento' ? '/mantenimiento' : '/'}" class="mb-8 block px-1"><img src="/imagenes/logotipo.svg" alt="Quetzal Airlines" class="h-11 w-auto max-w-full"></a>
      <nav class="flex flex-1 flex-col gap-1" aria-label="Principal">
        <a href="/" class="${claseNav('inicio', actual)}">${iconosNav.inicio}Inicio</a>
        <a href="/mis-vuelos" class="${claseNav('mis-vuelos', actual)}">${iconosNav.vuelos}Mis vuelos</a>
        <a href="/administracion" class="${claseNav('administracion', actual)}">${iconosNav.administracion}Administración</a>
        <a href="/personal" class="${claseNav('puerta', actual)}">${iconosNav.puerta}Puerta</a>
        <a href="/cuentas-mantenimiento" class="${claseNav('mantenimiento', actual)}">${iconosNav.mantenimiento}Mantenimiento</a>
        <a href="/abordaje" class="${claseNav('abordaje', actual)}">${iconosNav.abordaje}Abordaje</a>
        <a href="/mantenimiento" class="${claseNav('asientos', actual)}">${iconosNav.asientos}Asientos</a>
        <a href="/finanzas" class="${claseNav('finanzas', actual)}">${iconosNav.finanzas}Finanzas</a>
        <a href="/bitacora" class="${claseNav('bitacora', actual)}">${iconosNav.bitacora}Bitácora</a>
        <div class="mt-auto flex flex-col gap-1 border-t border-slate-100 pt-4">
          <a id="btn-iniciar-sesion" href="/login" class="hidden flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50">${iconosNav.entrar}Iniciar Sesión</a>
          <button id="btn-cerrar-sesion" type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-50">${iconosNav.salir}Cerrar Sesión</button>
        </div>
      </nav>
    </aside>
  `);
};

const marcaPaso = '<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>';

const pintarPasos = () => {
  const lista = document.querySelector('ol[aria-label="Progreso de la reserva"]');
  const actual = Number(lista?.dataset.paso);
  if (!lista || !actual) {
    return;
  }

  const nombres = ['Vuelos', 'Pasajeros', 'Asientos', 'Pago'];
  const partes = nombres.map((nombre, indice) => {
    const numero = indice + 1;
    let paso;
    if (numero < actual) {
      paso = `<li class="flex items-center gap-2 text-sm font-medium text-emerald-500"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">${marcaPaso}</span><span class="paso-etiqueta">${nombre}</span></li>`;
    } else if (numero === actual) {
      paso = `<li class="flex items-center gap-2 text-sm font-semibold text-slate-900" aria-current="step"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-950 text-xs text-white">${numero}</span><span class="paso-etiqueta">${nombre}</span></li>`;
    } else {
      paso = `<li class="flex items-center gap-2 text-sm text-slate-400"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500">${numero}</span><span class="paso-etiqueta">${nombre}</span></li>`;
    }
    const separador = indice ? '<li class="h-px w-10 bg-slate-200" aria-hidden="true"></li>' : '';
    return `${separador}${paso}`;
  });
  lista.innerHTML = partes.join('');
};

pintarMenu();
pintarPasos();

const nombreDeSesion = () => {
  const guardado = nombreGuardado();
  if (guardado) {
    return guardado;
  }

  const token = tokenDeSesion();
  if (!token) {
    return '';
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base64));
    return datos.nombre || '';
  } catch (error) {
    return '';
  }
};

const nombreUsuario = document.getElementById('nombre-usuario');
if (nombreUsuario) {
  nombreUsuario.textContent = nombreDeSesion();
}

if (rolDeSesion() !== 'admin') {
  document.querySelectorAll('.solo-admin').forEach((enlace) => enlace.remove());
}

if (rolDeSesion() !== 'admin' && rolDeSesion() !== 'despacho') {
  document.querySelectorAll('.solo-personal').forEach((enlace) => enlace.remove());
}

if (rolDeSesion() !== 'admin' && rolDeSesion() !== 'mantenimiento') {
  document.querySelectorAll('.solo-mantenimiento').forEach((enlace) => enlace.remove());
}

if (rolDeSesion() === 'despacho') {
  document.querySelectorAll('.oculto-despacho').forEach((enlace) => enlace.remove());
  const pagina = location.pathname.split('/').pop() || '/';
  if (pagina !== 'abordaje') {
    location.replace('/abordaje');
  }
}

if (rolDeSesion() === 'mantenimiento') {
  document.querySelectorAll('.oculto-mantenimiento').forEach((enlace) => enlace.remove());
  const pagina = location.pathname.split('/').pop() || '/';
  if (pagina !== 'mantenimiento') {
    location.replace('/mantenimiento');
  }
}

if (!tokenDeSesion()) {
  document.querySelectorAll('.solo-sesion').forEach((enlace) => enlace.remove());
}

const iniciarSesion = document.getElementById('btn-iniciar-sesion');
const cerrarSesion = document.getElementById('btn-cerrar-sesion');
if (iniciarSesion && cerrarSesion) {
  const autenticado = Boolean(tokenDeSesion());
  iniciarSesion.classList.toggle('hidden', autenticado);
  cerrarSesion.classList.toggle('hidden', !autenticado);
}

if (cerrarSesion) {
  cerrarSesion.addEventListener('click', () => {
    if (typeof limpiarDatosPersonales === 'function') {
      limpiarDatosPersonales();
    }
    cerrarDatosSesion();
    window.location.replace('/');
  });
}

const estiloMenu = document.createElement('style');
estiloMenu.textContent = `
  .marca-movil { display: none; }
  #nombre-usuario {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  body > div > div > header {
    justify-content: space-between !important;
    gap: 0.75rem;
    padding-left: max(0.75rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
  #app-content {
    padding-top: 1.25rem;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
  }
  #btn-menu,
  #btn-cerrar-menu {
    display: none;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border: 0;
    border-radius: 0.75rem;
    background: transparent;
    color: #334155;
    cursor: pointer;
  }
  #btn-menu:hover,
  #btn-cerrar-menu:hover {
    background: #f8fafc;
  }
  a:focus-visible,
  button:focus-visible,
  select:focus-visible,
  summary:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
  .paso-etiqueta { display: none; }
  ol[aria-label="Progreso de la reserva"] > li.h-px { width: 1rem; }
  #mapa-asientos {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  @media (max-width: 767px) {
    #btn-menu,
    #btn-cerrar-menu { display: inline-flex; }
    .marca-movil {
      display: flex;
      align-items: center;
      margin-right: auto;
      margin-left: 0.25rem;
    }
    .marca-movil img { height: 2rem; width: auto; }
    #menu-lateral {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 40;
      width: min(18rem, calc(100vw - 3rem));
      transform: translateX(-105%);
      transition: transform 200ms ease;
      padding-top: max(1.25rem, env(safe-area-inset-top));
      padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
    }
    body.menu-abierto #menu-lateral { transform: translateX(0); }
    body.menu-abierto #app-content { overflow: hidden; }
    #velo-menu {
      position: fixed;
      inset: 0;
      z-index: 30;
      border: 0;
      padding: 0;
      background: rgba(15, 23, 42, 0.45);
      cursor: pointer;
    }
    #velo-menu[hidden] { display: none !important; }
  }
  @media (min-width: 640px) {
    .paso-etiqueta { display: inline; }
    ol[aria-label="Progreso de la reserva"] > li.h-px { width: 2.5rem; }
  }
  @media (min-width: 768px) {
    body > div > div > header { justify-content: flex-end !important; }
    #app-content {
      padding-top: 1.5rem;
      padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
      padding-left: max(2rem, env(safe-area-inset-left));
      padding-right: max(2rem, env(safe-area-inset-right));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    #menu-lateral { transition: none; }
  }
`;
document.head.appendChild(estiloMenu);

const prepararMenu = () => {
  const lateral = document.querySelector('aside');
  const barra = document.querySelector('body > div > div > header');
  if (!lateral || !barra || lateral.dataset.menuListo) {
    return;
  }
  lateral.id = 'menu-lateral';
  lateral.dataset.menuListo = '1';

  const icono = (d) => `<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;

  const abrirMenu = document.createElement('button');
  abrirMenu.id = 'btn-menu';
  abrirMenu.type = 'button';
  abrirMenu.setAttribute('aria-controls', 'menu-lateral');
  abrirMenu.setAttribute('aria-expanded', 'false');
  abrirMenu.setAttribute('aria-label', 'Abrir menú');
  abrirMenu.innerHTML = icono('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5');
  barra.prepend(abrirMenu);

  const marcaMovil = document.createElement('a');
  marcaMovil.href = '/';
  marcaMovil.className = 'marca-movil';
  marcaMovil.innerHTML = '<img src="/imagenes/isotipo.svg" alt="Quetzal Airlines">';
  abrirMenu.insertAdjacentElement('afterend', marcaMovil);

  const cerrarMenu = document.createElement('button');
  cerrarMenu.id = 'btn-cerrar-menu';
  cerrarMenu.type = 'button';
  cerrarMenu.setAttribute('aria-label', 'Cerrar menú');
  cerrarMenu.innerHTML = icono('M6 18 18 6M6 6l12 12');
  const filaCerrar = document.createElement('div');
  filaCerrar.className = 'flex justify-end';
  filaCerrar.appendChild(cerrarMenu);
  lateral.prepend(filaCerrar);

  const velo = document.createElement('button');
  velo.id = 'velo-menu';
  velo.type = 'button';
  velo.hidden = true;
  velo.setAttribute('aria-label', 'Cerrar menú');
  lateral.insertAdjacentElement('afterend', velo);

  const consulta = window.matchMedia('(max-width: 767px)');
  const estaAbierto = () => document.body.classList.contains('menu-abierto');

  const cerrar = () => {
    document.body.classList.remove('menu-abierto');
    abrirMenu.setAttribute('aria-expanded', 'false');
    abrirMenu.setAttribute('aria-label', 'Abrir menú');
    velo.hidden = true;
  };

  const abrir = () => {
    if (!consulta.matches) {
      return;
    }
    document.body.classList.add('menu-abierto');
    abrirMenu.setAttribute('aria-expanded', 'true');
    abrirMenu.setAttribute('aria-label', 'Cerrar menú');
    velo.hidden = false;
    cerrarMenu.focus();
  };

  abrirMenu.addEventListener('click', () => {
    if (estaAbierto()) {
      cerrar();
    } else {
      abrir();
    }
  });
  cerrarMenu.addEventListener('click', () => {
    cerrar();
    abrirMenu.focus();
  });
  velo.addEventListener('click', () => {
    cerrar();
    abrirMenu.focus();
  });
  lateral.querySelectorAll('a').forEach((enlace) => {
    enlace.addEventListener('click', cerrar);
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) {
      cerrar();
      abrirMenu.focus();
    }
  });
  consulta.addEventListener('change', (evento) => {
    if (!evento.matches) {
      cerrar();
    }
  });
};

const prepararPasos = () => {
  document.querySelectorAll('ol[aria-label="Progreso de la reserva"] > li').forEach((paso) => {
    [...paso.childNodes].forEach((nodo) => {
      if (nodo.nodeType !== Node.TEXT_NODE || !nodo.textContent.trim()) {
        return;
      }
      const etiqueta = document.createElement('span');
      etiqueta.className = 'paso-etiqueta';
      etiqueta.textContent = nodo.textContent.trim();
      nodo.replaceWith(etiqueta);
    });
  });
};

prepararMenu();
prepararPasos();
