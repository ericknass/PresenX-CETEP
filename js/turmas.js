console.log("TURMAS JS ORGANIZADO CARREGOU");

const el = {
  dot: document.getElementById("dot-status"),
  status: document.getElementById("text-status"),
  todayLabel: document.getElementById("todayLabel"),
  horaAtualLabel: document.getElementById("horaAtualLabel"),
  diaSemanaGrande: document.getElementById("diaSemanaGrande"),
  horarioGrande: document.getElementById("horarioGrande"),
  gridTurmas: document.getElementById("gridTurmas"),
  emptyTurmas: document.getElementById("emptyTurmas"),
};

let presencas = {};
let usuarios = {};

const horariosTurmas = {
  ...turmasMatutino,
  ...turmasVespertino,
  ...turmasNoturno
};

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

function norm(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hojeBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function horaAgoraBR() {
  return new Date().toLocaleTimeString("pt-BR");
}

function diaSemanaKey() {
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  return dias[new Date().getDay()];
}

function nomeDiaSemana(diaKey) {
  const mapa = {
    dom: "Domingo",
    seg: "Segunda-feira",
    ter: "Terça-feira",
    qua: "Quarta-feira",
    qui: "Quinta-feira",
    sex: "Sexta-feira",
    sab: "Sábado"
  };
  return mapa[diaKey] || diaKey;
}

function horaParaMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function minutosAgora() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function descobrirFaixaAtual() {
  const agora = minutosAgora();

  for (const [turno, faixas] of Object.entries(horariosTurnos)) {
    for (const [chave, faixa] of Object.entries(faixas)) {
      const ini = horaParaMinutos(faixa.inicio);
      const fim = horaParaMinutos(faixa.fim);

      if (agora >= ini && agora < fim) {
        return {
          turno,
          horario: chave === "intervalo" ? "intervalo" : Number(chave)
        };
      }
    }
  }

  return null;
}

function textoHorarioPainel(faixa) {
  if (!faixa) return "Fora do turno";
  if (faixa.horario === "intervalo") return "Intervalo";
  return `${faixa.horario}º horário`;
}

async function apiGet(url) {
  const resposta = await fetch(url);
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro na API");
  }

  return dados;
}

async function carregarUsuariosLocais() {
  const dados = await apiGet("/api/usuarios");

  usuarios = {};
  (dados.usuarios || []).forEach(usuario => {
    usuarios[usuario.uid] = usuario;
  });
}

async function carregarPresencasLocais() {
  const dados = await apiGet(`/api/presencas?data=${encodeURIComponent(todayKey())}`);

  presencas = {};
  (dados.presencas || []).forEach(p => {
    presencas[p.uid] = p;
  });
}

function algumProfessorPresente(listaProfessores = []) {
  return listaProfessores.some(nomeProfessor => {
    const nomeNorm = norm(nomeProfessor);

    return Object.values(presencas).some(p =>
      p.status === "Presente" && norm(p.nome) === nomeNorm
    );
  });
}

function render() {
  const dia = diaSemanaKey();
  const faixa = descobrirFaixaAtual();

  el.todayLabel.textContent = hojeBR();
  el.horaAtualLabel.textContent = horaAgoraBR();
  el.diaSemanaGrande.textContent = nomeDiaSemana(dia);
  el.horarioGrande.textContent = textoHorarioPainel(faixa);

  let lista = Object.values(horariosTurmas);

  if (faixa && faixa.turno) {
    lista = lista.filter(t => t.turno === faixa.turno);
  }

  const cards = lista.map(turma => {
    let aula = null;

    if (faixa && typeof faixa.horario === "number") {
      aula = turma?.dias?.[dia]?.[faixa.horario] || null;
    }

    let classeCor = "cinza";
    let disciplina = "-";
    let professoresTexto = "-";

    if (!faixa) {
      disciplina = "Sem aula agora";
      professoresTexto = "Fora do turno";
    } else if (faixa.horario === "intervalo") {
      disciplina = "Intervalo";
      professoresTexto = "Sem aula";
      classeCor = "cinza";
    } else if (aula) {
      disciplina = aula.disciplina || "-";
      professoresTexto = (aula.professores || []).join(" / ") || "-";

      const presente = algumProfessorPresente(aula.professores || []);
      classeCor = presente ? "verde" : "vermelho";
    } else {
      disciplina = "Sem aula";
      professoresTexto = "Nenhum professor";
      classeCor = "cinza";
    }

    return `
      <article class="turma-box ${classeCor}">
        <div class="turma-topo">
          <div class="turma-titulo">${turma.turma}</div>
          <div class="turma-turno">${turma.turno}</div>
        </div>

        <div class="turma-info">
          <div class="turma-bloco">
            <span class="turma-label">Matéria</span>
            <span class="turma-valor">${disciplina}</span>
          </div>

          <div class="turma-bloco">
            <span class="turma-label">Professor</span>
            <span class="turma-valor">${professoresTexto}</span>
          </div>
        </div>
      </article>
    `;
  });

  el.gridTurmas.innerHTML = cards.join("");

  if (lista.length === 0) {
    el.emptyTurmas.classList.remove("hidden");
  } else {
    el.emptyTurmas.classList.add("hidden");
  }
}

async function atualizarTudo() {
  try {
    await Promise.all([
      carregarUsuariosLocais(),
      carregarPresencasLocais()
    ]);

    render();
    setConnOk();
  } catch (error) {
    console.error(error);
    setConnBad("Erro servidor local");
  }
}

function start() {
  render();
  atualizarTudo();

  setInterval(() => {
    atualizarTudo();
  }, 2500);

  setInterval(() => {
    render();
  }, 1000);
}

start();