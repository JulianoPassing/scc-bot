# scc-severino

Bot unificado do SCC. Módulos carregados em `index.js`:

`altnomes` · `apagar-msg-bot` · `setup-discord` · `auto-atendimento` · `avaliacoes` · `batebapo` · `cargo-permissoes` · `blacklist` · `boost` · `drogas` · `instagram` · `liberacao` · `limparchat` · `notificacao-mencoes` · `regras-acoes` · `sistema-ticket` · `streams` · `sugestoes` · `sugestoes-ilegal` · `sugestoes-pm` · `sugestoes-prs` · `tagseason` · `ticket` · `ticket-s-wl` · `wl`

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

### Produção (PM2)

Na VPS, o projeto costuma ficar em `~/Desktop/scc-bot` com o bot em `scc-severino/`:

```bash
cd ~/Desktop/scc-bot/scc-severino
npm install
pm2 start index.js --name severino   # ou conforme seu ecosystem
pm2 restart severino
pm2 logs severino
pm2 show severino   # confere cwd e script path
```

Antes de editar `avaliacoes.json` em produção, use `pm2 stop` no processo do bot para evitar que a memória sobrescreva o arquivo.

Cada módulo está em `modules/NOME_DO_MODULO`.

---

## Lista completa de comandos (`!`)

Comandos processados pelo handler global em `index.js` (`client.commands`) ou por handlers próprios nos módulos.

| Comando | Módulo | Descrição | Permissão / observação |
|---------|--------|-----------|------------------------|
| `!painel-ticket` | ticket | Cria o painel de tickets padrão | Staff |
| `!abrir-ticket [categoria] [motivo]` | ticket | Abre ticket de suporte | Staff |
| `!fechar-ticket` | ticket | Fecha o ticket atual | No canal do ticket |
| `!ticket-close` | ticket | Alias de `!fechar-ticket` | No canal do ticket |
| `!adicionar-usuario @usuário` | ticket | Adiciona usuário ao ticket | No canal do ticket |
| `!ticket-add @usuário` | ticket | Alias de adicionar usuário | No canal do ticket |
| `!remover-usuario @usuário` | ticket | Remove usuário do ticket | No canal do ticket |
| `!ticket-remove @usuário` | ticket | Alias de remover usuário | No canal do ticket |
| `!ticket-status` | ticket | Status dos tickets do usuário | — |
| `!status-tickets` | ticket | Tickets ativos de um usuário | — |
| `!status-categorias` | ticket | Status das categorias de ticket | Staff |
| `!ajuda-categorias` | ticket | Ajuda sobre categorias e limpeza | — |
| `!limpar-tickets [dias]` | ticket | Limpa tickets deletados do registro | Staff |
| `!painel-seguranca` | ticket-s-wl | Cria painel de tickets de segurança | Admin |
| `!abrir-ticket-seguranca [motivo]` | ticket-s-wl | Abre ticket de segurança | — |
| `!fechar-ticket-seguranca` | ticket-s-wl | Fecha ticket de segurança | No canal do ticket |
| `!adicionar-usuario-seguranca @usuário` | ticket-s-wl | Adiciona usuário ao ticket de segurança | No canal do ticket |
| `!remover-usuario-seguranca @usuário` | ticket-s-wl | Remove usuário do ticket de segurança | No canal do ticket |
| `!painel-whitelist` | wl | Cria painel de whitelist | Administrador |
| `!painel-idade` | wl | Publica aviso 18+ e painel de verificação etária | Administrador |
| `!wlstatus [@usuário]` | wl | Status da whitelist | — |
| `!resetwl @usuário` | wl | Reseta whitelist do usuário | Administrador |
| `!painel-avaliacao` | avaliacoes | Cria painéis de avaliação por staff | CM+ (handler no `index.js` do módulo) |
| `!gerenciar-paineis-staff` | avaliacoes | Recria painéis no canal oficial | CM+ |
| `!relatorio-avaliacoes` | avaliacoes | Gera relatório HTML | CM+ |
| `!zerar-avaliacoes` | avaliacoes | Zera todas as avaliações (confirmação) | CM+ |
| `!debug-avaliacoes` | avaliacoes | Debug do JSON em memória/arquivo | CM+ |
| `!liberar @usuário [nome]` | liberacao | Libera usuário (nickname + cargos) | Canal de liberação |
| `!teste-liberacao` | liberacao | Testa o módulo de liberação | — |
| `!painel-autoatendimento` | auto-atendimento | Cria painel de auto-atendimento | Servidor/canal configurados |
| `!tag-season` | tagseason | Painel tag temporada 04 | Canal específico |
| `!sistema-ticket` | sistema-ticket | Painel do sistema de tickets web | — |
| `!setup-armageddon` | setup-discord | Cria estrutura completa do servidor Armageddon | Usuário autorizado + permissões do bot |
| `!clonar-permissoes-idade` | cargo-permissoes | Espelha overwrites Morador → Idade verificada | Admin / servidor configurado |
| `!clonar-canal-teste` | cargo-permissoes | Teste de clone de overwrites de canal | Admin |
| `!teste-morador-para-idade` | cargo-permissoes | Teste Morador → Idade verificada (REST) | Admin |
| `!limparchat` | limparchat | Limpa todas as mensagens do canal (confirmação) | Cargos permitidos no módulo |
| `!regras-acoes` | regras-acoes | Publica embed de regras de ações no canal #acoes | Admin |
| `!relatorio-streamers` | streams | Relatório HTML de criadores de conteúdo | Admin + canal autorizado |
| `!remover-streamer` + IDs | streams | Remove cargo Criador de Conteúdo por Discord ID | Admin + canal autorizado |

