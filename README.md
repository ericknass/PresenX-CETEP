# 🚀 PresenX - Sistema de Sinalização Digital & IoT (CETEP/LNAB)

O **PresenX** é um ecossistema de automação escolar desenvolvido para o **CETEP/LNAB**. O sistema integra hardware físico (IoT) e um servidor local para gerenciar e exibir a presença de professores e horários de turmas em tempo real.

---

## ✨ Funcionalidades Principais

* **Identificação por RFID:** Registro de entrada e saída de professores via tags físicas (MFRC522).
* **Painel de Exibição Local:** Interface web otimizada para TVs, que consome dados de um servidor centralizado.
* **Troca Automática de Turnos:** Lógica inteligente que identifica o horário do servidor e alterna entre Matutino, Vespertino e Noturno.
* **Gestão de Dados Massivos:** Processamento de matrizes de horários com mais de 4.500 linhas de configuração em arquivos JS estruturados.
* **Reset Automático:** Rotinas programadas (11:50, 17:50, 23:50) para limpeza de status entre os turnos escolares.

---

## 🛠️ Tecnologias Utilizadas

### **Ecossistema Full Stack**
* **Frontend:** HTML5, CSS3 (Modern UI) e JavaScript Vanilla.
* **Backend:** Servidor local (Node.js/API) para processamento de requisições e sincronização de horário.
* **Hardware (IoT):** * Microcontrolador ESP32.
    * Leitor RFID MFRC522 via protocolo SPI.
    * Display LCD 16x2 via protocolo I2C.
---

## 📐 Como o Sistema Funciona

O fluxo de dados do PresenX é 100% integrado:
1. **Captura:** O ESP32 faz o scan do cartão RFID.
2. **Requisição:** O hardware envia o UID via HTTP POST para a API no notebook.
3. **Processamento:** O servidor local valida o usuário, registra o horário e define a ação (entrada/saída).
4. **Atualização:** O Painel Web, conectado ao mesmo servidor, reflete a alteração instantaneamente na tela da TV.

---

## 📁 Estrutura do Repositório

* `/css`: Estilização para displays de grande formato.
* `/data`: Matriz de horários e base de dados dos professores/turmas.
* `/js`: Motores de lógica, controle de tempo e comunicação com a API.
* `/hardware`: Código-fonte (.ino) para o ESP32.

---

## 👨‍💻 Desenvolvedor
**Erick Nascimento** - *Projeto desenvolvido para modernizar a sinalização digital do CETEP/LNAB.*
