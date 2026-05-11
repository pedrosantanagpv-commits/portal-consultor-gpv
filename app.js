/* =========================
   CONFIGURAÇÃO
========================= */

const API = "/api/proxy";

/* =========================
   LOGIN / SESSÃO
========================= */

async function login(){
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();

  const resultado = document.getElementById("resultado");

  if(!email || !senha){
    resultado.innerHTML = "Informe email e senha.";
    return;
  }

  resultado.innerHTML = "Entrando...";

  try{
    const resposta = await fetch(API,{
  method:"POST",
  body:JSON.stringify({
    acao:"login",
    email:email,
    senha:senha
  })
});

    const dados = await resposta.json();

    if(dados.status === "success"){
      localStorage.setItem("usuario", JSON.stringify(dados));
      carregarPainel(dados);
      abrirPagina("inicio");
    }else{
      resultado.innerHTML = dados.message;
    }

  }catch(erro){
    resultado.innerHTML = "Erro ao conectar com a API.";
    console.log(erro);
  }
}

function carregarPainel(usuario){
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("painel").style.display = "block";

  document.getElementById("usuarioNome").innerHTML = usuario.nome;
  document.getElementById("usuarioPerfil").innerHTML = usuario.perfil;

  const menuAdmin = document.getElementById("menuAdmin");

  if(usuario.perfil !== "SUPER_ADMIN" && usuario.perfil !== "ADMINISTRATIVO"){
    menuAdmin.style.display = "none";
  }else{
    menuAdmin.style.display = "block";
  }
}

function logout(){
  localStorage.removeItem("usuario");
  location.reload();
}

window.onload = function(){
  const usuario = localStorage.getItem("usuario");

  if(usuario){
    carregarPainel(JSON.parse(usuario));
    abrirPagina("inicio");
  }
};

/* =========================
   PERMISSÕES
========================= */

function usuarioAdmin(){
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  return usuario && (
    usuario.perfil === "SUPER_ADMIN" ||
    usuario.perfil === "ADMINISTRATIVO"
  );
}

/* =========================
   ROTAS / PÁGINAS
========================= */

function abrirPagina(pagina){
  const conteudo = document.getElementById("conteudo");

  if(pagina === "inicio"){
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    if(usuario.perfil === "CONSULTOR"){
      conteudo.innerHTML = `
        <h1>Painel do Consultor</h1>

        <div class="card">
          <h3>Minha Cooperativa</h3>
          <p>${usuario.cooperativa}</p>
        </div>

        <div class="card">
          <h3>Comunicados</h3>
          <p>Nenhum comunicado disponível.</p>
        </div>

        <div class="card">
          <h3>Conteúdos Recentes</h3>
          <p>Nenhum conteúdo disponível.</p>
        </div>
      `;
    }

    else if(usuario.perfil === "REGIONAL"){
      conteudo.innerHTML = `
        <h1>Painel Regional</h1>

        <div class="card">
          <h3>Cooperativa</h3>
          <p>${usuario.cooperativa}</p>
        </div>

        <div class="card">
          <h3>Consultores</h3>
          <p>Em breve...</p>
        </div>

        <div class="card">
          <h3>Comunicados</h3>
          <p>Nenhum comunicado disponível.</p>
        </div>
      `;
    }

    else{
      carregarDashboardAdmin();
    }
  }

  if(pagina === "usuarios"){
    if(!usuarioAdmin()){
      conteudo.innerHTML = `<div class="card">Acesso não permitido.</div>`;
      return;
    }

    telaUsuarios();
  }

  if(pagina === "cooperativas"){
    if(!usuarioAdmin()){
      conteudo.innerHTML = `<div class="card">Acesso não permitido.</div>`;
      return;
    }

    telaCooperativas();
  }

  if(pagina === "conteudos"){
    conteudo.innerHTML = `
      <h1>Conteúdos</h1>
      <div class="card">Área de conteúdos e procedimentos.</div>
    `;
  }
}

/* =========================
   DASHBOARD ADMIN
========================= */

async function carregarDashboardAdmin(){
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Painel Administrativo</h1>

    <div class="grid-dashboard">
      <div class="card-dashboard">
        <h2 id="totalUsuarios">0</h2>
        <p>Usuários</p>
      </div>

      <div class="card-dashboard">
        <h2 id="usuariosAtivos">0</h2>
        <p>Usuários Ativos</p>
      </div>

      <div class="card-dashboard">
        <h2 id="consultores">0</h2>
        <p>Consultores</p>
      </div>

      <div class="card-dashboard">
        <h2 id="regionais">0</h2>
        <p>Regionais</p>
      </div>

      <div class="card-dashboard">
        <h2 id="cooperativas">0</h2>
        <p>Cooperativas</p>
      </div>
    </div>
  `;

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"dashboardAdmin"
      })
    });

    const dados = await resposta.json();
    console.log("DASHBOARD:", dados);
    if(dados.status === "success"){
      document.getElementById("totalUsuarios").innerText = dados.totalUsuarios;
      document.getElementById("usuariosAtivos").innerText = dados.usuariosAtivos;
      document.getElementById("consultores").innerText = dados.totalConsultores;
      document.getElementById("regionais").innerText = dados.totalRegionais;
      document.getElementById("cooperativas").innerText = dados.totalCooperativas;
    }

  }catch(erro){
    console.log(erro);
  }
}

/* =========================
   USUÁRIOS
========================= */

function telaUsuarios(){
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Usuários</h1>

    <div class="card">
      <div class="submenu">
        <button onclick="mostrarCriarUsuario()">Criar Usuário</button>
        <button onclick="mostrarGerenciarUsuarios()" class="btn-secundario">
          Gerenciar Usuários
        </button>
      </div>

      <div id="usuariosConteudo" class="area-interna"></div>
    </div>
  `;
}

