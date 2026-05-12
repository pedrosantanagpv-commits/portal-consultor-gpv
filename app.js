const API = "/api/proxy";

// Variáveis globais para busca instantânea
let usuariosLocal = [];
let cooperativasLocal = [];

async function apiPost(payload) {
  const resposta = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await resposta.json();
}

/* LOGIN E SESSÃO */

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

/* ROTAS E NAVEGAÇÃO */

function abrirPagina(pagina) {
  const conteudo = document.getElementById("conteudo");
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (pagina === "inicio") {
    if (usuario.perfil === "CONSULTOR") {
      conteudo.innerHTML = `
        <h1>Painel do Consultor</h1>
        <div class="card"><h3>Minha Cooperativa</h3><p>${usuario.cooperativa}</p></div>
        <div class="card"><h3>Comunicados</h3><p>Nenhum comunicado disponível.</p></div>
      `;
    } else if (usuario.perfil === "REGIONAL") {
      conteudo.innerHTML = `
        <h1>Painel Regional</h1>
        <div class="card"><h3>Cooperativa</h3><p>${usuario.cooperativa}</p></div>
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
    conteudo.innerHTML = `
      <h1>Central do Consultor</h1>
      
      <div class="central-container">
        <!-- Linha Superior: Banner e Apoio -->
        <div class="central-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          
          <div class="card" style="min-height: 250px; border: 2px solid #f1c40f;">
            <h3 style="color: #f1c40f;">📢 NOVIDADES GPV / EVENTOS</h3>
            <div style="background: #222; height: 150px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px dashed #444; margin-top: 15px;">
              <p style="text-align: center; color: #888;">BANNER DE CONTEÚDO<br><small>(Atualizado constantemente)</small></p>
            </div>
          </div>

          <div class="card" style="min-height: 250px; border: 2px solid #f1c40f;">
            <h3 style="color: #f1c40f;">📚 MATERIAL DE APOIO AO CONSULTOR E REGIONAL </h3>
            <div style="margin-top: 15px;">
              <p style="font-size: 0.9rem; margin-bottom: 10px;">Orientações de procedimentos:</p>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0; border-bottom: 1px solid #333;">📄 <a href="#" style="color: #fff; text-decoration: none;">Guia do Consultor</a></li>
                <li style="padding: 8px 0; border-bottom: 1px solid #333;">📄 <a href="#" style="color: #fff; text-decoration: none;">Links importantes e Aplicações utilizadas</a></li>
                <li style="padding: 8px 0;">📄 <a href="#" style="color: #fff; text-decoration: none;">Cadastrar Consultor</a></li>
              </ul>
            </div>
          </div>

        </div>

        <!-- Linha Inferior: Contatos Atualizada conforme image_9c635f.png -->
        <div class="card" style="border: 2px solid #e74c3c;">
          <h3 style="color: #e74c3c; text-align: center; margin-bottom: 20px;">📞 CONTATOS IMPORTANTES E SUPORTE</h3>
          <div style="display: grid; grid-template-columns: 1fr 1.5fr 1fr; align-items: center; gap: 20px;">
            
            <!-- Esquerda: Assistência 24h -->
            <div style="text-align: center;">
              <p><strong>ASSISTÊNCIA 24H</strong></p>
              <p>0800 111 1414</p>
              <p>0800 591 8357</p>
              <p>📱 (81) 9424-5276 (WhatsApp)</p>
            </div>
            
            <!-- Meio: Botões de WhatsApp Lado a Lado -->
            <div style="display: flex; gap: 10px; justify-content: center;">
              <a href="https://wa.me/5581991223928" target="_blank" 
                 style="background: #25d366; color: white; padding: 12px 15px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 0.85rem; text-align: center;">
                 💬 CENTRAL DO CONSULTOR
              </a>
              <a href="https://wa.me/5581973402195" target="_blank" 
                 style="background: #25d366; color: white; padding: 12px 15px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 0.85rem; text-align: center;">
                 💬 CENTRAL DO ASSOCIADO
              </a>
            </div>

            <!-- Direita: Espaço vazio (E-mail removido) -->
            <div style="text-align: center;">
              <!-- E-mail removido conforme solicitado -->
            </div>

          </div>
        </div>
      </div>
    `;
  }
}

/* DASHBOARD ADMIN */

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

/* MÓDULO DE USUÁRIOS */

function telaUsuarios() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <h1>Gerenciamento de Usuários</h1>
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
  lista.innerHTML = `<div class="card">Carregando usuários...</div>`;
  try {
    const dados = await apiPost({ acao: "listarUsuarios" });
    if (dados.status === "success") {
      usuariosLocal = dados.usuarios;
      renderizarListaUsuarios(usuariosLocal);
      atualizarMiniDashUsuarios(usuariosLocal);
    }
  } catch (erro) { console.log(erro); }
}

function renderizarListaUsuarios(lista) {
  const listaDiv = document.getElementById("listaUsuarios");
  let html = "";
  if (lista.length === 0) { listaDiv.innerHTML = "<p>Nenhum usuário encontrado.</p>"; return; }
  lista.forEach(u => {
    html += `
      <div class="card card-usuario-item">
        <h3>${u.nome || "Sem nome"}</h3>
        <p><strong>E-mail:</strong> ${u.email}</p>
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
      </div>`;
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
  renderizarListaUsuarios(filtrados);
}

function atualizarMiniDashUsuarios(lista) {
  document.getElementById("dashTotal").innerText = lista.length;
  document.getElementById("dashAtivos").innerText = lista.filter(u => u.status === "ATIVO").length;
  document.getElementById("dashInativos").innerText = lista.filter(u => u.status === "INATIVO").length;
}

/* MÓDULO DE COOPERATIVAS */

function telaCooperativas() {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <h1>Gerenciamento de Cooperativas</h1>
    <div class="grid-dashboard" style="margin-bottom: 20px; grid-template-columns: repeat(2, 1fr);">
      <div class="card-dashboard"><h2 id="dashTotalCoop">0</h2><p>Total de Unidades</p></div>
      <div class="card-dashboard"><h2 id="dashTotalAtivosCoop" style="color: #2ecc71;">0</h2><p>Usuários Vinculados</p></div>
    </div>
    <div class="card">
      <div class="submenu">
        <button onclick="mostrarCriarCooperativa()">+ Nova Cooperativa</button>
        <button onclick="carregarCooperativas()" class="btn-secundario">🔄 Atualizar Lista</button>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <input type="text" id="buscaCooperativa" placeholder="🔍 Buscar por nome, regional ou cidade..." onkeyup="filtrarCooperativas()" style="flex: 1;">
      </div>
      <div id="cooperativasConteudo" class="area-interna" style="margin-top: 20px;">
        <div id="listaCooperativas"><p style="text-align:center;">Clique em "Atualizar Lista" para carregar.</p></div>
      </div>
    </div>
  `;
}

async function carregarCooperativas() {
  const lista = document.getElementById("listaCooperativas");
  lista.innerHTML = `<div class="card">Carregando cooperativas...</div>`;
  try {
    const dados = await apiPost({ acao: "listarCooperativas" });
    if (dados.status === "success") {
      cooperativasLocal = dados.cooperativas;
      renderizarListaCooperativas(cooperativasLocal);
      atualizarMiniDashCoop(cooperativasLocal);
    }
  } catch (erro) { console.log(erro); }
}

function renderizarListaCooperativas(lista) {
  const listaDiv = document.getElementById("listaCooperativas");
  let html = "";
  if (lista.length === 0) { listaDiv.innerHTML = "<p>Nenhuma cooperativa encontrada.</p>"; return; }
  lista.forEach(coop => {
    html += `
      <div class="card card-usuario-item">
        <h3>${coop.nome}</h3>
        <p><strong>Regional:</strong> ${coop.regional} | <strong>Cidade:</strong> ${coop.cidade}</p>
        <p><strong>Status:</strong> ${coop.status || "ATIVO"}</p>
        <p style="color: #3498db;"><strong>👥 Usuários:</strong> ${coop.totalUsuarios || 0}</p>
        <div style="display:flex; gap:5px; margin-top:10px;">
          <button class="btn-secundario" onclick="alert('Edição em breve')">Editar</button>
        </div>
      </div>`;
  });
  listaDiv.innerHTML = html;
}

function filtrarCooperativas() {
  const termo = document.getElementById("buscaCooperativa").value.toLowerCase();
  const filtrados = cooperativasLocal.filter(coop => 
    coop.nome.toLowerCase().includes(termo) || 
    coop.regional.toLowerCase().includes(termo) || 
    coop.cidade.toLowerCase().includes(termo)
  );
  renderizarListaCooperativas(filtrados);
}

function atualizarMiniDashCoop(lista) {
  const totalUsers = lista.reduce((acc, coop) => acc + (Number(coop.totalUsuarios) || 0), 0);
  document.getElementById("dashTotalCoop").innerText = lista.length;
  document.getElementById("dashTotalAtivosCoop").innerText = totalUsers;
}

/* APOIO E MODAIS */

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
    </div>`;
  carregarSelectCooperativas();
}

async function carregarSelectCooperativas() {
  const select = document.getElementById("novaCooperativa");
  try {
    const dados = await apiPost({ acao: "listarCooperativas" });
    let options = `<option value="">Selecione a Cooperativa</option>`;
    dados.cooperativas.forEach(coop => { options += `<option value="${coop.nome}">${coop.nome}</option>`; });
    select.innerHTML = options;
  } catch (erro) { console.log(erro); }
}

async function criarUsuario() {
  const payload = {
    acao: "criarUsuario",
    nome: document.getElementById("novoNome").value.trim(),
    email: document.getElementById("novoEmail").value.trim(),
    senha: document.getElementById("novaSenha").value.trim(),
    perfil: document.getElementById("novoPerfil").value,
    cooperativa: document.getElementById("novaCooperativa").value
  };
  try {
    const d = await apiPost(payload);
    if (d.status === "success") { alert("Criado!"); carregarUsuarios(); telaUsuarios(); }
  } catch (e) { console.log(e); }
}

function mostrarCriarCooperativa() {
  const area = document.getElementById("cooperativasConteudo");
  area.innerHTML = `
    <input type="text" id="coopNome" placeholder="Nome da Cooperativa">
    <input type="text" id="coopRegional" placeholder="Regional Responsável">
    <input type="text" id="coopCidade" placeholder="Cidade">
    <button onclick="criarCooperativa()">Criar Cooperativa</button>
    <button onclick="telaCooperativas()" class="btn-secundario">Cancelar</button>
    <div id="retornoCooperativa"></div>`;
}

async function criarCooperativa() {
  const payload = {
    acao: "criarCooperativa",
    nome: document.getElementById("coopNome").value.trim(),
    regional: document.getElementById("coopRegional").value.trim(),
    cidade: document.getElementById("coopCidade").value.trim()
  };
  try {
    const d = await apiPost(payload);
    if (d.status === "success") { alert("Criada!"); carregarCooperativas(); telaCooperativas(); }
  } catch (e) { console.log(e); }
}

async function alterarStatus(id, status) {
  try {
    const dados = await apiPost({ acao: "alterarStatusUsuario", id, status });
    alert(dados.message);
    carregarUsuarios();
  } catch (erro) { console.log(erro); }
}

async function confirmarExclusao(id, nome) {
  if (confirm(`Excluir permanentemente o usuário ${nome}?`)) {
    try {
      const d = await apiPost({ acao: "excluirUsuario", id });
      if (d.status === "success") { alert(d.message); carregarUsuarios(); carregarDashboardAdmin(); }
    } catch (e) { console.log(e); }
  }
}

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
      <select id="editStatus"><option value="ATIVO">ATIVO</option><option value="INATIVO">INATIVO</option></select>
      <button onclick="salvarEdicaoUsuario()">Salvar Alterações</button>
      <button class="btn-secundario" onclick="fecharModalEditar()">Cancelar</button>
    </div>`;
  document.body.appendChild(modal);
  document.getElementById("editPerfil").value = perfil;
  document.getElementById("editStatus").value = status;
  carregarCooperativasEdicao(cooperativa);
}

function fecharModalEditar() { const m = document.getElementById("modalEditar"); if (m) m.remove(); }

async function salvarEdicaoUsuario() {
  const payload = {
    acao: "editarUsuario",
    nome: document.getElementById("editNome").value,
    email: document.getElementById("editEmail").value,
    perfil: document.getElementById("editPerfil").value,
    cooperativa: document.getElementById("editCooperativa").value,
    status: document.getElementById("editStatus").value
  };
  try {
    const d = await apiPost(payload);
    if (d.status === "success") { alert("Sucesso!"); fecharModalEditar(); carregarUsuarios(); }
  } catch (e) { console.log(e); }
}

async function carregarCooperativasEdicao(selecionada) {
  try {
    const d = await apiPost({ acao: "listarCooperativas" });
    const s = document.getElementById("editCooperativa");
    s.innerHTML = "";
    d.cooperativas.forEach(c => {
      const o = document.createElement("option");
      o.value = c.nome; o.textContent = c.nome;
      if (c.nome === selecionada) o.selected = true;
      s.appendChild(o);
    });
  } catch (e) { console.log(e); }
}
