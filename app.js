/* =========================
   CONFIG
========================= */

const API_URL = '/api/proxy';

let usuarioLogado = null;
let usuariosCache = [];
let cooperativasCache = [];
let consultoresCache = [];

const LINK_CONTRATO_ZAPSIGN =
  'https://app.zapsign.com.br/verificar/doc/4c07c73c-9cbf-4498-89f1-27f95098ac60';

/* =========================
   INIT
========================= */

document.addEventListener('DOMContentLoaded', () => {

  const usuarioSalvo = localStorage.getItem('usuarioLogado');

  if (usuarioSalvo) {
    usuarioLogado = JSON.parse(usuarioSalvo);
    abrirSistema();
  } else {
    mostrarLogin();
  }

});

/* =========================
   UI BASE
========================= */

function mostrarLogin() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('appPage').style.display = 'none';
}

function abrirSistema() {

  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'flex';

  document.getElementById('usuarioTopo').innerText =
    `${usuarioLogado.nome} | ${usuarioLogado.perfil}`;

  aplicarPermissoesVisuais();

  carregarDashboard();
  carregarCooperativas();
  carregarPalavraChave();
}

/* =========================
   API
========================= */

async function apiPost(payload) {

  const resposta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await resposta.json();
}

/* =========================
   LOGIN
========================= */

async function fazerLogin(event) {

  event.preventDefault();

  const email =
    document.getElementById('loginEmail').value.trim();

  const senha =
    document.getElementById('loginSenha').value.trim();

  try {

    const resultado = await apiPost({
      action: 'login',
      email,
      senha
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao fazer login.');
      return;
    }

    usuarioLogado = resultado.usuario;

    localStorage.setItem(
      'usuarioLogado',
      JSON.stringify(usuarioLogado)
    );

    abrirSistema();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao realizar login.');

  }

}

function sair() {

  localStorage.removeItem('usuarioLogado');
  usuarioLogado = null;

  mostrarLogin();
}

/* =========================
   PERMISSÕES
========================= */

function aplicarPermissoesVisuais() {

  const perfil =
    String(usuarioLogado?.perfil || '').toUpperCase();

  const btnCadastro =
    document.getElementById('btnCadastroConsultor');

  const menuProcessos =
    document.querySelector('[data-aba="processos"]');

  if (perfil === 'CONSULTOR') {

    if (btnCadastro) {
      btnCadastro.style.display = 'none';
    }

    if (menuProcessos) {
      menuProcessos.style.display = 'none';
    }

  } else {

    if (btnCadastro) {

      if (perfil === 'REGIONAL') {

        btnCadastro.innerText =
          'Solicitar Cadastro de Consultor';

      } else {

        btnCadastro.innerText =
          'Cadastrar Consultor';

      }

    }

  }

}

function usuarioEhAdmin() {

  const perfil =
    String(usuarioLogado?.perfil || '').toUpperCase();

  return (
    perfil === 'SUPER_ADMIN' ||
    perfil === 'ADMINISTRATIVO'
  );
}

function usuarioEhRegional() {

  const perfil =
    String(usuarioLogado?.perfil || '').toUpperCase();

  return perfil === 'REGIONAL';
}

/* =========================
   MENU
========================= */

function mostrarAba(aba) {

  document.querySelectorAll('.section').forEach(secao => {
    secao.style.display = 'none';
  });

  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });

  const secao =
    document.getElementById(`secao-${aba}`);

  if (secao) {
    secao.style.display = 'block';
  }

  const menu =
    document.querySelector(`[data-aba="${aba}"]`);

  if (menu) {
    menu.classList.add('active');
  }

  if (aba === 'inicio') {
    carregarDashboard();
  }

  if (aba === 'usuarios') {
    carregarUsuarios();
  }

  if (aba === 'cooperativas') {
    carregarCooperativas();
  }

  if (aba === 'processos') {
    carregarConsultores();
  }

}

/* =========================
   DASHBOARD
========================= */

async function carregarDashboard() {

  try {

    const resultado = await apiPost({
      action: 'dashboard'
    });

    if (!resultado.success) return;

    const dados = resultado.dashboard;

    setTexto('dashUsuarios', dados.totalUsuarios || 0);
    setTexto('dashAtivos', dados.usuariosAtivos || 0);
    setTexto('dashConsultores', dados.consultores || 0);
    setTexto('dashRegionais', dados.regionais || 0);
    setTexto('dashCooperativas', dados.cooperativas || 0);

  } catch (erro) {

    console.error(erro);

  }

}

