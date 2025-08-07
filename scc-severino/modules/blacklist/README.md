# Módulo Blacklist

Este módulo monitora menções de usuários no canal `pedit-set` do servidor ilegal e verifica se os usuários mencionados possuem o cargo de blacklist no servidor principal.

## Funcionalidade

- **Monitoramento**: Monitora mensagens no canal `1326731476498255924` (pedit-set) do servidor ilegal
- **Verificação**: Quando um usuário é mencionado, verifica se ele possui o cargo `1317086276935225394` no servidor principal
- **Resposta**: Se o usuário possuir o cargo de blacklist, responde à mensagem com "Este usuario esta em BlackList"

## Configuração

### Servidores
- **Servidor Principal**: `1046404063287332936`
- **Servidor do Ilegal**: `1326731475797934080`

### Canais
- **Canal Monitorado**: `1326731476498255924` (pedit-set)

### Cargos
- **Cargo Blacklist**: `1317086276935225394`

## Estrutura do Módulo

```
blacklist/
├── index.js          # Configuração principal do módulo
├── loader.js         # Carregador do módulo
├── config.js         # Configurações (IDs de servidores, cargos, etc.)
├── events/
│   └── messageCreate.js  # Evento que monitora mensagens
└── README.md         # Este arquivo
```

## Como Funciona

1. O bot monitora todas as mensagens enviadas no canal `pedit-set`
2. Quando uma mensagem contém menções de usuários, o bot verifica cada usuário mencionado
3. Para cada usuário, o bot busca no servidor principal se ele possui o cargo de blacklist
4. Se o usuário possuir o cargo, o bot responde à mensagem original com a mensagem de blacklist

## Logs

O módulo registra erros no console caso:
- O servidor principal não seja encontrado
- Ocorra algum erro durante a verificação de cargos
