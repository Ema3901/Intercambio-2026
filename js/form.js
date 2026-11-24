(function () {
  'use strict';
  const { api, toast, cargando, escapar } = window.Navidad;

  const vistas = ['cargando', 'cerrado', 'formulario', 'exito'];
  function mostrar(nombre) {
    vistas.forEach(function (v) {
      document.getElementById('vista-' + v).classList.toggle('oculto', v !== nombre);
    });
  }

  function mostrarMensaje(texto, tipo) {
    const el = document.getElementById('mensaje');
    const icono = tipo === 'error' ? 'error' : 'info';
    el.className = 'aviso aviso-' + tipo;
    el.innerHTML = '<span class="material-symbols-rounded">' + icono + '</span><span>' + escapar(texto) + '</span>';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function ocultarMensaje() {
    document.getElementById('mensaje').className = 'aviso oculto';
  }

  function pintarInfo(info) {
    if (info.nombreEvento) {
      document.getElementById('titulo-evento').textContent = info.nombreEvento;
      document.title = info.nombreEvento + ' - Registro';
    }
    const chips = [];
    if (info.presupuesto) chips.push(['payments', 'Presupuesto: ' + info.presupuesto]);
    if (info.fechaEvento) chips.push(['event', info.fechaEvento]);
    if (info.lugar) chips.push(['location_on', info.lugar]);
    chips.push(['groups', info.totalParticipantes + (info.totalParticipantes === 1 ? ' persona registrada' : ' personas registradas')]);
    document.getElementById('info-evento').innerHTML = chips.map(function (c) {
      return '<span class="chip"><span class="material-symbols-rounded">' + c[0] + '</span>' + escapar(c[1]) + '</span>';
    }).join('');
  }

  async function iniciar() {
    try {
      const r = await api('info');
      pintarInfo(r.data);
      mostrar(r.data.registroAbierto ? 'formulario' : 'cerrado');
    } catch (err) {
      mostrar('formulario');
      mostrarMensaje('No se pudo conectar con el servidor: ' + err.message, 'error');
    }
  }

  const form = document.getElementById('formulario');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ocultarMensaje();

    const datos = Object.fromEntries(new FormData(form).entries());
    Object.keys(datos).forEach(function (k) { datos[k] = String(datos[k]).trim(); });

    if (!datos.nombre) return mostrarMensaje('Escribe tu nombre.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) return mostrarMensaje('Revisa tu correo, parece que no es válido.', 'error');
    if (!datos.gustos) return mostrarMensaje('Cuéntanos al menos algo que te gustaria recibir.', 'error');

    const btn = document.getElementById('btn-enviar');
    cargando(btn, true, 'Enviando al Polo Norte...');
    try {
      const r = await api('registrar', { data: datos });
      document.getElementById('exito-titulo').textContent = r.actualizado ? 'Carta actualizada' : 'Carta recibida';
      document.getElementById('exito-texto').textContent =
        (r.actualizado ? 'Tus cambios se guardaron, ' : 'Gracias, ') + datos.nombre +
        '. Cuando el organizador haga el sorteo te llegará un correo a ' + datos.correo + ' con tu amigo secreto.';
      mostrar('exito');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(r.actualizado ? 'Datos actualizados' : 'Registro completado');
    } catch (err) {
      mostrarMensaje(err.message, 'error');
    } finally {
      cargando(btn, false);
    }
  });

  document.getElementById('btn-editar').addEventListener('click', function () {
    mostrar('formulario');
  });

  iniciar();
})();
