# 🚀 PresenX - Sistema de Painel Dinâmico (CETEP/LNAB)

O **PresenX** é uma solução de sinalização digital desenvolvida especificamente para o **CETEP/LNAB**. O sistema automatiza a exibição de horários, turmas e status de presença dos professores, eliminando a necessidade de atualizações manuais e quadros físicos.

## ✨ Principais Funcionalidades
* **Troca Automática de Turnos:** O sistema identifica o horário local e exibe as turmas do Matutino, Vespertino ou Noturno automaticamente.
* **Carrossel Inteligente:** Suporte para exibição de múltiplas páginas de turmas em ciclos de tempo configuráveis.
* **Dashboard de Gestão:** Interface administrativa (Firebase) para atualização de status em tempo real.
* **Design Otimizado:** Interface desenvolvida com foco em legibilidade para TVs e monitores de grandes formatos.

## 🛠️ Tecnologias
* **Frontend:** HTML5, CSS3 (Modern UI/UX) e JavaScript (Vanilla).
* **Backend & Database:** Firebase Realtime Database & Auth.
* **Arquitetura:** Organização modular de arquivos para fácil manutenção.

## 📁 Estrutura de Pastas
* `/css`: Arquivos de estilização e identidade visual.
* `/data`: Base de dados das turmas (Matriz de horários).
* `/js`: Motores de lógica, controle de tempo e integração.

## 🔌 Hardware (IoT)
O sistema utiliza um **ESP32** como terminal de coleta de dados, integrado com:
* **MFRC522 (RFID):** Para identificação única de usuários via tags/cartões.
* **LCD 16x2 I2C:** Para feedback visual imediato ao usuário.
* **Comunicação HTTP:** O hardware consome uma API REST local para validação de presença e sincronização de horário.
---
**Desenvolvido por Erick Nascimento** - *Projeto focado em tecnologia assistiva e organização escolar.*
