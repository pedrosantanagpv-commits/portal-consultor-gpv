const API = "/api/proxy";

// Variável global para busca instantânea sem novas chamadas de API
let usuariosLocal = [];

async function apiPost(payload) {
  const resposta = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await resposta.json();
}

/* LOGIN */

async function login() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const resultado = document.getElementById("resultado");

  if (!email || !senha) {
    resultado.innerHTML = "Informe email e senha.";
    return;
  }

  resultado.innerHTML = "Entrando...";

  try {
    const dados = await apiPost({ acao: "login", email, senha });

    if (dados.status === "success") {
      localStorage.setItem("usuario", JSON.stringify(dados));
      carregarPainel(dados);
      abrirPagina("inicio");
    } else {
      resultado.innerHTML = dados.message || "Erro ao fazer login.";
    }
  } catch (erro) {
    resultado.innerHTML = "Erro ao conectar com a API.";
    console.log(erro);
  }
}

function carregarPainel(usuario) {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("painel").style.display = "block";
  document.getElementById("usuarioNome").innerHTML = usuario.nome;
  document.getElementById("usuarioPerfil").innerHTML = usuario.perfil;

  const menuAdmin = document.getElementById("menuAdmin");
  if (usuario.perfil !== "SUPER_ADMIN" && usuario.perfil !== "ADMINISTRATIVO") {
    menuAdmin.style.display = "none";
  } else {
    menuAdmin.style.display = "block";
  }
}

function logout() {
  localStorage.removeItem("usuario");
  location.reload();
}

window.onload = function () {
  const usuario = localStorage.getItem("usuario");
  if (usuario) {
    carregarPainel(JSON.parse(usuario));
    abrirPagina("inicio");
  }
};

function usuarioAdmin() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  return usuario && (usuario.perfil === "SUPER_ADMIN" || usuario.perfil === "ADMINISTRATIVO");
}

/* ROTAS */

function abrirPagina(pagina) {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (pagina === "inicio") {
    if (usuario.perfil === "CONSULTOR") {
      conteudo.innerHTML = `
        <h1>Painel do Consultor</h1>
        <div class="card"><h3>Minha Cooperativa</h3><p>${usuario.cooperativa}</p></div>
        <div class="card"><h3>Comunicados</h3><p>Nenhum comunicado disponível.</p></div>
        <div class="card"><h3>Conteúdos Recentes</h3><p>Nenhum conteúdo disponível.</p></div>
      `;
    } else if (usuario.perfil === "REGIONAL") {
      conteudo.innerHTML = `
        <h1>Painel Regional</h1>
        <div class="card"><h3>Cooperativa</h3><p>${usuario.cooperativa}</p></div>
        <div class="card"><h3>Consultores</h3><p>Em breve...</p></div>
        <div class="card"><h3>Comunicados</h3><p>Nenhum comunicado disponível.</p></div>
      `;
    } else {
      carregarDashboardAdmin();
    }
  }

  if (pagina === "usuarios") {
    if (!usuarioAdmin()) {
      conteudo.innerHTML = `<div class="card">Acesso não permitido.</div>`;
      return;
    }
    telaUsuarios();
  }

  if (pagina === "cooperativas") {
    if (!usuarioAdmin()) {
      conteudo.innerHTML = `<div class="card">Acesso não permitido.</div>`;
      return;
    }
    telaCooperativas();
  }

  if (pagina === "conteudos") {
    conteudo.innerHTML = `<h1>Conteúdos</h1><div class="card">Área de conteúdos e procedimentos.</div>`;
  }
}

/* DASHBOARD PRINCIPAL */