### Comandos sem prefixo `!` (por contexto)

| Texto / comando | Módulo | Onde | Descrição |
|-----------------|--------|------|-----------|
| `!status` | ticket-s-wl | Canal de config de agendamento | Status do agendamento (uptime, pendentes) |
| JSON no canal de config | ticket-s-wl | Canal de config de agendamento | Atualiza `agenda` / `mensagens` do agendamento |
| `agendamento` | ticket-s-wl | Ticket `seg-*` (criador do ticket) | Inicia fluxo de agendamento |
| `reagendar` | ticket-s-wl | Ticket `seg-*` agendado | Reagenda (staff) |

### Arquivos em `commands/` não registrados no bot

Existem em `modules/*/commands/` mas **não** entram em `client.commands` (o `!comando` no Discord **não funciona** até registrar no loader):

| Arquivo | Comando esperado |
|---------|------------------|
| `avaliacoes/commands/ajuda-avaliacao.js` | `!ajuda-avaliacao` |
| `sugestoes/commands/ajuda-sugestao.js` | `!ajuda-sugestao` |
| `sugestoes-ilegal/commands/ajuda-sugestao-ilegal.js` | `!ajuda-sugestao-ilegal` |
| `sugestoes-ilegal/commands/teste-sugestao-ilegal.js` | `!teste-sugestao-ilegal` |
| `sugestoes-pm/commands/ajuda-sugestao-pm.js` | `!ajuda-sugestao-pm` |
| `sugestoes-prs/commands/ajuda-sugestao-prs.js` | `!ajuda-sugestao-prs` |
| `altnomes/commands/teste-altnomes.js` | `!teste-altnomes` |

> Os módulos de sugestões funcionam **enviando mensagem no canal** (sem `!`). Ver seções abaixo.

---

## Módulos e detalhes

### 🎫 Sistema de Tickets (`modules/ticket`)

Comandos: ver tabela acima (`!painel-ticket` até `!limpar-tickets`).

**Categorias do painel:**
- 📁 **Suporte** — Suporte técnico e ajuda geral
- 🦠 **Reportar Bugs** — Reportar erros e problemas técnicos
- ⚠️ **Denúncias** — Reportar infrações e problemas de conduta
- 💎 **Doações** — Assuntos relacionados a doações
- 🚀 **Boost** — Suporte para membros boosters
- 🏠 **Casas** — Questões relacionadas a casas e propriedades
- 🔍 **Revisão** — Solicitar revisão de advertências e banimentos

