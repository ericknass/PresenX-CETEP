console.log("CETEP JS LOCAL CARREGOU");

const el = {
  dot: document.getElementById("dot-status"),
  status: document.getElementById("text-status"),
  cursoSelect: document.getElementById("cursoSelect"),
  searchInput: document.getElementById("searchInput"),
  showAbsent: document.getElementById("showAbsent"),
  todayLabel: document.getElementById("todayLabel"),
  lastUpdate: document.getElementById("lastUpdate"),
  kpiPresentes: document.getElementById("kpiPresentes"),
  kpiExibidos: document.getElementById("kpiExibidos"),
  listTitle: document.getElementById("listTitle"),
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  avisosContainer: document.getElementById("avisosContainer"),
  avisosEmpty: document.getElementById("avisosEmpty"),
};

// ========= State =========
let cursos = {};
let presencas = {};
let avisos = {};
let filtroCurso = "__todos__";
let termoBusca = "";
let mostrarAusentes = false;

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

function todayLabelBR() {
  return new Date().toLocaleDateString("pt-BR");
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
  const c = cursos?.[courseId];
  if (!c) return courseId || "-";
  return c.nome || courseId;
}

function setConnOk() {
  el.dot.classList.remove("bad");
  el.dot.classList.add("ok");
  el.status.textContent = "Online (Servidor local)";
}

function setConnBad(msg) {
  el.dot.classList.remove("ok");
  el.dot.classList.add("bad");
  el.status.textContent = msg || "Erro de conexão";
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

// ========= Avisos =========
function renderAvisos() {
  const hoje = todayKey();

  let lista = Object.values(avisos).filter(aviso => {
    if (!aviso) return false;

    const ativo = aviso.ativo === true || aviso.ativo === 1;
    const data = String(aviso.data || "").trim();
    const curso = String(aviso.curso || "").trim().toLowerCase();

    if (!ativo) return false;
    if (data !== hoje) return false;

    if (filtroCurso === "__todos__") return true;

    return curso === "todos" || norm(curso) === norm(filtroCurso);
  });

  el.avisosContainer.innerHTML = lista.map(aviso => `
    <article class="aviso-card">
      <div class="aviso-top">
        <div>
          <div class="aviso-title">${aviso.titulo || "Aviso"}</div>
          <div class="aviso-course">
            Curso: <strong>${String(aviso.curso).toLowerCase() === "todos" ? "Todos" : courseName(aviso.curso)}</strong>
          </div>
        </div>
        <div class="badge present">Aviso</div>
      </div>

      <div class="aviso-msg">
        ${aviso.mensagem || ""}
      </div>
    </article>
  `).join("");

  if (lista.length === 0) {
    el.avisosEmpty.classList.remove("hidden");
  } else {
    el.avisosEmpty.classList.add("hidden");
  }
}

// ========= Render =========
function render() {
  const items = Object.entries(presencas).map(([uid, p]) => ({
    uid,
    nome: p.nome || "Desconhecido",
    curso: p.curso || "",
    status: p.status || "Ausente",
    entrada: p.hora_entrada || "",
    saida: p.hora_saida || ""
  }));

  let filtered = items.filter(it => {
    if (mostrarAusentes) return true;
    return it.status === "Presente";
  });

  if (filtroCurso !== "__todos__") {
    filtered = filtered.filter(it => norm(it.curso) === norm(filtroCurso));
  }

  if (termoBusca) {
    filtered = filtered.filter(it => norm(it.nome).includes(termoBusca));
  }

  filtered.sort((a, b) => {
    if (a.status !== b.status) return a.status === "Presente" ? -1 : 1;
    return norm(a.nome).localeCompare(norm(b.nome));
  });

  const presentesCount = items.filter(i => i.status === "Presente").length;
  el.kpiPresentes.textContent = String(presentesCount);
  el.kpiExibidos.textContent = String(filtered.length);

  el.listTitle.textContent = mostrarAusentes
    ? "Professores (presentes e ausentes)"
    : "Professores presentes";

  el.grid.innerHTML = filtered.map(it => {
    const badgeClass = it.status === "Presente" ? "present" : "absent";
    const badgeText = it.status === "Presente" ? "Presente" : "Ausente";

    const hora = it.status === "Presente"
      ? (it.entrada || "--:--:--")
      : (it.saida || (it.entrada || "--:--:--"));

    return `
      <article class="prof">
        <div class="profTop">
          <div>
            <div class="profName">${it.nome}</div>
            <div class="profCourse">Curso: <strong>${courseName(it.curso)}</strong></div>
          </div>
          <div class="badge ${badgeClass}">${badgeText}</div>
        </div>

        <div class="profMeta">
          <div>Hora: <span class="mono">${hora}</span></div>
          <div class="mono">${it.uid}</div>
        </div>
      </article>
    `;
  }).join("");

  if (filtered.length === 0) el.empty.classList.remove("hidden");
  else el.empty.classList.add("hidden");

  el.lastUpdate.textContent = nowBRTime();
}

// ========= Cursos =========
function mountCursosSelect() {
  const current = el.cursoSelect.value;
  const keys = Object.keys(cursos || {});

  keys.sort((a, b) => norm(cursos[a]?.nome || a).localeCompare(norm(cursos[b]?.nome || b)));

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

// ========= Cargas =========
async function carregarCursosLocais() {
  const dados = await apiGet("/api/cursos");

  cursos = {};
  (dados.cursos || []).forEach(curso => {
    cursos[curso.id] = { nome: curso.nome };
  });

  mountCursosSelect();
}

async function carregarPresencasLocais() {
  const dados = await apiGet(`/api/presencas?data=${encodeURIComponent(todayKey())}`);

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
}

async function carregarAvisosLocais() {
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
}

async function atualizarTudo() {
  try {
    await Promise.all([
      carregarCursosLocais(),
      carregarPresencasLocais(),
      carregarAvisosLocais()
    ]);

    render();
    renderAvisos();
    setConnOk();
  } catch (error) {
    console.error("Erro ao atualizar dados locais:", error);
    setConnBad("Erro servidor local");
  }
}

// ========= Start =========
function start() {
  el.todayLabel.textContent = todayLabelBR();

  el.cursoSelect.addEventListener("change", () => {
    filtroCurso = el.cursoSelect.value;
    render();
    renderAvisos();
  });

  el.searchInput.addEventListener("input", () => {
    termoBusca = norm(el.searchInput.value);
    render();
  });

  el.showAbsent.addEventListener("change", () => {
    mostrarAusentes = el.showAbsent.checked;
    render();
  });

  atualizarTudo();

  // atualiza automático
  setInterval(() => {
    atualizarTudo();
  }, 2500);

  // relógio da atualização visual
  setInterval(() => {
    el.lastUpdate.textContent = nowBRTime();
  }, 1000);
}

start();