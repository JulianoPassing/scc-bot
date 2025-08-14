# Módulo de Tickets - StreetCarClub

## Descrição
Sistema completo de tickets para o servidor StreetCarClub, permitindo que usuários abram tickets de suporte em diferentes categorias.

## Funcionalidades

### Abertura de Tickets
- **Comando:** `!abrir-ticket [motivo]`
- **Categorias disponíveis:**
  - 📁 Suporte - Suporte técnico e ajuda geral
  - 🦠 Reportar Bugs - Reportar erros e problemas técnicos
  - 🚀 Boost - Suporte para membros boosters
  - 🏠 Casas - Questões relacionadas a casas e propriedades
  - 💎 Doações - Assuntos relacionados a doações
  - ⚠️ Denúncias - Reportar infrações e problemas de conduta
  - 🔍 Revisão - Solicitar revisão de decisões e processos

### Fechamento de Tickets
- **Comandos disponíveis:**
  - `!fechar-ticket` - Fecha o ticket atual
  - `!ticket-close` - Comando alternativo para fechar tickets
- **Botão de fechamento** - Disponível em todos os tickets
- **Timer automático** - Fecha tickets após 24h de inatividade

### Nova Funcionalidade: Mensagem de Avaliação
Quando um ticket é fechado (por qualquer método), o sistema automaticamente:
1. **Identifica o criador** do ticket
2. **Envia uma mensagem privada** solicitando avaliação
3. **Inclui link direto** para o canal de avaliações
4. **Informa detalhes** do ticket fechado

**Mensagem enviada:**
```
🎫 Ticket Fechado - Avalie seu Atendimento

Olá! Seu ticket foi fechado pela nossa equipe.

Não se esqueça de avaliar seu último atendimento!

Sua opinião é muito importante para continuarmos melhorando nossos serviços.

📝 Avalie aqui: [Link para canal de avaliações]
```

### Gestão de Tickets
- **Adicionar membros** ao ticket
- **Avisar membros** sobre atualizações
- **Renomear tickets** para melhor organização
- **Assumir tickets** para controle de atendimento
- **Timer de 24h** para evitar tickets abandonados

### Sistema de Logs
- **Transcript completo** de todos os tickets fechados
- **Canal de logs** para auditoria
- **Registro de atividades** com timestamps

## Comandos da Staff

### Comandos Básicos
- `!fechar-ticket` - Fecha o ticket atual
- `!ticket-close` - Comando alternativo para fechar tickets
- `!adicionar-usuario [ID]` - Adiciona usuário ao ticket
- `!remover-usuario [ID]` - Remove usuário do ticket

### Comandos de Gestão
- `!painel-ticket` - Exibe painel de controle de tickets
- `!status-tickets` - Mostra status de todos os tickets
- `!status-categorias` - Exibe informações sobre categorias
- `!limpar-tickets` - Limpa registros de tickets deletados

### Comandos de Ajuda
- `!ajuda-categorias` - Explica as categorias disponíveis
- `!ajuda-avaliacao` - Informações sobre o sistema de avaliação

## Configuração

### Categorias
As categorias são configuradas no arquivo `config.js` com:
- IDs dos canais
- Emojis representativos
- Descrições
- Cargos de staff autorizados

### Permissões
- **Criadores:** Visualizar, enviar mensagens, anexar arquivos
- **Staff:** Todas as permissões + gerenciar mensagens e canais

## Arquivos Principais

- `index.js` - Ponto de entrada do módulo
- `loader.js` - Carregador de comandos e eventos
- `config.js` - Configurações das categorias
- `utils/ticketManager.js` - Gerenciamento de dados dos tickets
- `utils/ticketUtils.js` - Utilitários para criação de tickets
- `utils/permissions.js` - Sistema de permissões
- `events/interactionCreate.js` - Handler de interações (botões, modais)
- `events/channelDelete.js` - Limpeza automática de registros

## Como Funciona

1. **Usuário abre ticket** usando `!abrir-ticket` ou painel
2. **Sistema cria canal** com permissões apropriadas
3. **Ticket é registrado** no sistema de dados
4. **Staff atende** o usuário no canal
5. **Ticket é fechado** por staff ou timer automático
6. **Sistema envia mensagem** privada solicitando avaliação
7. **Transcript é gerado** e enviado para logs
8. **Canal é deletado** após 5 segundos

## Benefícios da Nova Funcionalidade

- **Aumenta engajamento** dos usuários
- **Coleta feedback** sobre qualidade do atendimento
- **Melhora experiência** do usuário
- **Fornece métricas** para a equipe
- **Link direto** para avaliação facilita o processo

## Suporte

Para dúvidas ou problemas com o sistema de tickets, entre em contato com a equipe de desenvolvimento do StreetCarClub. 