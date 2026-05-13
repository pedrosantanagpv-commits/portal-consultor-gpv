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

  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value.trim();

  if (!email || !senha) {
    alert('Preencha e-mail e senha.');
    return;
  }

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
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  const btnCadastro = document.getElementById('btnCadastroConsultor');
  const menuProcessos = document.querySelector('[data-aba="processos"]');

  if (perfil === 'CONSULTOR') {
    if (btnCadastro) btnCadastro.style.display = 'none';
    if (menuProcessos) menuProcessos.style.display = 'none';
    return;
  }

  if (btnCadastro) {
    btnCadastro.style.display = 'block';
    btnCadastro.innerText = 'Solicitar Cadastro de Consultor';
  }

  if (menuProcessos) {
    menuProcessos.style.display = 'block';
  }
}

function usuarioEhAdmin() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  return (
    perfil === 'SUPER_ADMIN' ||
    perfil === 'ADMINISTRATIVO'
  );
}

function usuarioEhRegional() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();
  return perfil === 'REGIONAL';
}

function podeSolicitarCadastroConsultor() {
  const perfil = String(usuarioLogado?.perfil || '').toUpperCase();

  return (
    perfil === 'SUPER_ADMIN' ||
    perfil === 'ADMINISTRATIVO' ||
    perfil === 'REGIONAL'
  );
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

  const secao = document.getElementById(`secao-${aba}`);
  if (secao) secao.style.display = 'block';

  const menu = document.querySelector(`[data-aba="${aba}"]`);
  if (menu) menu.classList.add('active');

  if (aba === 'inicio') carregarDashboard();

  if (aba === 'usuarios') {
    carregarUsuarios();
    carregarCooperativas();
  }

  if (aba === 'cooperativas') carregarCooperativas();

  if (aba === 'central') carregarPalavraChave();

  if (aba === 'processos') carregarConsultores();
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
      alert(resultado.message || 'Erro ao carregar usuários.');
      return;
    }

    usuariosCache = resultado.usuarios || [];

    renderizarUsuarios(usuariosCache);
    atualizarMiniDashboardUsuarios(usuariosCache);

  } catch (erro) {
    console.error(erro);
    alert('Erro ao carregar usuários.');
  }
}

function renderizarUsuarios(lista) {
  const tbody = document.getElementById('tabelaUsuariosBody');
  if (!tbody) return;

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

    const statusTexto = String(usuario.status || '').toUpperCase();

    const statusClass = statusTexto === 'ATIVO'
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

      <td>${obterNomeCooperativa(usuario.cooperativa_id)}</td>

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
          ${statusTexto === 'ATIVO' ? 'Inativar' : 'Ativar'}
        </button>

        <button
          class="danger"
          onclick="confirmarExclusaoUsuario('${usuario.id}', '${usuario.nome || ''}')"
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
    lista.filter(u => String(u.status || '').toUpperCase() === 'ATIVO').length
  );

  setTexto(
    'miniUsuariosInativos',
    lista.filter(u => String(u.status || '').toUpperCase() === 'INATIVO').length
  );

  setTexto(
    'miniAdmins',
    lista.filter(u => {
      const perfil = String(u.perfil || '').toUpperCase();
      return perfil === 'SUPER_ADMIN' || perfil === 'ADMINISTRATIVO';
    }).length
  );

  setTexto(
    'miniRegionais',
    lista.filter(u => String(u.perfil || '').toUpperCase() === 'REGIONAL').length
  );

  setTexto(
    'miniConsultores',
    lista.filter(u => String(u.perfil || '').toUpperCase() === 'CONSULTOR').length
  );
}

function filtrarUsuarios() {
  const busca = document.getElementById('buscaUsuario')?.value.toLowerCase() || '';
  const status = document.getElementById('filtroStatusUsuario')?.value || '';
  const perfil = document.getElementById('filtroPerfilUsuario')?.value || '';

  let lista = [...usuariosCache];

  if (busca) {
    lista = lista.filter(usuario => {
      const nome = String(usuario.nome || '').toLowerCase();
      const email = String(usuario.email || '').toLowerCase();
      const coop = String(obterNomeCooperativa(usuario.cooperativa_id) || '').toLowerCase();

      return (
        nome.includes(busca) ||
        email.includes(busca) ||
        coop.includes(busca)
      );
    });
  }

  if (status) {
    lista = lista.filter(usuario =>
      String(usuario.status || '').toUpperCase() === status
    );
  }

  if (perfil) {
    lista = lista.filter(usuario =>
      String(usuario.perfil || '').toUpperCase() === perfil
    );
  }

  renderizarUsuarios(lista);
}