### 🛡️ Sistema de Tickets de Segurança (`modules/ticket-s-wl`)

Comandos `!`: ver tabela (`!painel-seguranca` até `!remover-usuario-seguranca`).

**Agendamento (sem `!`, dentro do ticket `seg-*`):** `agendamento` (criador), `reagendar` (staff). No canal de config: `!status` e postagem de JSON.

### 📝 Sistema de Whitelist (`modules/wl`)

Comandos: `!painel-whitelist`, `!painel-idade`, `!wlstatus`, `!resetwl`.

**Fluxo da Whitelist:**
- Formulário com perguntas obrigatórias (questões 5 a 12)
- Necessário acertar TODAS para aprovação
- 2 tentativas com cooldown de 24h
- Aprovação automática e atribuição de cargo
- Logs enviados para canal de logs

### ⭐ Sistema de Avaliações (`modules/avaliacoes`)

Comandos ativos (handler em `modules/avaliacoes/index.js`): `!painel-avaliacao`, `!gerenciar-paineis-staff`, `!relatorio-avaliacoes`, `!zerar-avaliacoes`, `!debug-avaliacoes`.

**Funcionalidades:**
- Painéis individuais para cada staff (CEO, CM, MOD, CRD, SEG, SUP, AJD)
- Botões de 1 a 5 estrelas para avaliação
- Modal para tipo de atendimento (ticket/call) e justificativa
- Cooldown de 6h por staff
- Logs detalhados no canal de auditoria
- Atualização em tempo real dos painéis
- Relatório HTML profissional com estatísticas completas
- Sistema de zerar avaliações com confirmação
- Ordenação por hierarquia de cargos
- Resposta do modal com `deferReply` (evita falha na primeira interação por timeout da API do Discord)

**Arquivo de dados:** `modules/avaliacoes/avaliacoes.json`

Cada staff é identificado pelo ID do Discord. Estrutura de cada entrada:

| Campo | Descrição |
|-------|-----------|
| `total` | Soma de todas as notas (1 a 5) recebidas |
| `count` | Quantidade de avaliações |
| `panelMessageId` | ID da mensagem do painel no Discord |
| `panelChannelId` | ID do canal do painel |

**Média exibida:** `total / count` (máximo teórico: **5.00**). Se `total > count * 5`, o painel mostra média acima de 5 (dados inconsistentes).

**Relatório HTML:**
- Visual moderno com gradientes e animações
- Estatísticas gerais: total de staff, avaliações, média geral
- Cards individuais para cada staff com:
  - Nome e nota atual (estrelas visuais)
  - Total de avaliações e pontos acumulados
  - Média calculada e percentual de participação
- Ordenação por hierarquia e, em empate, por melhor nota média
- Design responsivo para mobile e desktop
- Arquivo temporário enviado via Discord

#### Editar avaliações manualmente (VPS / produção)

O bot carrega o JSON **apenas na inicialização** e grava no arquivo quando há nova avaliação ou ao recriar painéis. Para alterações manuais:

1. **Parar o bot** (recomendado): `pm2 stop <id-ou-nome>`
2. Editar `scc-severino/modules/avaliacoes/avaliacoes.json` (caminho relativo à pasta do projeto no servidor)
3. **Iniciar/reiniciar:** `pm2 restart <id-ou-nome>`
4. No Discord, rodar **`!painel-avaliacao`** no canal desejado para atualizar os embeds

> **Atenção:** Se você editar o JSON com o bot ligado e depois rodar `!painel-avaliacao` ou receber novas avaliações, o processo em memória pode **sobrescrever** o arquivo com valores antigos. Sempre pare o bot antes de editar em produção, ou reinicie logo após salvar.

**Exemplo — definir 1000 avaliações de 5 estrelas para um staff:**

```json
"405487427327885313": {
  "total": 5000,
  "count": 1000,
  "panelMessageId": "...",
  "panelChannelId": "1394727160991842324"
}
```