async function carregarDashboardAdmin() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <h1>Painel Administrativo</h1>
    <div class="grid-dashboard">
      <div class="card-dashboard"><h2 id="totalUsuarios">0</h2><p>Usuários</p></div>
      <div class="card-dashboard"><h2 id="usuariosAtivos">0</h2><p>Usuários Ativos</p></div>
      <div class="card-dashboard"><h2 id="consultores">0</h2><p>Consultores</p></div>
      <div class="card-dashboard"><h2 id="regionais">0</h2><p>Regionais</p></div>
      <div class="card-dashboard"><h2 id="cooperativas">0</h2><p>Cooperativas</p></div>
    </div>
  `;

  try {
    const dados = await apiPost({ acao: "dashboardAdmin" });
    if (dados.status === "success") {
      document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
      document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
      document.getElementById("consultores").innerText = dados.totalConsultores;
      document.getElementById("regionais").innerText = dados.totalRegionais;
      document.getElementById("cooperativas").innerText = dados.totalCooperativas;
    }
  } catch (erro) { console.log(erro); }
}

/* MÓDULO DE USUÁRIOS (COM BUSCA E DASHBOARD INTERNO) */

function telaUsuarios() {
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Gerenciamento de Usuários</h1>

    <!-- Mini Dashboard Interno -->
    <div class="grid-dashboard" style="margin-bottom: 20px; grid-template-columns: repeat(3, 1fr);">
      <div class="card-dashboard"><h2 id="dashTotal">0</h2><p>Total</p></div>
      <div class="card-dashboard"><h2 id="dashAtivos" style="color: #2ecc71;">0</h2><p>Ativos</p></div>
      <div class="card-dashboard"><h2 id="dashInativos" style="color: #e74c3c;">0</h2><p>Inativos</p></div>
    </div>

    <div class="card">
      <div class="submenu">
        <button onclick="mostrarCriarUsuario()">+ Novo Usuário</button>
        <button onclick="carregarUsuarios()" class="btn-secundario">🔄 Listar/Atualizar</button>
      </div>

      <!-- Barra de Busca e Filtro -->
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <input type="text" id="buscaUsuario" placeholder="🔍 Buscar por nome ou email..." onkeyup="filtrarUsuarios()" style="flex: 2;">
        <select id="filtroStatus" onchange="filtrarUsuarios()" style="flex: 1;">
          <option value="TODOS">Todos os Status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
        </select>
      </div>

      <div id="usuariosConteudo" class="area-interna" style="margin-top: 20px;">
        <div id="listaUsuarios"><p style="text-align:center;">Clique em "Listar/Atualizar" para ver os dados.</p></div>
      </div>
    </div>
  `;
}

async function carregarUsuarios() {
  const lista = document.getElementById("listaUsuarios");
  lista.innerHTML = `<div class="card">Carregando usuários da nuvem...</div>`;

  try {
    const dados = await apiPost({ acao: "listarUsuarios" });

    if (dados.status === "success") {
      usuariosLocal = dados.usuarios; // Salva na memória global para busca instantânea
      renderizarLista(usuariosLocal);
      atualizarMiniDash(usuariosLocal);
    }
  } catch (erro) {
    lista.innerHTML = `<div class="card">Erro de conexão com API.</div>`;
    console.log(erro);
  }
}

// Função responsável por desenhar os cards na tela
function renderizarLista(lista) {
  const listaDiv = document.getElementById("listaUsuarios");
  let html = "";

  if (lista.length === 0) {
    listaDiv.innerHTML = "<p>Nenhum usuário encontrado.</p>";
    return;
  }

  lista.forEach(u => {
    html += `
      <div class="card card-usuario-item">
        <h3>${u.nome || "Sem nome"}</h3>
        <p><strong>E-mail:</strong> ${u.email || "Sem email"}</p>
        <p><strong>Perfil:</strong> ${u.perfil} | <strong>Coop:</strong> ${u.cooperativa}</p>
        <p><strong>Status:</strong> ${u.status}</p>

        <div style="display:flex; gap:5px; margin-top:10px;">
          <button onclick='abrirModalEditar("${u.nome}","${u.email}","${u.perfil}","${u.cooperativa}","${u.status}")'>Editar</button>
          <button onclick="confirmarExclusao('${u.id}', '${u.nome}')" class="btn-perigo">Excluir</button>
          ${u.status === "ATIVO" 
            ? `<button class="btn-secundario" onclick="alterarStatus('${u.id}', 'INATIVO')">Inativar</button>` 
            : `<button onclick="alterarStatus('${u.id}', 'ATIVO')">Ativar</button>`
          }
        </div>
      </div>
    `;
  });
  listaDiv.innerHTML = html;
}

