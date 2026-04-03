console.log("PAINEL GRADE JS CARREGOU");

const el = {
  painelDia: document.getElementById("painelDia"),
  painelHorario: document.getElementById("painelHorario"),
  painelTurno: document.getElementById("painelTurno"),
  painelData: document.getElementById("painelData"),
  painelHoraAtual: document.getElementById("painelHoraAtual"),
  painelGrade: document.getElementById("painelGrade"),
  painelVazio: document.getElementById("painelVazio"),
  painelPagina: document.getElementById("painelPagina"),
};

let presencas = {};
let paginaAtual = 0;

const horariosTurmas = {
  ...turmasMatutino,
  ...turmasVespertino,
  ...turmasNoturno
};

const ITENS_POR_PAGINA = 20;
const TEMPO_TROCA_PAGINA = 8000;

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
    sex: "Sexta-feira"
  };
  return mapa[diaKey] || diaKey;
}

function nomeTurno(turno) {
  const mapa = {
    matutino: "Matutino",
    vespertino: "Vespertino",
    noturno: "Noturno"
  };
  return mapa[turno] || turno;
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

function montarListaAtual() {
  const dia = diaSemanaKey();
  const faixa = descobrirFaixaAtual();

  if (!faixa) {
    return { faixa, lista: [] };
  }

  let lista = Object.values(horariosTurmas).filter(t => t.turno === faixa.turno);

  const quadros = lista.map(turma => {
    let aula = null;

    if (typeof faixa.horario === "number") {
      aula = turma?.dias?.[dia]?.[faixa.horario] || null;
    }

    let classeCor = "cinza";
    let disciplina = "Sem aula";
    let professoresTexto = "Nenhum professor";

    if (faixa.horario === "intervalo") {
      disciplina = "Intervalo";
      professoresTexto = "Sem aula";
      classeCor = "cinza";
    } else if (aula) {
      disciplina = aula.disciplina || "-";

      const listaProfessores = Array.isArray(aula.professores)
        ? aula.professores
        : (aula.professor
            ? (Array.isArray(aula.professor) ? aula.professor : [aula.professor])
            : []);

      professoresTexto = listaProfessores.join(" / ") || "-";

      const presente = algumProfessorPresente(listaProfessores);
      classeCor = presente ? "verde" : "vermelho";
    }

    return {
      turma: turma.turma,
      classeCor,
      disciplina,
      professoresTexto
    };
  });

  quadros.sort((a, b) => norm(a.turma).localeCompare(norm(b.turma)));

  return { faixa, lista: quadros };
}

function paginar(lista, itensPorPagina) {
  const paginas = [];

  for (let i = 0; i < lista.length; i += itensPorPagina) {
    paginas.push(lista.slice(i, i + itensPorPagina));
  }

  return paginas;
}

// ... (mantenha suas funções auxiliares norm, todayKey, etc.)

function render() {
  const agora = new Date(); // Criamos a data uma única vez aqui
  const dia = diaSemanaKey();
  const { faixa, lista } = montarListaAtual();

  // 1. Atualização de UI básica (Rápida)
  el.painelDia.textContent = nomeDiaSemana(dia);
  el.painelHorario.textContent = textoHorarioPainel(faixa);
  el.painelTurno.textContent = faixa ? nomeTurno(faixa.turno) : "Sem turno";
  el.painelData.textContent = agora.toLocaleDateString("pt-BR");
  el.painelHoraAtual.textContent = agora.toLocaleTimeString("pt-BR");

  // 2. Lógica de Grade
  if (!faixa || lista.length === 0) {
    el.painelGrade.innerHTML = "";
    el.painelGrade.style.display = "none";
    el.painelVazio.style.display = "flex";
    el.painelPagina.textContent = "Página 1/1";
    return;
  }

  el.painelVazio.style.display = "none";
  el.painelGrade.style.display = "grid";

  const paginas = paginar(lista, ITENS_POR_PAGINA);
  paginaAtual = paginaAtual >= paginas.length ? 0 : paginaAtual;

  const pagina = paginas[paginaAtual] || [];

  // Mapeia os itens (Otimizado: gera o HTML de uma vez)
  el.painelGrade.innerHTML = pagina.map(item => `
    <article class="painel-quadro ${item.classeCor}">
      <div class="painel-turma">${item.turma}</div>
      <div class="painel-conteudo">
        <div class="painel-linha">
          <span class="painel-label">Disciplina:</span>
          <span class="painel-valor">${item.disciplina}</span>
        </div>
        <div class="painel-linha">
          <span class="painel-label">Professor:</span>
          <span class="painel-valor">${item.professoresTexto}</span>
        </div>
      </div>
    </article>
  `).join("");

  el.painelPagina.textContent = `Página ${paginaAtual + 1}/${paginas.length}`;
}

// ORGANIZAÇÃO DOS INTERVALOS (O "Start" inteligente)
function start() {
  // Loop 1: Relógio e UI (1 segundo) - Fluidez visual
  setInterval(() => {
    render();
  }, 1000);

  // Loop 2: Dados da API (Mais lento, para não sobrecarregar o servidor)
  // 5 a 10 segundos é o ideal para um painel de TV
  setInterval(async () => {
    try {
      await carregarPresencasLocais();
    } catch (e) {
      console.error("Erro ao buscar API:", e);
    }
  }, 10000); 

  // Loop 3: Troca de Página
  setInterval(() => {
    const { lista } = montarListaAtual();
    const paginas = paginar(lista, ITENS_POR_PAGINA);
    if (paginas.length > 1) {
      paginaAtual = (paginaAtual + 1) % paginas.length;
    }
  }, TEMPO_TROCA_PAGINA);

  // Execução inicial
  render();
}

start();