# Sistema de Tickets - StreetCarClub

## Visão Geral

O sistema de tickets foi completamente refatorado para usar um sistema de permissões centralizado e configurável. Todas as permissões são definidas no arquivo `config.js` e aplicadas automaticamente quando um ticket é criado.

## Configuração de Permissões

### Categorias de Tickets

O sistema suporta 6 categorias de tickets, cada uma com suas próprias permissões:

1. **📁 Suporte** - Suporte técnico e ajuda geral
2. **🦠 Reportar Bugs** - Reportar erros e problemas técnicos  
3. **🚀 Boost** - Suporte para membros boosters
4. **🏠 Casas** - Questões relacionadas a casas e propriedades
5. **💎 Doações** - Assuntos relacionados a doações
6. **⚠️ Denúncias** - Reportar infrações e problemas de conduta

### Permissões por Categoria

#### CATEGORIA SUPORTE
- **Cargos com permissão Staff e Painel:**
  - 1204393192284229692
  - 1046404063673192542
  - 1277638402019430501
  - 1226903187055972484
  - 1226907937117569128
  - 1230131375965737044
  - 1046404063522197521

#### CATEGORIA BUGS
- **Cargos com permissão Staff e Painel:**
  - 1204393192284229692
  - 1046404063673192542
  - 1277638402019430501
  - 1226903187055972484
  - 1226907937117569128
  - 1230131375965737044
  - 1046404063522197521

#### CATEGORIA BOOST
- **Cargos com permissão Staff e Painel:**
  - 1204393192284229692
  - 1046404063673192542
  - 1277638402019430501
  - 1226903187055972484
  - 1226907937117569128
  - 1230131375965737044
  - 1046404063522197521

#### CATEGORIA CASAS
- **Cargos com permissão Staff e Painel:**
  - 1311023008495698081
  - 1046404063522197521

#### CATEGORIA DOAÇÕES
- **Cargos com permissão Staff e Painel:**
  - 1046404063522197521

#### CATEGORIA DENÚNCIAS
- **Cargos com permissão Staff e Painel:**
  - 1277638402019430501
  - 1226903187055972484
  - 1046404063522197521

### Permissões do Criador do Ticket

O criador do ticket sempre recebe as seguintes permissões:
- ✅ Ver Canal
- ✅ Enviar Mensagens
- ✅ Enviar Links
- ✅ Enviar Anexos
- ✅ Ver Histórico

### Permissões da Staff

Os cargos de staff recebem todas as permissões necessárias:
- ✅ Ver Canal
- ✅ Enviar Mensagens
- ✅ Ver Histórico
- ✅ Enviar Anexos
- ✅ Enviar Links
- ✅ Gerenciar Mensagens
- ✅ Gerenciar Canais
- ✅ Usar Emojis Externos
- ✅ Adicionar Reações
- ✅ Mencionar @everyone

## Comandos Disponíveis

### Comandos de Usuário
- `!painel-ticket` - Cria o painel de tickets
- `!abrir-ticket [motivo]` - Abre um ticket de suporte diretamente

### Comandos de Staff
- `!verificar-permissoes` - Verifica as permissões do ticket atual
- `!corrigir-permissoes` - Corrige as permissões de todos os tickets existentes
- `!corrigir-ticket` - Corrige as permissões do ticket atual
- `!status-categorias` - Verifica o status das categorias de tickets
- `!debug-cargos` - Debuga os cargos e suas permissões (Admin)

### Botões do Painel
- **Fechar Ticket** - Fecha o ticket com motivo
- **Assumir Ticket** - Marca o ticket como assumido
- **Adicionar Membro** - Adiciona um membro ao ticket
- **Avisar Membro** - Envia DM para o criador do ticket
- **Renomear Ticket** - Renomeia o ticket
- **Timer 24h** - Inicia timer de 24h para fechamento automático

## Estrutura de Arquivos

```
ticket/
├── config.js                    # Configuração central de permissões
├── commands/
│   ├── painel-ticket.js         # Cria o painel de tickets
│   ├── abrir-ticket.js          # Abre ticket diretamente
│   ├── verificar-permissoes.js  # Verifica permissões
│   ├── corrigir-permissoes.js   # Corrige permissões
│   └── status-categorias.js     # Status das categorias
├── events/
│   └── interactionCreate.js     # Handler de interações
├── utils/
│   └── ticketPermissions.js     # Utilitários de permissões
└── README.md                    # Esta documentação
```

## Como Usar

### Para Administradores

1. **Configurar permissões:** Edite o arquivo `config.js` para ajustar os cargos de staff de cada categoria
2. **Criar painel:** Use `!painel-ticket` para criar o painel de tickets
3. **Corrigir tickets existentes:** Use `!corrigir-permissoes` para aplicar as novas permissões aos tickets existentes

### Para Staff

1. **Verificar permissões:** Use `!verificar-permissoes` em qualquer ticket para verificar se as permissões estão corretas
2. **Gerenciar tickets:** Use os botões do painel para gerenciar os tickets

### Para Usuários

1. **Abrir ticket:** Clique no botão correspondente à categoria no painel de tickets
2. **Preencher assunto:** Digite o assunto do ticket no modal que aparecer
3. **Aguardar atendimento:** A equipe será notificada automaticamente

## Recursos Avançados

### Sistema de Cooldown
- **Cooldown de 5 segundos** entre abertura de tickets para evitar spam
- **Verificação de ticket existente** - usuários não podem abrir múltiplos tickets
- **Mensagem de "O Severino está trabalhando"** durante a criação do ticket

### Gerenciamento de Categorias
- **Limite de 50 canais por categoria** para evitar sobrecarga
- **Criação automática no topo** quando categoria está cheia
- **Permissões mantidas** mesmo fora das categorias
- **Comando `!status-categorias`** para monitorar uso das categorias

### Transcript Automático
- Quando um ticket é fechado, um transcript HTML é gerado automaticamente
- O transcript é enviado para o canal de logs
- Inclui todas as mensagens, anexos, embeds e stickers

### Timer de 24h
- Staff pode iniciar um timer de 24h em qualquer ticket
- O ticket é fechado automaticamente se o timer não for cancelado
- Útil para tickets que precisam de follow-up

### Sistema de Logs
- Todas as ações são registradas no canal de logs
- Inclui informações sobre quem criou, fechou e assumiu tickets
- Transcripts são salvos automaticamente

## Manutenção

### Atualizar Permissões
Para atualizar as permissões de uma categoria:

1. Edite o arquivo `config.js`
2. Modifique o array `staffRoles` da categoria desejada
3. Execute `!corrigir-permissoes` para aplicar as mudanças aos tickets existentes

### Adicionar Nova Categoria
Para adicionar uma nova categoria:

1. Adicione a configuração no arquivo `config.js`
2. Atualize o painel de tickets em `painel-ticket.js`
3. Adicione o handler no arquivo `interactionCreate.js`

## Suporte

Para problemas ou dúvidas sobre o sistema de tickets, entre em contato com a equipe de desenvolvimento. 