async function mostrarCriarUsuario(){
  const area = document.getElementById("usuariosConteudo");

  area.innerHTML = `
    <input type="text" id="novoNome" placeholder="Nome">
    <input type="email" id="novoEmail" placeholder="Email">
    <input type="password" id="novaSenha" placeholder="Senha">

    <select id="novaCooperativa"></select>

    <select id="novoPerfil">
      <option value="CONSULTOR">CONSULTOR</option>
      <option value="REGIONAL">REGIONAL</option>
      <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
    </select>

    <button onclick="criarUsuario()">Criar Usuário</button>

    <div id="retornoCadastro"></div>
  `;

  carregarSelectCooperativas();
}

function mostrarGerenciarUsuarios(){
  const area = document.getElementById("usuariosConteudo");

  area.innerHTML = `
    <div id="listaUsuarios"></div>
  `;

  carregarUsuarios();
}

async function carregarUsuarios(){
  const lista = document.getElementById("listaUsuarios");

  lista.innerHTML = `<div class="card">Carregando usuários...</div>`;

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"listarUsuarios"
      })
    });

    const dados = await resposta.json();

    if(dados.status === "success"){
      let html = "";

      dados.usuarios.forEach(usuario => {
        html += `
          <div class="card">
            <h3>${usuario.nome || "Sem nome"}</h3>
            <p>${usuario.email || "Sem email"}</p>
            <p>Perfil: ${usuario.perfil || "-"}</p>
            <p>Cooperativa: ${usuario.cooperativa || "-"}</p>
            <p>Status: ${usuario.status || "-"}</p>
            <button onclick='abrirModalEditar(
            "${usuario.nome || ""}",
            "${usuario.email || ""}",
            "${usuario.perfil || ""}",
            "${usuario.cooperativa || ""}",
            "${usuario.status || ""}"
)'>
Editar
</button>
            ${
              usuario.status === "ATIVO"
              ? `<button class="btn-secundario" onclick="alterarStatus('${usuario.id}', 'INATIVO')">Inativar</button>`
              : `<button onclick="alterarStatus('${usuario.id}', 'ATIVO')">Ativar</button>`
            }
          </div>
        `;
      });

      lista.innerHTML = html;
    }

  }catch(erro){
    lista.innerHTML = `<div class="card">Erro de conexão com API.</div>`;
    console.log(erro);
  }
}

async function criarUsuario(){
  const nome = document.getElementById("novoNome").value.trim();
  const email = document.getElementById("novoEmail").value.trim();
  const senha = document.getElementById("novaSenha").value.trim();
  const perfil = document.getElementById("novoPerfil").value;
  const cooperativa = document.getElementById("novaCooperativa").value;

  const retorno = document.getElementById("retornoCadastro");

  if(!nome || !email || !senha || !perfil || !cooperativa){
    retorno.innerHTML = "Preencha todos os campos obrigatórios.";
    return;
  }

  retorno.innerHTML = "Criando usuário...";

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"criarUsuario",
        nome:nome,
        email:email,
        senha:senha,
        perfil:perfil,
        cooperativa:cooperativa
      })
    });

    const dados = await resposta.json();

    retorno.innerHTML = dados.message;
    mostrarGerenciarUsuarios();

  }catch(erro){
    retorno.innerHTML = "Erro ao criar usuário.";
    console.log(erro);
  }
}

async function alterarStatus(id, status){
  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"alterarStatusUsuario",
        id:id,
        status:status
      })
    });

    const dados = await resposta.json();

    alert(dados.message);
    carregarUsuarios();

  }catch(erro){
    alert("Erro ao alterar status");
    console.log(erro);
  }
}

async function carregarSelectCooperativas(){
  const select = document.getElementById("novaCooperativa");

  if(!select){
    return;
  }

  select.innerHTML = `<option>Carregando...</option>`;

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"listarCooperativas"
      })
    });

    const dados = await resposta.json();

    if(dados.status === "success"){
      let options = `<option value="">Selecione a Cooperativa</option>`;

      dados.cooperativas.forEach(coop => {
        options += `
          <option value="${coop.nome}">
            ${coop.nome}
          </option>
        `;
      });

      select.innerHTML = options;
    }

  }catch(erro){
    console.log(erro);
  }
}

/* =========================
   COOPERATIVAS
========================= */

