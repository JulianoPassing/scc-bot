# 🤖 Módulo de Auto-Atendimento

Sistema automatizado de atendimento para problemas comuns de jogadores, com fluxos de conversação interativos.

## 📋 Funcionalidades

### Categorias de Atendimento

1. **🌫️ Limbo**
   - Atende jogadores que caíram no limbo
   - Coleta ID do jogador
   - Executa comando `!teleport <id>` automaticamente
   - Verifica se o problema foi resolvido

2. **🚗 Guincho**
   - Atende jogadores que precisam de guincho para veículos
   - Coleta ID do jogador e placa do veículo
   - Executa comando `!guinchar <id> <placa>` automaticamente
   - Verifica se o problema foi resolvido

## 🎯 Fluxo de Atendimento

### Limbo

1. Jogador clica no botão "Limbo" no painel
2. Bot cria canal privado de atendimento
3. Bot pergunta: "Me conte o que aconteceu"
4. Bot pede: "Envie um print da tela do jogo"
5. Bot pergunta: "Me fale seu ID atual"
6. Bot envia comando `!teleport <id>` para o servidor da staff
7. Bot pergunta: "Você foi teleportado?"
   - **Sim**: Encerra atendimento e mantém ticket aberto para análise
   - **Não**: Marca equipe de suporte (@role)

### Guincho

1. Jogador clica no botão "Guincho" no painel
2. Bot cria canal privado de atendimento
3. Bot pergunta: "Me conte o que aconteceu"
4. Bot pede: "Envie um print da tela do jogo"
5. Bot pergunta: "Me fale seu ID atual e a PLACA do veículo"
6. Bot envia comando `!guinchar <id> <placa>` para o servidor da staff
7. Bot pergunta: "Seu veículo foi guinchado?"
   - **Sim**: Encerra atendimento e mantém ticket aberto para análise
   - **Não**: Marca equipe de suporte (@role)

## ⚙️ Configuração

### Arquivo: `config.json`

```json
{
  "serverId": "1046404063287332936",           // Servidor onde o sistema opera
  "categoryId": "1430638731446063265",         // Categoria dos tickets
  "panelChannelId": "1430638568145031180",     // Canal do painel
  "commandServerId": "1289039278915059772",    // Servidor para enviar comandos
  "commandChannelId": "1386024502802251938",   // Canal para enviar comandos
  "supportRoleId": "1046404063673192546",      // Role do suporte
  "categories": {
    "limbo": {
      "name": "Limbo",
      "emoji": "🌫️",
      "channelPrefix": "🎫・limbo-"
    },
    "guincho": {
      "name": "Guincho",
      "emoji": "🚗",
      "channelPrefix": "🎫・guincho-"
    }
  }
}
```

### IDs Configurados

- **Servidor Principal**: `1046404063287332936`
- **Categoria de Tickets**: `1430638731446063265`
- **Canal do Painel**: `1430638568145031180`
- **Servidor de Comandos**: `1289039278915059772`
- **Canal de Comandos**: `1386024502802251938`
- **Role de Suporte**: `1046404063673192546`

## 🚀 Comandos

### `!painel-autoatendimento`

Cria o painel de auto-atendimento com botões para cada categoria.

**Permissões necessárias**: Gerenciar Canais

**Uso**:
```
!painel-autoatendimento
```

## 📝 Comandos Executados Automaticamente

O sistema envia os seguintes comandos para o servidor da staff:

- `!teleport <id>` - Para casos de limbo
- `!guinchar <id_do_player> <placa>` - Para casos de guincho

## 🔧 Estrutura de Arquivos

```
auto-atendimento/
├── commands/
│   └── painel-autoatendimento.js  # Comando para criar painel
├── events/
│   ├── interactionCreate.js       # Gerencia botões e interações
│   └── messageCreate.js           # Gerencia mensagens e conversações
├── utils/
│   └── conversationManager.js     # Gerencia estados de conversação
├── config.json                     # Configurações do módulo
├── index.js                        # Arquivo principal
├── loader.js                       # Carregador de comandos e eventos
└── README.md                       # Este arquivo
```

## 🎨 Formato dos Canais

- **Limbo**: `🎫・limbo-username`
- **Guincho**: `🎫・guincho-username`

## 🛡️ Permissões

### Canais de Ticket

- **Usuário que abriu**: Ver canal, Enviar mensagens, Ver histórico
- **Bot**: Ver canal, Enviar mensagens, Ver histórico, Gerenciar canais
- **@everyone**: Sem acesso

## 📊 Sistema de Estados

O módulo mantém o estado de cada conversação:

- `initial`: Ticket criado, aguardando primeira resposta
- `waiting_description`: Aguardando descrição do problema
- `waiting_print`: Aguardando print da tela do jogo
- `waiting_id`: Aguardando ID (Limbo)
- `waiting_id_plate`: Aguardando ID e Placa (Guincho)
- `waiting_verification`: Aguardando verificação se foi resolvido

## 🔄 Limpeza Automática

Conversações com mais de 24 horas são automaticamente limpas do cache.

## 📌 Observações

- O sistema mantém os tickets abertos após o atendimento para análise da equipe
- Apenas o usuário que abriu o ticket pode responder às perguntas
- Comandos são enviados automaticamente para o servidor configurado
- Se o problema não for resolvido, a equipe de suporte é marcada automaticamente