/* =========================
   USUÁRIOS
========================= */

async function carregarUsuarios() {

  try {

    const resultado = await apiPost({
      action: 'listarUsuarios'
    });

    if (!resultado.success) {
      alert(resultado.message);
      return;
    }

    usuariosCache = resultado.usuarios || [];

    renderizarUsuarios(usuariosCache);
    atualizarMiniDashboardUsuarios(usuariosCache);

  } catch (erro) {

    console.error(erro);

  }

}

function renderizarUsuarios(lista) {

  const tbody =
    document.getElementById('tabelaUsuariosBody');

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          Nenhum usuário encontrado.
        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(usuario => {

    const tr = document.createElement('tr');

    const statusClass =
      String(usuario.status).toUpperCase() === 'ATIVO'
        ? 'status ativo'
        : 'status inativo';

    tr.innerHTML = `
      <td>
        <strong>${usuario.nome || '-'}</strong>
        <small>${usuario.id || ''}</small>
      </td>

      <td>${usuario.email || '-'}</td>

      <td>
        <span class="tag">
          ${usuario.perfil || '-'}
        </span>
      </td>

      <td>
        ${obterNomeCooperativa(usuario.cooperativa_id)}
      </td>

      <td>
        <span class="${statusClass}">
          ${usuario.status || '-'}
        </span>
      </td>

      <td class="acoes">

        <button onclick="abrirModalEditarUsuario('${usuario.id}')">
          Editar
        </button>

        <button onclick="alterarStatusUsuario('${usuario.id}')">
          ${String(usuario.status).toUpperCase() === 'ATIVO'
            ? 'Inativar'
            : 'Ativar'}
        </button>

        <button
          class="danger"
          onclick="confirmarExclusaoUsuario('${usuario.id}', '${usuario.nome}')"
        >
          Excluir
        </button>

      </td>
    `;

    tbody.appendChild(tr);

  });

}

function atualizarMiniDashboardUsuarios(lista) {

  setTexto('miniTotalUsuarios', lista.length);

  setTexto(
    'miniUsuariosAtivos',
    lista.filter(u =>
      String(u.status).toUpperCase() === 'ATIVO'
    ).length
  );

  setTexto(
    'miniUsuariosInativos',
    lista.filter(u =>
      String(u.status).toUpperCase() === 'INATIVO'
    ).length
  );

  setTexto(
    'miniAdmins',
    lista.filter(u => {

      const perfil =
        String(u.perfil).toUpperCase();

      return (
        perfil === 'SUPER_ADMIN' ||
        perfil === 'ADMINISTRATIVO'
      );

    }).length
  );

  setTexto(
    'miniRegionais',
    lista.filter(u =>
      String(u.perfil).toUpperCase() === 'REGIONAL'
    ).length
  );

  setTexto(
    'miniConsultores',
    lista.filter(u =>
      String(u.perfil).toUpperCase() === 'CONSULTOR'
    ).length
  );

}

function filtrarUsuarios() {

  const busca =
    document.getElementById('buscaUsuario')
      .value.toLowerCase();

  const status =
    document.getElementById('filtroStatusUsuario').value;

  const perfil =
    document.getElementById('filtroPerfilUsuario').value;

  let lista = [...usuariosCache];

  if (busca) {

    lista = lista.filter(usuario => {

      const nome =
        String(usuario.nome || '').toLowerCase();

      const email =
        String(usuario.email || '').toLowerCase();

      return (
        nome.includes(busca) ||
        email.includes(busca)
      );

    });

  }

  if (status) {

    lista = lista.filter(usuario =>
      String(usuario.status).toUpperCase() === status
    );

  }

  if (perfil) {

    lista = lista.filter(usuario =>
      String(usuario.perfil).toUpperCase() === perfil
    );

  }

  renderizarUsuarios(lista);
}

/* =========================
   CONSULTOR / PROCESSOS
========================= */