(`total` = `count` × nota desejada; para só 5 estrelas: `total = count * 5`)

#### Scripts de manutenção (Node, na raiz do repositório)

Caminho do arquivo nos comandos abaixo: `scc-severino/modules/avaliacoes/avaliacoes.json`

**Remover 1 avaliação de nota 1 de todos** (reduz `count` e `total` em 1 onde `count > 0`):

```bash
node -e "const fs=require('fs');const p='scc-severino/modules/avaliacoes/avaliacoes.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));for(const id of Object.keys(j)){if(j[id].count>0){j[id].count-=1;j[id].total-=1;}}fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('OK aplicado em',p);"
```

**Corrigir médias acima de 5** (limita `total` a `count * 5`, sem alterar `count`):

```bash
node -e "const fs=require('fs');const p='scc-severino/modules/avaliacoes/avaliacoes.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));for(const id of Object.keys(j)){const c=Number(j[id].count)||0;const t=Number(j[id].total)||0;const max=c*5;if(t>max) j[id].total=max;}fs.writeFileSync(p,JSON.stringify(j,null,2));console.log('OK normalizado');"
```

**Ajustar um staff específico** (substitua o ID):

```bash
node -e "const fs=require('fs');const p='scc-severino/modules/avaliacoes/avaliacoes.json';const id='405487427327885313';const j=JSON.parse(fs.readFileSync(p,'utf8'));j[id].total=5000;j[id].count=1000;fs.writeFileSync(p,JSON.stringify(j,null,2));console.log(j[id]);"
```

**Validar um registro:**

```bash
node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('scc-severino/modules/avaliacoes/avaliacoes.json','utf8'));const s=j['405487427327885313'];console.log(s,(s.total/s.count).toFixed(2));"
```

#### Problemas comuns (avaliações)

| Sintoma | Causa provável | O que fazer |
|---------|----------------|-------------|
| Nota no painel não muda após editar JSON | Bot não reiniciado ou painéis não recriados | `pm2 restart` + `!painel-avaliacao` |
| JSON volta aos valores antigos após restart | Outra instância PM2 ou edição com bot ligado | `pm2 list` / `pm2 show <id>`; parar todas, editar, subir só o processo certo |
| `ENOENT` ao rodar script Node | Caminho errado (falta `scc-severino/`) | Executar na pasta do repo (`~/Desktop/scc-bot`) e usar o path completo acima |
| Média **5.11 / 5.00** no embed | `total` maior que `count * 5` | Rodar script de normalização e recriar painéis |
| Primeiro clique no botão falha, segundo funciona | Timeout antes da resposta (corrigido com `deferReply` no modal) | Garantir código atualizado e reiniciar o bot |

### 💡 Sistema de Sugestões (`modules/sugestoes`)

Sem comando `!` ativo. Envie texto no **canal de sugestões** → embed + votação 👍/👎 + thread + logs.

### 🚫 Sugestões Ilegais (`modules/sugestoes-ilegal`)

Igual ao módulo de sugestões, em canal/servidor próprios. Arquivos `!ajuda-*` / `!teste-*` existem mas não estão registrados no bot.

### 👮 Sugestões PM (`modules/sugestoes-pm`) · 🏛️ Sugestões PRS (`modules/sugestoes-prs`)

Automáticos por mensagem no canal configurado (sem `!` registrado).

### 📺 Streams / Criadores de Conteúdo (`modules/streams`)

- `!relatorio-streamers` — relatório HTML (canal autorizado, admin)
- `!remover-streamer` + linhas com Discord ID — remove cargo Criador de Conteúdo

### 📋 Regras de Ações (`modules/regras-acoes`)

- `!regras-acoes` — publica embed com link das regras no canal #acoes (admin)

### 🔄 Sistema de Liberação (`modules/liberacao`)

Comandos: `!liberar`, `!teste-liberacao`.

**Funcionalidades:**
- Alteração automática de nickname
- Adição/remoção de cargos específicos
- Verificação de permissões e hierarquia
- Logs de liberação