function filtrarUsuarios() {
  const termo = document.getElementById("buscaUsuario").value.toLowerCase();
  const statusFiltro = document.getElementById("filtroStatus").value;

  const filtrados = usuariosLocal.filter(u => {
    const correspondeBusca = u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo);
    const correspondeStatus = (statusFiltro === "TODOS" || u.status === statusFiltro);
    return correspondeBusca && correspondeStatus;
  });

  renderizarLista(filtrados);
}

function atualizarMiniDash(lista) {
  document.getElementById("dashTotal").innerText = lista.length;
  document.getElementById("dashAtivos").innerText = lista.filter(u => u.status === "ATIVO").length;
  document.getElementById("dashInativos").innerText = lista.filter(u => u.status === "INATIVO").length;
}

/* CRIAÇÃO E EDIÇÃO */

async function mostrarCriarUsuario() {
  const area = document.getElementById("usuariosConteudo");
  area.innerHTML = `
    <div class="card">
      <h3>Novo Usuário</h3>
      <input type="text" id="novoNome" placeholder="Nome">
      <input type="email" id="novoEmail" placeholder="Email">
      <input type="password" id="novaSenha" placeholder="Senha">
      <select id="novaCooperativa"><option>Carregando...</option></select>
      <select id="novoPerfil">
        <option value="CONSULTOR">CONSULTOR</option>
        <option value="REGIONAL">REGIONAL</option>
        <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
      </select>
      <button onclick="criarUsuario()">Finalizar Cadastro</button>
      <button onclick="telaUsuarios()" class="btn-secundario">Cancelar</button>
      <div id="retornoCadastro"></div>
    </div>
  `;
  carregarSelectCooperativas();
}

async function criarUsuario() {
  const nome = document.getElementById("novoNome").value.trim();
  const email = document.getElementById("novoEmail").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const perfil = document.getElementById("novoPerfil").value;
  const cooperativa = document.getElementById("novaCooperativa").value;
  const retorno = document.getElementById("retornoCadastro");

  if (!nome || !email || !senha || !perfil || !cooperativa) {
    retorno.innerHTML = "Preencha todos os campos.";
    return;
  }

  retorno.innerHTML = "Criando...";
  try {
    const dados = await apiPost({ acao: "criarUsuario", nome, email, senha, perfil, cooperativa });
    if (dados.status === "success") {
       alert("Usuário criado!");
       carregarUsuarios();
       telaUsuarios();
    } else { retorno.innerHTML = dados.message; }
  } catch (erro) { console.log(erro); }
}

async function alterarStatus(id, status) {
  try {
    const dados = await apiPost({ acao: "alterarStatusUsuario", id, status });
    alert(dados.message);
    carregarUsuarios();
  } catch (erro) { alert("Erro ao alterar status."); }
}

async function carregarSelectCooperativas() {
  const select = document.getElementById("novaCooperativa");
  if (!select) return;
  try {
    const dados = await apiPost({ acao: "listarCooperativas" });
    if (dados.status === "success") {
      let options = `<option value="">Selecione a Cooperativa</option>`;
      dados.cooperativas.forEach(coop => { options += `<option value="${coop.nome}">${coop.nome}</option>`; });
      select.innerHTML = options;
    }
  } catch (erro) { console.log(erro); }
}

/* COOPERATIVAS */