function telaCooperativas(){
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `
    <h1>Cooperativas</h1>

    <div class="card">
      <div class="submenu">
        <button onclick="mostrarCriarCooperativa()">Criar Cooperativa</button>
        <button onclick="mostrarGerenciarCooperativas()" class="btn-secundario">
          Gerenciar Cooperativas
        </button>
      </div>

      <div id="cooperativasConteudo" class="area-interna"></div>
    </div>
  `;
}

function mostrarCriarCooperativa(){
  const area = document.getElementById("cooperativasConteudo");

  area.innerHTML = `
    <input type="text" id="coopNome" placeholder="Nome da Cooperativa">
    <input type="text" id="coopRegional" placeholder="Regional Responsável">
    <input type="text" id="coopCidade" placeholder="Cidade">

    <button onclick="criarCooperativa()">Criar Cooperativa</button>

    <div id="retornoCooperativa"></div>
  `;
}

function mostrarGerenciarCooperativas(){
  const area = document.getElementById("cooperativasConteudo");

  area.innerHTML = `
    <div id="listaCooperativas"></div>
  `;

  carregarCooperativas();
}

async function carregarCooperativas(){
  const lista = document.getElementById("listaCooperativas");

  lista.innerHTML = `<div class="card">Carregando cooperativas...</div>`;

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"listarCooperativas"
      })
    });

    const dados = await resposta.json();

    if(dados.status === "success"){
      let html = "";

      dados.cooperativas.forEach(coop => {
        html += `
          <div class="card">
            <h3>${coop.nome}</h3>
            <p>Regional: ${coop.regional}</p>
            <p>Cidade: ${coop.cidade}</p>
            <p>Status: ${coop.status}</p>
            <p>Usuários vinculados: ${coop.totalUsuarios || 0}</p>
          </div>
        `;
      });

      lista.innerHTML = html;
    }

  }catch(erro){
    lista.innerHTML = `<div class="card">Erro de conexão com API.</div>`;
    console.log(erro);
  }
}

async function criarCooperativa(){
  const nome = document.getElementById("coopNome").value.trim();
  const regional = document.getElementById("coopRegional").value.trim();
  const cidade = document.getElementById("coopCidade").value.trim();

  const retorno = document.getElementById("retornoCooperativa");

  if(!nome || !regional || !cidade){
    retorno.innerHTML = "Preencha todos os campos obrigatórios.";
    return;
  }

  retorno.innerHTML = "Criando cooperativa...";

  try{
    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"criarCooperativa",
        nome:nome,
        regional:regional,
        cidade:cidade
      })
    });

    const dados = await resposta.json();

    retorno.innerHTML = dados.message;
    mostrarGerenciarCooperativas();

  }catch(erro){
    retorno.innerHTML = "Erro ao criar cooperativa.";
    console.log(erro);
  }
}
function abrirModalEditar(nome, email, perfil, cooperativa, status){

  const modalExistente = document.getElementById("modalEditar");

  if(modalExistente){
    modalExistente.remove();
  }

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

      <select id="editCooperativa">
      <option>Carregando...</option>
      </select>

      <select id="editStatus">
        <option value="ATIVO">ATIVO</option>
        <option value="INATIVO">INATIVO</option>
      </select>

      <button onclick="salvarEdicaoUsuario()">Salvar Alterações</button>

      <button class="btn-secundario" onclick="fecharModalEditar()">
        Cancelar
      </button>

    </div>

  `;

  document.body.appendChild(modal);

  document.getElementById("editPerfil").value = perfil;
  document.getElementById("editStatus").value = status;
  carregarCooperativasEdicao(cooperativa);
}
function fecharModalEditar(){

  const modal = document.getElementById("modalEditar");

  if(modal){
    modal.remove();
  }
}
async function salvarEdicaoUsuario(){

  const nome = document.getElementById("editNome").value;
  const email = document.getElementById("editEmail").value;
  const perfil = document.getElementById("editPerfil").value;
  const cooperativa = document.getElementById("editCooperativa").value;
  const status = document.getElementById("editStatus").value;

  try{

    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"editarUsuario",
        nome,
        email,
        perfil,
        cooperativa,
        status
      })
    });

    const dados = await resposta.json();

    if(dados.status === "success"){

      alert("Usuário atualizado com sucesso.");

      fecharModalEditar();

      carregarUsuarios();

      carregarDashboardAdmin();

    }else{

      alert(dados.message || "Erro ao atualizar.");
    }

  }catch(erro){

    console.log(erro);

    alert("Erro de conexão.");
  }
}
async function carregarCooperativasEdicao(cooperativaSelecionada){

  try{

    const resposta = await fetch(API,{
      method:"POST",
      body:JSON.stringify({
        acao:"listarCooperativas"
      })
    });

    const dados = await resposta.json();

    const select = document.getElementById("editCooperativa");

    select.innerHTML = "";

    dados.cooperativas.forEach(coop => {

      const option = document.createElement("option");

      option.value = coop.nome;
      option.textContent = coop.nome;

      if(coop.nome === cooperativaSelecionada){
        option.selected = true;
      }

      select.appendChild(option);

    });

  }catch(erro){

    console.log(erro);
  }
}
