# Sistema de Tickets - StreetCarClub

## Visão Geral

Este módulo implementa um sistema completo de tickets com permissões personalizadas para cada categoria, seguindo as especificações do servidor StreetCarClub.

## Configuração das Categorias

### 📁 Suporte
- **ID da Categoria:** 1386490182085382294
- **Staff com Acesso:**
  - 1204393192284229692
  - 1046404063673192542
  - 1277638402019430501
  - 1226903187055972484
  - 1226907937117569128
  - 1230131375965737044
  - 1046404063522197521

### 🦠 Reportar Bugs
- **ID da Categoria:** 1386490279384846418
- **Staff com Acesso:** (mesmos cargos do Suporte)

### 🚀 Boost
- **ID da Categoria:** 1386490600353828884
- **Staff com Acesso:** (mesmos cargos do Suporte)

### 🏠 Casas
- **ID da Categoria:** 1386490752485294150
- **Staff com Acesso:**
  - 1311023008495698081
  - 1046404063522197521

### 💎 Doações
- **ID da Categoria:** 1386490511606419578
- **Staff com Acesso:**
  - 1046404063522197521

### ⚠️ Denúncias
- **ID da Categoria:** 1386490428404138054
- **Staff com Acesso:**
  - 1277638402019430501
  - 1226903187055972484
  - 1046404063522197521

## Permissões

### Criador do Ticket
- ✅ Ver canal
- ✅ Enviar mensagens
- ✅ Enviar links
- ✅ Enviar anexos
- ✅ Ver histórico

### Staff (Todos os cargos com permissão)
- ✅ Ver canal
- ✅ Enviar mensagens
- ✅ Enviar links
- ✅ Enviar anexos
- ✅ Ver histórico
- ✅ Gerenciar mensagens
- ✅ Gerenciar canais

## Funcionalidades Especiais

### Categoria Cheia
- Se uma categoria atingir o limite de 50 canais, novos tickets são criados no topo do servidor
- As permissões são mantidas conforme a categoria original
- Não há herança de permissões da categoria pai

### Sistema de Nomenclatura
- Tickets seguem o padrão: `{emoji}{categoria}-{username}`
- Exemplo: `📁suporte-juliano`

### Transcript Automático
- Ao fechar um ticket, um transcript HTML é gerado automaticamente
- Enviado para o canal de logs: 1386491920313745418

## Comandos Disponíveis

- `!painel-ticket` - Cria o painel principal de tickets
- `!abrir-ticket` - Abre um ticket de suporte padrão
- `!ticket-status` - Verifica o status das categorias (apenas staff)

## Estrutura de Arquivos

```
ticket/
├── config.js                 # Configuração das categorias e permissões
├── utils/
│   └── ticketPermissions.js  # Utilitários para gerenciar permissões
├── commands/
│   ├── painel-ticket.js      # Comando do painel principal
│   ├── abrir-ticket.js       # Comando para abrir ticket
│   └── ticket-status.js      # Status das categorias
├── events/
│   └── interactionCreate.js  # Handler de interações
└── README.md                 # Esta documentação
```

## Configuração

Para modificar as permissões ou categorias, edite o arquivo `config.js`:

```javascript
export const CATEGORY_CONFIG = {
  suporte: {
    id: 'ID_DA_CATEGORIA',
    emoji: '📁',
    nome: 'Suporte',
    desc: 'Descrição da categoria',
    staffRoles: ['ID_ROLE_1', 'ID_ROLE_2']
  }
  // ... outras categorias
};
```

## Logs

- Canal de logs: 1386491920313745418
- Transcripts HTML são enviados automaticamente
- Logs incluem informações sobre fechamento, timer e status

## Timer de 24h

- Staff pode iniciar um timer de 24h em qualquer ticket
- Se não cancelado, o ticket é fechado automaticamente
- Transcript é gerado antes do fechamento automático 