# scc-severino

Bot unificado do SCC, 100% fiel aos bots antigos:
- scc-avaliacoes
- scc-boost
- scc-sugestoes
- scc-ticket
- scc-ticket-s-wl
- scc-wl

## Como usar
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo `.env.example` para `.env` e coloque seu token do Discord.
3. Inicie o bot:
   ```bash
   npm start
   ```

Cada módulo está em `modules/NOME_DO_MODULO`.

---

## Comandos e Funções

### Whitelist (`modules/wl`)
- `!painel-whitelist` — Cria o painel de whitelist no canal atual (apenas administradores).
- `!wlstatus [@usuário]` — Mostra o status da whitelist do usuário mencionado ou do próprio autor.
- `!resetwl @usuário` — Reseta o status da whitelist do usuário mencionado (apenas administradores).
- **Fluxo:**
  - Painel com botão para iniciar.
  - Modais para perguntas, história, questões obrigatórias.
  - Aprovação automática e atribuição de cargo ao ser aprovado.
  - Logs enviados para canal de logs.

### Tickets (`modules/ticket` e `modules/ticket-s-wl`)
- **Ticket padrão:**
  - `!painel-ticket` — Cria o painel de tickets padrão.
  - `!abrir-ticket [motivo]` — Abre um ticket de suporte.
  - `!fechar-ticket` — Fecha o ticket atual.
  - `!adicionar-usuario @usuário` — Adiciona um usuário ao ticket.
  - `!remover-usuario @usuário` — Remove um usuário do ticket.
- **Ticket de segurança:**
  - `!painel-seguranca` — Cria o painel de tickets de segurança.
  - `!abrir-ticket-seguranca [motivo]` — Abre um ticket de segurança.
  - `!fechar-ticket-seguranca` — Fecha o ticket de segurança atual.
  - `!adicionar-usuario-seguranca @usuário` — Adiciona um usuário ao ticket de segurança.
  - `!remover-usuario-seguranca @usuário` — Remove um usuário do ticket de segurança.
- **Fluxo:**
  - Paineis separados, botões, permissões, categorias e cargos idênticos ao bots-base.
  - Logs de criação/fechamento enviados para os canais corretos.

### Avaliações (`modules/avaliacoes`)
- `!painel-avaliacao` — Cria painéis individuais de avaliação para cada staff (apenas administradores).
- `!gerenciar-paineis-staff` — Remove painéis antigos e recria todos na ordem correta (apenas administradores).
- **Fluxo:**
  - Painéis individuais para cada staff, com embed, botões de 1 a 5 estrelas.
  - Modal para tipo de atendimento e justificativa.
  - Cooldown de 6h por staff.
  - Logs detalhados de cada avaliação no canal de auditoria.
  - Painel individual atualizado em tempo real.

### Sugestões (`modules/sugestoes`)
- **Fluxo:**
  - Usuário envia mensagem no canal de sugestões.
  - Bot deleta a mensagem original e publica embed com sugestão, autor, data, etc.
  - Botões de votação: 👍 (sim) e 👎 (não), com contagem e porcentagem.
  - Criação automática de tópico de debate.
  - Logs de sugestões e votos enviados/atualizados no canal de logs de votos.

### Boost (`modules/boost`)
- Monitoramento automático de eventos de boost no servidor.
- Notificações de boost/removal enviadas para o canal correto.

---

## Resumo dos Comandos

| Comando                                 | Descrição                                                        |
|-----------------------------------------|------------------------------------------------------------------|
| !painel-whitelist                       | Cria painel de whitelist                                         |
| !wlstatus [@usuário]                    | Mostra status da whitelist                                       |
| !resetwl @usuário                       | Reseta status da whitelist                                       |
| !painel-ticket                          | Cria painel de tickets padrão                                    |
| !abrir-ticket [motivo]                  | Abre ticket de suporte                                           |
| !fechar-ticket                          | Fecha ticket atual                                               |
| !adicionar-usuario @usuário             | Adiciona usuário ao ticket                                       |
| !remover-usuario @usuário               | Remove usuário do ticket                                         |
| !painel-seguranca                       | Cria painel de tickets de segurança                              |
| !abrir-ticket-seguranca [motivo]        | Abre ticket de segurança                                         |
| !fechar-ticket-seguranca                | Fecha ticket de segurança atual                                  |
| !adicionar-usuario-seguranca @usuário   | Adiciona usuário ao ticket de segurança                          |
| !remover-usuario-seguranca @usuário     | Remove usuário do ticket de segurança                            |
| !painel-avaliacao                       | Cria painéis de avaliação para staff                             |
| !gerenciar-paineis-staff                | Gerencia/recria painéis de staff                                 |

---

Se quiser detalhes de uso, exemplos ou ajustes, consulte os arquivos de cada módulo ou peça ajuda! 