function abrirModalConsultor() {

  const perfil =
    String(usuarioLogado?.perfil || '').toUpperCase();

  const titulo =
    document.getElementById('tituloModalConsultor');

  const botao =
    document.getElementById('btnSalvarConsultor');

  if (perfil === 'REGIONAL') {

    titulo.innerText =
      'Solicitar Cadastro de Consultor';

    botao.innerText =
      'Enviar solicitação de Cadastro';

  } else {

    titulo.innerText =
      'Cadastrar Consultor';

    botao.innerText =
      'Cadastrar Consultor';

  }

  document.getElementById('consultorNome').value = '';
  document.getElementById('consultorEmail').value = '';
  document.getElementById('consultorTelefone').value = '';
  document.getElementById('consultorObservacao').value = '';

  preencherSelectConsultorCooperativas();

  const regional =
    document.getElementById('consultorRegional');

  if (usuarioEhRegional()) {

    regional.value =
      usuarioLogado.nome || '';

    regional.readOnly = true;

  } else {

    regional.value = '';
    regional.readOnly = false;

  }

  abrirModal('modalConsultor');
}

async function salvarConsultor(event) {

  event.preventDefault();

  const perfil =
    String(usuarioLogado?.perfil || '').toUpperCase();

  const status =
    perfil === 'REGIONAL'
      ? 'PENDENTE'
      : 'CADASTRO REALIZADO';

  const payload = {

    action: 'salvarConsultor',

    solicitante_id:
      usuarioLogado?.id || '',

    solicitante_nome:
      usuarioLogado?.nome || '',

    solicitante_perfil:
      usuarioLogado?.perfil || '',

    nome:
      document.getElementById('consultorNome').value.trim(),

    email:
      document.getElementById('consultorEmail').value.trim(),

    telefone:
      document.getElementById('consultorTelefone').value.trim(),

    cooperativa_id:
      document.getElementById('consultorCooperativa').value,

    regional:
      document.getElementById('consultorRegional').value.trim(),

    observacao:
      document.getElementById('consultorObservacao').value.trim(),

    status

  };

  try {

    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message);
      return;
    }

    alert(resultado.message);

    fecharModal('modalConsultor');

    carregarConsultores();

  } catch (erro) {

    console.error(erro);
    alert('Erro ao salvar processo.');

  }

}

async function carregarConsultores() {

  try {

    const resultado = await apiPost({
      action: 'listarConsultores',
      perfil: usuarioLogado?.perfil || '',
      cooperativa_id: usuarioLogado?.cooperativa_id || ''
    });

    if (!resultado.success) {
      alert(resultado.message);
      return;
    }

    consultoresCache =
      resultado.consultores || [];

    renderizarProcessos(consultoresCache);

  } catch (erro) {

    console.error(erro);

  }

}

