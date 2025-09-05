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

## Módulos e Comandos

### 🎫 Sistema de Tickets (`modules/ticket`)
**Comandos de Gerenciamento:**
- `!painel-ticket` — Cria o painel de tickets padrão com todas as categorias
- `!abrir-ticket [categoria] [motivo]` — Abre um ticket de suporte
- `!fechar-ticket` — Fecha o ticket atual
- `!ticket-close` — Alias para fechar ticket
- `!adicionar-usuario @usuário` — Adiciona um usuário ao ticket
- `!ticket-add @usuário` — Alias para adicionar usuário
- `!remover-usuario @usuário` — Remove um usuário do ticket
- `!ticket-remove @usuário` — Alias para remover usuário
- `!ticket-status` — Mostra status dos tickets
- `!status-tickets` — Mostra estatísticas dos tickets
- `!status-categorias` — Mostra status das categorias de tickets
- `!ajuda-categorias` — Ajuda sobre categorias de tickets
- `!limpar-tickets [dias]` — Limpa tickets antigos

**Categorias Disponíveis:**
- 📁 **Suporte** — Suporte técnico e ajuda geral
- 🦠 **Reportar Bugs** — Reportar erros e problemas técnicos
- ⚠️ **Denúncias** — Reportar infrações e problemas de conduta
- 💎 **Doações** — Assuntos relacionados a doações
- 🚀 **Boost** — Suporte para membros boosters
- 🏠 **Casas** — Questões relacionadas a casas e propriedades
- 🔍 **Revisão** — Solicitar revisão de advertências e banimentos

### 🛡️ Sistema de Tickets de Segurança (`modules/ticket-s-wl`)
**Comandos de Segurança:**
- `!painel-seguranca` — Cria o painel de tickets de segurança
- `!abrir-ticket-seguranca [motivo]` — Abre um ticket de segurança
- `!fechar-ticket-seguranca` — Fecha o ticket de segurança atual
- `!adicionar-usuario-seguranca @usuário` — Adiciona usuário ao ticket de segurança
- `!remover-usuario-seguranca @usuário` — Remove usuário do ticket de segurança
- `!ticket` — Comando genérico de ticket

### 📝 Sistema de Whitelist (`modules/wl`)
**Comandos de Whitelist:**
- `!painel-whitelist` — Cria o painel de whitelist (apenas administradores)
- `!wlstatus [@usuário]` — Mostra o status da whitelist do usuário
- `!resetwl @usuário` — Reseta o status da whitelist (apenas administradores)

**Fluxo da Whitelist:**
- Formulário com perguntas obrigatórias (questões 5 a 12)
- Necessário acertar TODAS para aprovação
- 2 tentativas com cooldown de 24h
- Aprovação automática e atribuição de cargo
- Logs enviados para canal de logs

### ⭐ Sistema de Avaliações (`modules/avaliacoes`)
**Comandos de Avaliação:**
- `!ajuda-avaliacao` — Mostra ajuda sobre o sistema de avaliações

**Funcionalidades:**
- Painéis individuais para cada staff (CEO, CM, MOD, CRD, SEG, SUP, AJD)
- Botões de 1 a 5 estrelas para avaliação
- Modal para tipo de atendimento (ticket/call) e justificativa
- Cooldown de 6h por staff
- Logs detalhados no canal de auditoria
- Atualização em tempo real dos painéis

### 💡 Sistema de Sugestões (`modules/sugestoes`)
**Comandos de Sugestões:**
- `!ajuda-sugestao` — Mostra ajuda sobre o sistema de sugestões

**Funcionalidades:**
- Sistema automático - basta enviar mensagem no canal
- Conversão automática em embed com votação
- Botões 👍 (sim) e 👎 (não) com contagem e porcentagem
- Criação automática de thread para debate
- Logs de sugestões e votos em canal separado

### 🚫 Sistema de Sugestões Ilegais (`modules/sugestoes-ilegal`)
**Comandos de Sugestões Ilegais:**
- `!ajuda-sugestao-ilegal` — Mostra ajuda sobre sugestões ilegais
- `!teste-sugestao-ilegal` — Testa o módulo de sugestões ilegais

**Funcionalidades:**
- Sistema similar ao de sugestões normais
- Canal específico para sugestões ilegais
- Sistema de votação e debate separado