/* =========================
   MODAL USUÁRIOS
========================= */

function abrirModalNovoUsuario() {
  document.getElementById('modalUsuarioTitulo').innerText = 'Novo Usuário';

  document.getElementById('usuarioId').value = '';
  document.getElementById('usuarioNome').value = '';
  document.getElementById('usuarioEmail').value = '';
  document.getElementById('usuarioSenha').value = '';
  document.getElementById('usuarioPerfil').value = 'CONSULTOR';
  document.getElementById('usuarioCooperativa').value = '';
  document.getElementById('usuarioPermissoes').value = '';
  document.getElementById('usuarioStatus').value = 'ATIVO';

  preencherSelectCooperativas();

  abrirModal('modalUsuario');
}

function abrirModalEditarUsuario(id) {
  const usuario = usuariosCache.find(u => String(u.id) === String(id));

  if (!usuario) {
    alert('Usuário não encontrado.');
    return;
  }

  document.getElementById('modalUsuarioTitulo').innerText = 'Editar Usuário';

  document.getElementById('usuarioId').value = usuario.id || '';
  document.getElementById('usuarioNome').value = usuario.nome || '';
  document.getElementById('usuarioEmail').value = usuario.email || '';
  document.getElementById('usuarioSenha').value = '';
  document.getElementById('usuarioPerfil').value = usuario.perfil || 'CONSULTOR';
  document.getElementById('usuarioCooperativa').value = usuario.cooperativa_id || '';
  document.getElementById('usuarioPermissoes').value = usuario.permissoes || '';
  document.getElementById('usuarioStatus').value = usuario.status || 'ATIVO';

  preencherSelectCooperativas(usuario.cooperativa_id);

  abrirModal('modalUsuario');
}

async function salvarUsuario(event) {
  event.preventDefault();

  const id = document.getElementById('usuarioId').value.trim();

  const payload = {
    action: id ? 'editarUsuario' : 'salvarUsuario',
    id,
    nome: document.getElementById('usuarioNome').value.trim(),
    email: document.getElementById('usuarioEmail').value.trim(),
    senha: document.getElementById('usuarioSenha').value.trim(),
    perfil: document.getElementById('usuarioPerfil').value,
    cooperativa_id: document.getElementById('usuarioCooperativa').value,
    permissoes: document.getElementById('usuarioPermissoes').value.trim(),
    status: document.getElementById('usuarioStatus').value
  };

  if (!payload.nome || !payload.email || !payload.perfil) {
    alert('Preencha nome, e-mail e perfil.');
    return;
  }

  try {
    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao salvar usuário.');
      return;
    }

    alert(resultado.message || 'Usuário salvo com sucesso.');

    fecharModal('modalUsuario');
    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao salvar usuário.');
  }
}