### 🏷️ Sistema de AltNomes (`modules/altnomes`)

Sem `!` ativo. No canal configurado: poste **nome sobrenome** e reaja com o emoji de confirmação → nickname formatado.

### 🏷️ Tag Season (`modules/tagseason`)

- `!tag-season` — painel de resgate (canal fixo no comando)

### ⚙️ Cargo e permissões (`modules/cargo-permissoes`)

- `!clonar-permissoes-idade`
- `!clonar-canal-teste`
- `!teste-morador-para-idade`

### 🤖 Auto-atendimento (`modules/auto-atendimento`)

- `!painel-autoatendimento`

### 🎫 Sistema de tickets web (`modules/sistema-ticket`)

- `!sistema-ticket` — painel com link do sistema web

### 🛠️ Setup Discord (`modules/setup-discord`)

- `!setup-armageddon` — cria categorias, canais, cargos e permissões (usuário autorizado)

### 🗑️ Limpar chat (`modules/limparchat`)

- `!limparchat` — apaga mensagens do canal após confirmação `CONFIRMAR`

### 🚀 Sistema de Boost (`modules/boost`)
**Funcionalidades:**
- Monitoramento automático de eventos de boost
- Notificações de boost/removal
- Logs enviados para canal específico

### 📱 Sistema de Instagram (`modules/instagram`)
**Funcionalidades:**
- Integração com Instagram
- Notificações de posts

### 🚫 Sistema de Blacklist (`modules/blacklist`)
**Funcionalidades:**
- Sistema de blacklist de usuários
- Monitoramento de mensagens
- Ações automáticas para usuários blacklistados

### 💊 Sistema de Drogas (`modules/drogas`)
**Funcionalidades:**
- Monitoramento de conteúdo relacionado a drogas
- Ações automáticas para violações

### 💬 Sistema de Bate-Bapo (`modules/batebapo`)

Canal fixo: `1046404065690652745` (membros com cargo staff são ignorados). **Não usa `!`** — respostas por palavra/frase na mensagem:

| Gatilho | Resposta |
|---------|----------|
| `.` (exato) | Mensagem sobre contratação / Noel |
| contém `staff` | Ticket ou call de suporte |
| `comando` / `comandos` | Canal de comandos da cidade |
| `limbo` | Canal de renderização |
| `rr` (palavra isolada) | Horários de RR |
| `tutorial` / `tutoriais` | Canal de tutoriais |
| `caiu` / `f` / `servidor ta off` | Connect, procedimentos, ticket |
| `an` (exato) | Resposta easter egg |
| `emprego` / `empregos` | Orientação RP + tutoriais |
| `connect` | Connect F8 |
| `fila` | Dica fila travada |
| `veloster` / `noel` / `ph` / `jeeh` / `jack` (exatos) | Easter eggs |
| contém `abuser` | Easter egg Noel |
| usuário `405487427327885313` + frase especial + menção | Altera apelido “danada do Noel” |

### Módulos sem comandos `!` (apenas eventos / automação)

| Módulo | Função |
|--------|--------|
| `apagar-msg-bot` | Apaga mensagens do bot em canais configurados |
| `blacklist` | Monitora usuários blacklistados |
| `boost` | Log de boost / remoção de boost |
| `drogas` | Monitoramento automático |
| `instagram` | Notificações de posts |
| `notificacao-mencoes` | Notificações de menções |

---

## Canais Específicos

- **Liberação:** `1317096106844225586`
- **AltNomes:** `1413150739290918962`
- **Bate-Bapo:** `1046404065690652745`

---

## Estrutura do projeto

```
scc-severino/
├── index.js              # Entrada do bot
├── modules/
│   ├── avaliacoes/
│   │   ├── index.js
│   │   ├── avaliacoes.json   # Dados persistidos (não commitar alterações de produção sem necessidade)
│   │   └── relatorios/
│   ├── ticket/
│   ├── wl/
│   └── ...
└── README.md
```

---

Se quiser detalhes de uso, exemplos ou ajustes, consulte os arquivos de cada módulo ou peça ajuda!