### 🔄 Sistema de Liberação (`modules/liberacao`)
**Comandos de Liberação:**
- `!liberar @usuário [nome]` — Libera um usuário específico (canal de liberação)
- `!teste-liberacao` — Testa o módulo de liberação

**Funcionalidades:**
- Alteração automática de nickname
- Adição/remoção de cargos específicos
- Verificação de permissões e hierarquia
- Logs de liberação

### 🏷️ Sistema de AltNomes (`modules/altnomes`)
**Comandos de AltNomes:**
- `!teste-altnomes` — Testa o módulo de alteração de nomes

**Funcionalidades:**
- Alteração automática de nicknames via reação
- Canal específico para alteração de nomes
- Formatação automática (primeira letra maiúscula)
- Verificação de permissões

### 🏷️ Sistema de Tag Season (`modules/tagseason`)
**Comandos de Tag Season:**
- `!tag-season` — Comando para sistema de tags sazonais

### 🚀 Sistema de Boost (`modules/boost`)
**Funcionalidades:**
- Monitoramento automático de eventos de boost
- Notificações de boost/removal
- Logs enviados para canal específico

### 🗑️ Sistema de Limpar Chat (`modules/limparchat`)
**Funcionalidades:**
- Limpeza automática de mensagens
- Configurações específicas por canal

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
**Respostas Automáticas:**
- `.` → Resposta sobre contratação
- `staff on` → Informações sobre ajuda
- `comando`/`comandos` → Link para comandos da cidade
- `limbo` → Link para teste de renderização
- `rr` → Link para horários de RR
- `tutorial`/`tutoriais` → Link para tutoriais

---

## Resumo Completo dos Comandos

| Módulo | Comando | Descrição | Permissão |
|--------|---------|-----------|-----------|
| **Tickets** | `!painel-ticket` | Cria painel de tickets padrão | - |
| | `!abrir-ticket [categoria] [motivo]` | Abre ticket de suporte | - |
| | `!fechar-ticket` | Fecha ticket atual | - |
| | `!adicionar-usuario @usuário` | Adiciona usuário ao ticket | - |
| | `!remover-usuario @usuário` | Remove usuário do ticket | - |
| | `!status-tickets` | Mostra status dos tickets | - |
| | `!status-categorias` | Mostra status das categorias | - |
| | `!ajuda-categorias` | Ajuda sobre categorias | - |
| | `!limpar-tickets [dias]` | Limpa tickets antigos | - |
| **Tickets Segurança** | `!painel-seguranca` | Cria painel de tickets de segurança | - |
| | `!abrir-ticket-seguranca [motivo]` | Abre ticket de segurança | - |
| | `!fechar-ticket-seguranca` | Fecha ticket de segurança | - |
| | `!adicionar-usuario-seguranca @usuário` | Adiciona usuário ao ticket de segurança | - |
| | `!remover-usuario-seguranca @usuário` | Remove usuário do ticket de segurança | - |
| **Whitelist** | `!painel-whitelist` | Cria painel de whitelist | Administrador |
| | `!wlstatus [@usuário]` | Mostra status da whitelist | - |
| | `!resetwl @usuário` | Reseta status da whitelist | Administrador |
| **Avaliações** | `!ajuda-avaliacao` | Ajuda sobre avaliações | - |
| **Sugestões** | `!ajuda-sugestao` | Ajuda sobre sugestões | - |
| **Sugestões Ilegais** | `!ajuda-sugestao-ilegal` | Ajuda sobre sugestões ilegais | - |
| | `!teste-sugestao-ilegal` | Testa módulo de sugestões ilegais | - |
| **Liberação** | `!liberar @usuário [nome]` | Libera usuário | Canal específico |
| | `!teste-liberacao` | Testa módulo de liberação | - |
| **AltNomes** | `!teste-altnomes` | Testa módulo de altnomes | Canal específico |
| **Tag Season** | `!tag-season` | Sistema de tags sazonais | - |

---

## Canais Específicos

- **Liberação:** `1317096106844225586`
- **AltNomes:** `1413150739290918962`
- **Bate-Bapo:** `1046404065690652745`

---

Se quiser detalhes de uso, exemplos ou ajustes, consulte os arquivos de cada módulo ou peça ajuda! 