function telaCooperativas() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <h1>Cooperativas</h1>
    <div class="card">
      <div class="submenu">
        <button onclick="mostrarCriarCooperativa()">Criar Cooperativa</button>
        <button onclick="mostrarGerenciarCooperativas()" class="btn-secundario">Gerenciar Cooperativas</button>
      </div>
      <div id="cooperativasConteudo" class="area-interna"></div>
    </div>
  `;
}

function mostrarCriarCooperativa() {
  const area = document.getElementById("cooperativasConteudo");
  area.innerHTML = `
    <input type="text" id="coopNome" placeholder="Nome da Cooperativa">
    <input type="text" id="coopRegional" placeholder="Regional Responsável">
    <input type="text" id="coopCidade" placeholder="Cidade">
    <button onclick="criarCooperativa()">Criar Cooperativa</button>
    <div id="retornoCooperativa"></div>
  `;
}

function mostrarGerenciarCooperativas() {
  const area = document.getElementById("cooperativasConteudo");
  area.innerHTML = `<div id="listaCooperativas"></div>`;
  carregarCooperativas();
}

async function carregarCooperativas() {
  const lista = document.getElementById("listaCooperativas");
  lista.innerHTML = `<div class="card">Carregando cooperativas...</div>`;
  try {
    const dados = await apiPost({ acao: "listarCooperativas" });
    if (dados.status === "success") {
      let html = "";
      dados.cooperativas.forEach(coop => {
        html += `
          <div class="card">
            <h3>${coop.nome}</h3>
            <p>Regional: ${coop.regional} | Cidade: ${coop.cidade}</p>
            <p>Status: ${coop.status} | Usuários: ${coop.totalUsuarios || 0}</p>
          </div>`;
      });
      lista.innerHTML = html;
    }
  } catch (erro) { console.log(erro); }
}

async function criarCooperativa() {
  const nome = document.getElementById("coopNome").value.trim();
  const regional = document.getElementById("coopRegional").value.trim();
  const cidade = document.getElementById("coopCidade").value.trim();
  const retorno = document.getElementById("retornoCooperativa");

  if (!nome || !regional || !cidade) {
    retorno.innerHTML = "Preencha tudo.";
    return;
  }

  try {
    const dados = await apiPost({ acao: "criarCooperativa", nome, regional, cidade });
    retorno.innerHTML = dados.message;
    if (dados.status === "success") mostrarGerenciarCooperativas();
  } catch (erro) { console.log(erro); }
}

/* MODAL EDITAR */

function abrirModalEditar(nome, email, perfil, cooperativa, status) {
  fecharModalEditar();
  const modal = document.createElement("div");
  modal.id = "modalEditar";
  modal.innerHTML = `
    <div class="modal-box">
      <h2>Editar Usuário</h2>
      <input type="text" id="editNome" value="${nome}">
      <input type="email" id="editEmail" value="${email}" disabled>
      <select id="editPerfil">
        <option value="CONSULTOR">CONSULTOR</option>
        <option value="REGIONAL">REGIONAL</option>
        <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
      </select>
      <select id="editCooperativa"><option>Carregando...</option></select>
      <select id="editStatus">
        <option value="ATIVO">ATIVO</option>
        <option value="INATIVO">INATIVO</option>
      </select>
      <button onclick="salvarEdicaoUsuario()">Salvar Alterações</button>
      <button class="btn-secundario" onclick="fecharModalEditar()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("editPerfil").value = perfil;
  document.getElementById("editStatus").value = status;
  carregarCooperativasEdicao(cooperativa);
}

function fecharModalEditar() {
  const modal = document.getElementById("modalEditar");
  if (modal) modal.remove();
}

async function salvarEdicaoUsuario() {
  const nome = document.getElementById("editNome").value.trim();
  const email = document.getElementById("editEmail").value.trim();
  const perfil = document.getElementById("editPerfil").value;
  const cooperativa = document.getElementById("editCooperativa").value;
  const status = document.getElementById("editStatus").value;

  try {
    const dados = await apiPost({ acao: "editarUsuario", nome, email, perfil, cooperativa, status });
    if (dados.status === "success") {
      alert("Sucesso!");
      fecharModalEditar();
      carregarUsuarios();
      carregarDashboardAdmin();
    } else { alert(dados.message); }
  } catch (erro) { alert("Erro de conexão."); }
}

async function carregarCooperativasEdicao(selecionada) {
  try {
    const dados = await apiPost({ acao: "listarCooperativas" });
    const select = document.getElementById("editCooperativa");
    select.innerHTML = "";
    dados.cooperativas.forEach(coop => {
      const opt = document.createElement("option");
      opt.value = coop.nome;
      opt.textContent = coop.nome;
      if (coop.nome === selecionada) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (erro) { console.log(erro); }
}

/* EXCLUSÃO */

async function confirmarExclusao(id, nome) {
  if (confirm(`Deseja excluir permanentemente o usuário ${nome}?`)) {
    try {
      const dados = await apiPost({ acao: "excluirUsuario", id });
      if (dados.status === "success") {
        alert(dados.message);
        carregarUsuarios();
        carregarDashboardAdmin();
      } else { alert("Erro: " + dados.message); }
    } catch (erro) { alert("Erro ao excluir."); }
  }
}
