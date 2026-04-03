console.log("GESTAO JS LOCAL CARREGOU");

const el = {
  dot: document.getElementById("dot-status"),
  status: document.getElementById("text-status"),
  filtroData: document.getElementById("filtroData"),
  lastUpdate: document.getElementById("lastUpdate"),
  searchInput: document.getElementById("searchInput"),
  cursoSelect: document.getElementById("cursoSelect"),
  btnExport: document.getElementById("btnExport"),
  tbody: document.getElementById("tbody"),
  empty: document.getElementById("empty"),
  kpiCadastrados: document.getElementById("kpiCadastrados"),
  kpiPresentes: document.getElementById("kpiPresentes"),
  kpiAusentes: document.getElementById("kpiAusentes"),
  kpiSemRegistro: document.getElementById("kpiSemRegistro"),

  // avisos
  avisoTitulo: document.getElementById("avisoTitulo"),
  avisoCurso: document.getElementById("avisoCurso"),
  avisoData: document.getElementById("avisoData"),
  avisoMensagem: document.getElementById("avisoMensagem"),
  avisoAtivo: document.getElementById("avisoAtivo"),
  btnSalvarAviso: document.getElementById("btnSalvarAviso"),
  msgAviso: document.getElementById("msgAviso"),
  listaAvisosGestao: document.getElementById("listaAvisosGestao"),
  avisosGestaoEmpty: document.getElementById("avisosGestaoEmpty"),

  // cadastro professor
  cadUid: document.getElementById("cadUid"),
  cadNome: document.getElementById("cadNome"),
  cadCurso: document.getElementById("cadCurso"),
  cadAtivo: document.getElementById("cadAtivo"),
  btnSalvarProfessor: document.getElementById("btnSalvarProfessor"),
  msgProfessor: document.getElementById("msgProfessor"),
};

// ========= State =========
let cursos = {};
let usuarios = {};
let presencas = {};
let avisos = {};
let filtroCurso = "__todos__";
let termoBusca = "";
let dataSelecionada = todayKey();

// ========= Helpers =========
function nowBRTime() {
  return new Date().toLocaleTimeString("pt-BR");
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function norm(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function courseName(courseId) {
  return cursos?.[courseId]?.nome || courseId || "-";
}

function setConnOk() {
  if (el.dot) {
    el.dot.classList.remove("bad");
    el.dot.classList.add("ok");
  }
  if (el.status) {
    el.status.textContent = "Online (Servidor local)";
  }
}

function setConnBad(msg) {
  if (el.dot) {
    el.dot.classList.remove("ok");
    el.dot.classList.add("bad");
  }
  if (el.status) {
    el.status.textContent = msg || "Erro de conexão";
  }
}

// ========= API =========
async function apiGet(url) {
  const resposta = await fetch(url);
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na API");
  }

  return dados;
}

async function apiSend(url, method, body) {
  const resposta = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na API");
  }

  return dados;
}

// ========= Build rows =========
function buildRows() {
  const all = Object.entries(usuarios || {})
    .filter(([uid, u]) => u && u.ativo === true)
    .map(([uid, u]) => {
      const p = presencas[uid] || null;
      const status = p?.status || "Sem registro";
      const entrada = p?.hora_entrada || "";
      const saida = p?.hora_saida || "";
      const nome = u.nome || p?.nome || "Desconhecido";
      const curso = u.curso || p?.curso || "";
      return { uid, nome, curso, status, entrada, saida };
    });

  let filtered = all;

  if (filtroCurso !== "__todos__") {
    filtered = filtered.filter(x => norm(x.curso) === norm(filtroCurso));
  }

  if (termoBusca) {
    filtered = filtered.filter(x => norm(x.nome).includes(termoBusca));
  }

  const score = (s) => s === "Presente" ? 0 : (s === "Sem registro" ? 1 : 2);
  filtered.sort((a, b) => {
    const sa = score(a.status);
    const sb = score(b.status);
    if (sa !== sb) return sa - sb;
    return norm(a.nome).localeCompare(norm(b.nome));
  });

  const cadastrados = all.length;
  const presentesCount = all.filter(x => x.status === "Presente").length;
  const ausentesCount = all.filter(x => x.status === "Ausente").length;
  const semRegCount = all.filter(x => x.status === "Sem registro").length;

  if (el.kpiCadastrados) el.kpiCadastrados.textContent = String(cadastrados);
  if (el.kpiPresentes) el.kpiPresentes.textContent = String(presentesCount);
  if (el.kpiAusentes) el.kpiAusentes.textContent = String(ausentesCount);
  if (el.kpiSemRegistro) el.kpiSemRegistro.textContent = String(semRegCount);

  if (el.tbody) {
    el.tbody.innerHTML = filtered.map(x => {
      const badge = x.status === "Presente"
        ? `<span class="badge present">Presente</span>`
        : (x.status === "Ausente"
          ? `<span class="badge absent">Ausente</span>`
          : `<span class="badge">Sem registro</span>`);

      return `
        <tr style="border-top:1px solid rgba(255,255,255,0.08);">
          <td class="col-prof-cell">${x.nome}</td>
          <td class="col-curso-cell">${courseName(x.curso)}</td>
          <td class="col-status-cell">${badge}</td>
          <td class="col-hora-cell mono">${x.entrada || "-"}</td>
          <td class="col-hora-cell mono">${x.saida || "-"}</td>
          <td class="col-uid-cell mono">${x.uid}</td>
        </tr>
      `;
    }).join("");
  }

  if (el.empty) {
    if (filtered.length === 0) el.empty.classList.remove("hidden");
    else el.empty.classList.add("hidden");
  }

  if (el.lastUpdate) el.lastUpdate.textContent = nowBRTime();
}