function renderizarProcessos(lista) {

  const tbody =
    document.getElementById('tabelaProcessosBody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-table">
          Nenhum processo encontrado.
        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(item => {

    const tr = document.createElement('tr');

    let statusClass = 'status pendente';

    const status =
      String(item.status || '').toUpperCase();

    if (status === 'CADASTRO REALIZADO') {
      statusClass = 'status ativo';
    }

    if (status === 'RECUSADO') {
      statusClass = 'status inativo';
    }

    tr.innerHTML = `
      <td>
        <strong>${item.nome || '-'}</strong>
        <small>${item.email || '-'}</small>
      </td>

      <td>
        ${obterNomeCooperativa(item.cooperativa_id)}
      </td>

      <td>
        ${item.regional || '-'}
      </td>

      <td>
        <span class="${statusClass}">
          ${item.status || '-'}
        </span>
      </td>

      <td>
        ${formatarData(item.data_solicitacao)}
      </td>

      <td>
        ${item.observacao || '-'}
      </td>

      <td class="acoes">

        ${
          usuarioEhAdmin()
            ? `
              <button onclick="atualizarStatusProcesso('${item.id}', 'CADASTRO REALIZADO')">
                Concluir
              </button>

              <button onclick="atualizarStatusProcesso('${item.id}', 'PENDENTE')">
                Pendente
              </button>

              <button class="danger" onclick="atualizarStatusProcesso('${item.id}', 'RECUSADO')">
                Recusar
              </button>
            `
            : `
              <button disabled>
                Acompanhar
              </button>
            `
        }

      </td>
    `;

    tbody.appendChild(tr);

  });

}

async function atualizarStatusProcesso(id, status) {

  const observacao = prompt(
    'Observação administrativa (opcional):'
  );

  try {

    const resultado = await apiPost({

      action: 'atualizarStatusConsultor',

      id,
      status,

      observacao:
        observacao || '',

      atualizado_por:
        usuarioLogado?.nome || ''

    });

    if (!resultado.success) {
      alert(resultado.message);
      return;
    }

    alert(resultado.message);

    carregarConsultores();

  } catch (erro) {

    console.error(erro);

  }

}

/* =========================
   COOPERATIVAS
========================= */

async function carregarCooperativas() {

  try {

    const resultado = await apiPost({
      action: 'listarCooperativas'
    });

    if (!resultado.success) return;

    cooperativasCache =
      resultado.cooperativas || [];

    renderizarCooperativas(cooperativasCache);

    preencherSelectCooperativas();
    preencherSelectConsultorCooperativas();

  } catch (erro) {

    console.error(erro);

  }

}

function renderizarCooperativas(lista) {

  const tbody =
    document.getElementById('tabelaCooperativasBody');

  tbody.innerHTML = '';

  if (!lista.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          Nenhuma cooperativa encontrada.
        </td>
      </tr>
    `;

    return;
  }

  lista.forEach(coop => {

    const tr = document.createElement('tr');

    const statusClass =
      String(coop.status).toUpperCase() === 'ATIVA'
        ? 'status ativo'
        : 'status inativo';

    tr.innerHTML = `
      <td>
        <strong>${coop.nome_cooperativa || '-'}</strong>
      </td>

      <td>${coop.regional_responsavel || '-'}</td>

      <td>${coop.cidade || '-'}</td>

      <td>
        <span class="${statusClass}">
          ${coop.status || '-'}
        </span>
      </td>

      <td class="acoes">
        <button disabled>Editar</button>
      </td>
    `;

    tbody.appendChild(tr);

  });

}

function preencherSelectCooperativas() {

  const select =
    document.getElementById('usuarioCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione uma cooperativa</option>';

  cooperativasCache.forEach(coop => {

    const option =
      document.createElement('option');

    option.value = coop.id;

    option.textContent =
      coop.nome_cooperativa || coop.nome;

    select.appendChild(option);

  });

}

function preencherSelectConsultorCooperativas() {

  const select =
    document.getElementById('consultorCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione a cooperativa</option>';

  let lista = [...cooperativasCache];

  if (usuarioEhRegional()) {

    const coopUsuario =
      String(usuarioLogado?.cooperativa_id || '');

    lista = lista.filter(coop =>
      String(coop.id) === coopUsuario
    );

  }

  lista.forEach(coop => {

    const option =
      document.createElement('option');

    option.value = coop.id;

    option.textContent =
      coop.nome_cooperativa || coop.nome;

    select.appendChild(option);

  });

}

function obterNomeCooperativa(id) {

  if (!id) return '-';

  const coop = cooperativasCache.find(c =>
    String(c.id) === String(id)
  );

  return coop
    ? coop.nome_cooperativa
    : id;
}

/* =========================
   MODAIS
========================= */

function abrirModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.style.display = 'flex';
  }

}

function fecharModal(id) {

  const modal =
    document.getElementById(id);

  if (modal) {
    modal.style.display = 'none';
  }

}

/* =========================
   UTIL
========================= */

function setTexto(id, valor) {

  const el =
    document.getElementById(id);

  if (el) {
    el.innerText = valor;
  }

}

function formatarData(valor) {

  if (!valor) return '-';

  try {

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleString('pt-BR');

  } catch (erro) {

    return valor;

  }

}

function copiarLinkContrato() {

  const input =
    document.getElementById('linkContratoZap');

  input.select();
  input.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(input.value);

  alert('Link copiado com sucesso.');
}

/* =========================
   PLACEHOLDERS
========================= */

function abrirModalNovoUsuario() {
  abrirModal('modalUsuario');
}

function abrirModalEditarUsuario(id) {
  abrirModal('modalUsuario');
}

function salvarUsuario(event) {
  event.preventDefault();
}

function alterarStatusUsuario(id) {}

function confirmarExclusaoUsuario(id, nome) {}

function abrirModalNovaCooperativa() {
  abrirModal('modalCooperativa');
}

function salvarCooperativa(event) {
  event.preventDefault();
}

async function carregarPalavraChave() {

  try {

    const resultado = await apiPost({
      action: 'buscarPalavraChave'
    });

    if (!resultado.success) return;

    setTexto(
      'palavraChaveDia',
      resultado.palavra || '---'
    );

  } catch (erro) {

    console.error(erro);

  }

}