async function alterarStatusUsuario(id) {
  try {
    const resultado = await apiPost({
      action: 'alterarStatusUsuario',
      id
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao alterar status.');
      return;
    }

    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao alterar status.');
  }
}

function confirmarExclusaoUsuario(id, nome) {
  const confirmar = confirm(
    `Tem certeza que deseja excluir o usuário "${nome}"?\n\nEssa ação não poderá ser desfeita.`
  );

  if (!confirmar) return;

  excluirUsuario(id);
}

async function excluirUsuario(id) {
  try {
    const resultado = await apiPost({
      action: 'excluirUsuario',
      id
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao excluir usuário.');
      return;
    }

    alert(resultado.message || 'Usuário excluído com sucesso.');

    carregarUsuarios();
    carregarDashboard();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao excluir usuário.');
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

    cooperativasCache = resultado.cooperativas || [];

    renderizarCooperativas(cooperativasCache);
    preencherSelectCooperativas();
    preencherSelectConsultorCooperativas();

  } catch (erro) {
    console.error(erro);
  }
}

function renderizarCooperativas(lista) {
  const tbody = document.getElementById('tabelaCooperativasBody');
  if (!tbody) return;

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

    const statusTexto = String(coop.status || '').toUpperCase();

    const statusClass =
      statusTexto === 'ATIVA' || statusTexto === 'ATIVO'
        ? 'status ativo'
        : 'status inativo';

    tr.innerHTML = `
      <td>
        <strong>${coop.nome_cooperativa || coop.nome || '-'}</strong>
        <small>${coop.id || ''}</small>
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

function abrirModalNovaCooperativa() {
  document.getElementById('coopNome').value = '';
  document.getElementById('coopRegional').value = '';
  document.getElementById('coopCidade').value = '';
  document.getElementById('coopStatus').value = 'ATIVA';

  abrirModal('modalCooperativa');
}

async function salvarCooperativa(event) {
  event.preventDefault();

  const payload = {
    action: 'criarCooperativa',
    nome_cooperativa: document.getElementById('coopNome').value.trim(),
    regional_responsavel: document.getElementById('coopRegional').value.trim(),
    cidade: document.getElementById('coopCidade').value.trim(),
    status: document.getElementById('coopStatus').value
  };

  if (!payload.nome_cooperativa || !payload.regional_responsavel || !payload.cidade) {
    alert('Preencha nome da cooperativa, regional responsável e cidade.');
    return;
  }

  try {
    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao salvar cooperativa.');
      return;
    }

    alert(resultado.message || 'Cooperativa cadastrada com sucesso.');

    fecharModal('modalCooperativa');
    carregarCooperativas();
    carregarDashboard();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao salvar cooperativa.');
  }
}

function preencherSelectCooperativas(valorSelecionado = '') {
  const select = document.getElementById('usuarioCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione uma cooperativa</option>';

  cooperativasCache.forEach(coop => {
    const option = document.createElement('option');

    option.value = coop.id;
    option.textContent = coop.nome_cooperativa || coop.nome || coop.id;

    if (String(coop.id) === String(valorSelecionado)) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

function preencherSelectConsultorCooperativas(valorSelecionado = '') {
  const select = document.getElementById('consultorCooperativa');

  if (!select) return;

  select.innerHTML =
    '<option value="">Selecione a cooperativa</option>';

  let lista = [...cooperativasCache];

  if (usuarioEhRegional()) {
    const coopUsuario = String(usuarioLogado?.cooperativa_id || '').trim();

    lista = lista.filter(coop =>
      String(coop.id) === coopUsuario ||
      String(coop.nome_cooperativa || '').toLowerCase() === coopUsuario.toLowerCase()
    );
  }

  lista.forEach(coop => {
    const option = document.createElement('option');

    option.value = coop.id;
    option.textContent = coop.nome_cooperativa || coop.nome || coop.id;

    if (String(coop.id) === String(valorSelecionado)) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}

function obterNomeCooperativa(id) {
  if (!id) return '-';

  const valor = String(id).trim();

  if (
    valor.toUpperCase() === 'TODAS' ||
    valor.toLowerCase() === 'todas'
  ) {
    return 'Todas';
  }

  const coop = cooperativasCache.find(c =>
    String(c.id) === valor ||
    String(c.nome_cooperativa || '').toLowerCase() === valor.toLowerCase()
  );

  return coop ? (coop.nome_cooperativa || coop.nome) : valor;
}

/* =========================
   CENTRAL DO CONSULTOR
========================= */

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

function abrirModalConsultor() {
  if (!podeSolicitarCadastroConsultor()) {
    alert('Você não tem permissão para realizar essa ação.');
    return;
  }

  const titulo = document.getElementById('tituloModalConsultor');
  const botao = document.getElementById('btnSalvarConsultor');

  if (titulo) {
    titulo.innerText = 'Solicitar Cadastro de Consultor';
  }

  if (botao) {
    botao.innerText = 'Enviar solicitação de Cadastro';
  }

  document.getElementById('consultorNome').value = '';
  document.getElementById('consultorEmail').value = '';
  document.getElementById('consultorTelefone').value = '';
  document.getElementById('consultorObservacao').value = '';

  const linkZap = document.getElementById('linkContratoZap');
  if (linkZap) linkZap.value = LINK_CONTRATO_ZAPSIGN;

  preencherSelectConsultorCooperativas();

  const regional = document.getElementById('consultorRegional');

  if (usuarioEhRegional()) {
    regional.value = usuarioLogado.nome || '';
    regional.readOnly = true;
  } else {
    regional.value = '';
    regional.readOnly = false;
  }

  abrirModal('modalConsultor');
}

async function salvarConsultor(event) {
  event.preventDefault();

  if (!podeSolicitarCadastroConsultor()) {
    alert('Você não tem permissão para realizar essa ação.');
    return;
  }

  const payload = {
    action: 'salvarConsultor',
    solicitante_id: usuarioLogado?.id || '',
    solicitante_nome: usuarioLogado?.nome || '',
    solicitante_perfil: usuarioLogado?.perfil || '',
    nome: document.getElementById('consultorNome').value.trim(),
    email: document.getElementById('consultorEmail').value.trim(),
    telefone: document.getElementById('consultorTelefone').value.trim(),
    cooperativa_id: document.getElementById('consultorCooperativa').value,
    regional: document.getElementById('consultorRegional').value.trim(),
    observacao: document.getElementById('consultorObservacao').value.trim(),
    status: 'PENDENTE'
  };

  if (
    !payload.nome ||
    !payload.email ||
    !payload.telefone ||
    !payload.cooperativa_id ||
    !payload.regional
  ) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const resultado = await apiPost(payload);

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao enviar solicitação.');
      return;
    }

    alert(resultado.message || 'Solicitação enviada com sucesso.');

    fecharModal('modalConsultor');
    carregarConsultores();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao enviar solicitação.');
  }
}

function copiarLinkContrato() {
  const input = document.getElementById('linkContratoZap');

  if (!input) return;

  input.select();
  input.setSelectionRange(0, 99999);

  navigator.clipboard.writeText(input.value)
    .then(() => {
      alert('Link copiado com sucesso.');
    })
    .catch(() => {
      document.execCommand('copy');
      alert('Link copiado com sucesso.');
    });
}

/* =========================
   PROCESSOS ADMINISTRATIVOS
========================= */

async function carregarConsultores() {
  try {
    const resultado = await apiPost({
      action: 'listarConsultores',
      perfil: usuarioLogado?.perfil || '',
      cooperativa_id: usuarioLogado?.cooperativa_id || ''
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao carregar processos.');
      return;
    }

    consultoresCache = resultado.consultores || [];

    renderizarProcessos(consultoresCache);

  } catch (erro) {
    console.error(erro);
    alert('Erro ao carregar processos.');
  }
}

function renderizarProcessos(lista) {
  const tbody = document.getElementById('tabelaProcessosBody');

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

    const status = String(item.status || '').toUpperCase();

    let statusClass = 'status pendente';

    if (status === 'CADASTRO REALIZADO') {
      statusClass = 'status ativo';
    }

    if (status === 'RECUSADO') {
      statusClass = 'status inativo';
    }

    const acoes = usuarioEhAdmin()
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
      `;

    tr.innerHTML = `
      <td>
        <strong>${item.nome || '-'}</strong>
        <small>${item.email || '-'}</small>
        <small>${item.telefone || '-'}</small>
      </td>

      <td>${obterNomeCooperativa(item.cooperativa_id)}</td>

      <td>${item.regional || '-'}</td>

      <td>
        <span class="${statusClass}">
          ${item.status || '-'}
        </span>
      </td>

      <td>${formatarData(item.data_solicitacao)}</td>

      <td>${item.observacao || '-'}</td>

      <td class="acoes">
        ${acoes}
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function atualizarStatusProcesso(id, status) {
  const observacao = prompt(
    `Observação administrativa para "${status}" (opcional):`
  );

  try {
    const resultado = await apiPost({
      action: 'atualizarStatusConsultor',
      id,
      status,
      observacao: observacao || '',
      atualizado_por: usuarioLogado?.nome || ''
    });

    if (!resultado.success) {
      alert(resultado.message || 'Erro ao atualizar processo.');
      return;
    }

    alert(resultado.message || 'Processo atualizado com sucesso.');

    carregarConsultores();

  } catch (erro) {
    console.error(erro);
    alert('Erro ao atualizar processo.');
  }
}

/* =========================
   MODAIS
========================= */

function abrirModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.style.display = 'flex';
  }
}

function fecharModal(id) {
  const modal = document.getElementById(id);

  if (modal) {
    modal.style.display = 'none';
  }
}

/* =========================
   UTIL
========================= */

function setTexto(id, valor) {
  const el = document.getElementById(id);

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