// ========= Selects =========
function mountCursosSelect() {
  const keys = Object.keys(cursos || {});
  keys.sort((a, b) => norm(cursos[a]?.nome || a).localeCompare(norm(cursos[b]?.nome || b)));

  if (el.cursoSelect) {
    const current = el.cursoSelect.value;

    el.cursoSelect.innerHTML =
      `<option value="__todos__">Todos</option>` +
      keys
        .filter(k => k !== "todos")
        .map(k => `<option value="${k}">${cursos[k]?.nome || k}</option>`)
        .join("");

    if (current && (current === "__todos__" || cursos[current])) {
      el.cursoSelect.value = current;
    } else {
      el.cursoSelect.value = "__todos__";
    }
  }

  if (el.avisoCurso) {
    el.avisoCurso.innerHTML =
      `<option value="todos">Todos</option>` +
      keys
        .filter(k => k !== "todos")
        .map(k => `<option value="${k}">${cursos[k]?.nome || k}</option>`)
        .join("");
  }

  if (el.cadCurso) {
    el.cadCurso.innerHTML =
      `<option value="">Selecione</option>` +
      keys
        .filter(k => k !== "todos")
        .map(k => `<option value="${k}">${cursos[k]?.nome || k}</option>`)
        .join("");
  }
}

// ========= CSV =========
function exportCSV() {
  const dataExportada = dataSelecionada;
  const rows = [];

  rows.push(["Data", "Professor", "Curso", "Status", "Entrada", "Saida", "UID"]);

  Object.entries(usuarios || {})
    .filter(([uid, u]) => u && u.ativo === true)
    .forEach(([uid, u]) => {
      const p = presencas[uid] || {};
      const status = p.status || "Sem registro";
      const entrada = p.hora_entrada || "";
      const saida = p.hora_saida || "";
      const nome = u.nome || p.nome || "Desconhecido";
      const cursoId = u.curso || p.curso || "";
      const cursoNome = courseName(cursoId);

      rows.push([dataExportada, nome, cursoNome, status, entrada, saida, uid]);
    });

  const csv = rows.map(r =>
    r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `presenx_relatorio_${dataExportada}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========= CARGAS LOCAIS =========
async function carregarCursosLocais() {
  try {
    const dados = await apiGet("/api/cursos");

    cursos = {};
    (dados.cursos || []).forEach(curso => {
      cursos[curso.id] = { nome: curso.nome };
    });

    mountCursosSelect();
    buildRows();
    setConnOk();
  } catch (error) {
    console.error("Erro ao carregar cursos locais:", error);
    setConnBad("Erro cursos locais");
  }
}

async function carregarUsuariosLocais() {
  try {
    const dados = await apiGet("/api/usuarios");

    usuarios = {};
    (dados.usuarios || []).forEach(usuario => {
      usuarios[usuario.uid] = {
        nome: usuario.nome,
        curso: usuario.curso,
        ativo: usuario.ativo === 1 || usuario.ativo === true
      };
    });

    buildRows();
  } catch (error) {
    console.error("Erro ao carregar usuários locais:", error);
    setConnBad("Erro usuários locais");
  }
}

async function carregarPresencasPorData() {
  try {
    const dados = await apiGet(`/api/presencas?data=${encodeURIComponent(dataSelecionada)}`);

    presencas = {};
    (dados.presencas || []).forEach(p => {
      presencas[p.uid] = {
        nome: p.nome,
        curso: p.curso,
        status: p.status,
        hora_entrada: p.hora_entrada,
        hora_saida: p.hora_saida
      };
    });

    buildRows();
    setConnOk();
  } catch (error) {
    console.error("Erro ao carregar presenças locais:", error);
    setConnBad("Erro presenças locais");
  }
}

async function carregarAvisosLocais() {
  try {
    const dados = await apiGet("/api/avisos");

    avisos = {};
    (dados.avisos || []).forEach(aviso => {
      avisos[aviso.id] = {
        titulo: aviso.titulo,
        mensagem: aviso.mensagem,
        curso: aviso.curso,
        data: aviso.data,
        ativo: aviso.ativo === 1 || aviso.ativo === true
      };
    });

    renderListaAvisosGestao();
  } catch (error) {
    console.error("Erro ao carregar avisos locais:", error);
  }
}

// ========= PROFESSORES =========
async function salvarProfessor() {
  const uid = (el.cadUid?.value || "").trim().toUpperCase();
  const nome = (el.cadNome?.value || "").trim();
  const curso = (el.cadCurso?.value || "").trim();
  const ativo = !!el.cadAtivo?.checked;

  if (el.msgProfessor) {
    el.msgProfessor.textContent = "";
    el.msgProfessor.style.color = "#ff6b6b";
  }

  if (!uid || !nome || !curso) {
    if (el.msgProfessor) el.msgProfessor.textContent = "Preencha UID, nome e curso.";
    return;
  }

  try {
    await apiSend("/api/usuarios", "POST", {
      uid,
      nome,
      curso,
      ativo
    });

    if (el.msgProfessor) {
      el.msgProfessor.style.color = "#7CFF8A";
      el.msgProfessor.textContent = "Professor salvo com sucesso.";
    }

    if (el.cadUid) el.cadUid.value = "";
    if (el.cadNome) el.cadNome.value = "";
    if (el.cadCurso) el.cadCurso.value = "";
    if (el.cadAtivo) el.cadAtivo.checked = true;

    carregarUsuariosLocais();
  } catch (error) {
    console.error("Erro ao salvar professor:", error);
    if (el.msgProfessor) {
      el.msgProfessor.style.color = "#ff6b6b";
      el.msgProfessor.textContent = "Erro ao salvar professor.";
    }
  }
}

// ========= AVISOS =========
async function salvarAviso() {
  const titulo = (el.avisoTitulo?.value || "").trim();
  const curso = (el.avisoCurso?.value || "todos").trim();
  const data = (el.avisoData?.value || "").trim();
  const mensagem = (el.avisoMensagem?.value || "").trim();
  const ativo = !!el.avisoAtivo?.checked;

  if (el.msgAviso) {
    el.msgAviso.textContent = "";
    el.msgAviso.style.color = "#ff6b6b";
  }

  if (!titulo || !mensagem || !data) {
    if (el.msgAviso) el.msgAviso.textContent = "Preencha título, mensagem e data.";
    return;
  }

  try {
    await apiSend("/api/avisos", "POST", {
      titulo,
      curso,
      data,
      mensagem,
      ativo
    });

    if (el.msgAviso) {
      el.msgAviso.style.color = "#7CFF8A";
      el.msgAviso.textContent = "Aviso salvo com sucesso.";
    }

    if (el.avisoTitulo) el.avisoTitulo.value = "";
    if (el.avisoMensagem) el.avisoMensagem.value = "";
    if (el.avisoCurso) el.avisoCurso.value = "todos";
    if (el.avisoData) el.avisoData.value = todayKey();
    if (el.avisoAtivo) el.avisoAtivo.checked = true;

    carregarAvisosLocais();
  } catch (error) {
    console.error("Erro ao salvar aviso:", error);
    if (el.msgAviso) el.msgAviso.textContent = "Erro ao salvar aviso.";
  }
}

function renderListaAvisosGestao() {
  const lista = Object.entries(avisos || {}).map(([id, aviso]) => ({
    id,
    ...aviso
  }));

  lista.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  if (el.listaAvisosGestao) {
    el.listaAvisosGestao.innerHTML = lista.map(aviso => `
      <article class="aviso-card">
        <div class="aviso-top">
          <div>
            <div class="aviso-title">${aviso.titulo || "Aviso"}</div>
            <div class="aviso-course">
              Curso: <strong>${String(aviso.curso).toLowerCase() === "todos" ? "Todos" : courseName(aviso.curso)}</strong>
              • Data: <strong>${aviso.data || "-"}</strong>
              • Status: <strong>${aviso.ativo ? "Ativo" : "Inativo"}</strong>
            </div>
          </div>
          <div class="badge ${aviso.ativo ? "present" : "absent"}">
            ${aviso.ativo ? "Ativo" : "Inativo"}
          </div>
        </div>

        <div class="aviso-msg">
          ${aviso.mensagem || ""}
        </div>

        <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
          <button class="pill" style="cursor:pointer; font-weight:900;" onclick="toggleAviso('${aviso.id}', ${aviso.ativo ? "false" : "true"})">
            ${aviso.ativo ? "Desativar" : "Ativar"}
          </button>

          <button class="pill" style="cursor:pointer; font-weight:900;" onclick="excluirAviso('${aviso.id}')">
            Excluir
          </button>
        </div>
      </article>
    `).join("");
  }

  if (el.avisosGestaoEmpty) {
    if (lista.length === 0) el.avisosGestaoEmpty.classList.remove("hidden");
    else el.avisosGestaoEmpty.classList.add("hidden");
  }
}

window.toggleAviso = async function (id, novoStatus) {
  const avisoAtual = avisos[id];
  if (!avisoAtual) return;

  try {
    await apiSend(`/api/avisos/${id}`, "PUT", {
      titulo: avisoAtual.titulo,
      mensagem: avisoAtual.mensagem,
      curso: avisoAtual.curso,
      data: avisoAtual.data,
      ativo: novoStatus
    });

    if (el.msgAviso) {
      el.msgAviso.style.color = "#7CFF8A";
      el.msgAviso.textContent = "Status do aviso atualizado.";
    }

    carregarAvisosLocais();
  } catch (error) {
    console.error("Erro ao atualizar aviso:", error);
    if (el.msgAviso) {
      el.msgAviso.style.color = "#ff6b6b";
      el.msgAviso.textContent = "Erro ao atualizar aviso.";
    }
  }
};

window.excluirAviso = async function (id) {
  const confirmar = confirm("Deseja excluir este aviso?");
  if (!confirmar) return;

  try {
    await fetch(`/api/avisos/${id}`, { method: "DELETE" });

    if (el.msgAviso) {
      el.msgAviso.style.color = "#7CFF8A";
      el.msgAviso.textContent = "Aviso excluído com sucesso.";
    }

    carregarAvisosLocais();
  } catch (error) {
    console.error("Erro ao excluir aviso:", error);
    if (el.msgAviso) {
      el.msgAviso.style.color = "#ff6b6b";
      el.msgAviso.textContent = "Erro ao excluir aviso.";
    }
  }
};

// ========= Start =========
function start() {
  if (el.filtroData) el.filtroData.value = todayKey();
  if (el.avisoData) el.avisoData.value = todayKey();

  carregarCursosLocais();
  carregarUsuariosLocais();
  carregarPresencasPorData();
  carregarAvisosLocais();

  if (el.filtroData) {
    el.filtroData.addEventListener("change", () => {
      dataSelecionada = el.filtroData.value || todayKey();
      carregarPresencasPorData();
    });
  }

  if (el.cursoSelect) {
    el.cursoSelect.addEventListener("change", () => {
      filtroCurso = el.cursoSelect.value;
      buildRows();
    });
  }

  if (el.searchInput) {
    el.searchInput.addEventListener("input", () => {
      termoBusca = norm(el.searchInput.value);
      buildRows();
    });
  }

  if (el.btnExport) {
    el.btnExport.addEventListener("click", exportCSV);
  }

  if (el.btnSalvarAviso) {
    el.btnSalvarAviso.addEventListener("click", salvarAviso);
  }

  if (el.btnSalvarProfessor) {
    el.btnSalvarProfessor.addEventListener("click", salvarProfessor);
  }
}

  setInterval(() => {
    carregarUsuariosLocais();
    carregarPresencasPorData();
    carregarAvisosLocais();
  }, 2500);

setInterval(() => {
  if (el.lastUpdate) el.lastUpdate.textContent = nowBRTime();
}, 1000);

start();