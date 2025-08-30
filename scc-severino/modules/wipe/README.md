# Módulo Wipe

Este módulo permite enviar mensagens de anúncio de wipe para todos os membros de um servidor específico que possuem um cargo específico.

## Comandos

### `!wipe`
- **Descrição**: Envia mensagem de anúncio de Season 5 para todos os membros com o cargo especificado
- **Permissão**: Cargos específicos (1046404063689977984, 1046404063689977986)
- **Uso**: `!wipe`

### `!teste-wipe`
- **Descrição**: Testa o envio da mensagem de wipe para um membro específico (ID: 405487427327885313)
- **Permissão**: Cargos específicos (1046404063689977984, 1046404063689977986)
- **Uso**: `!teste-wipe`

## Funcionalidades

- Envia mensagem embed personalizada para todos os membros com o cargo `1317086939555434557` no servidor `1046404063287332936`
- Inclui contagem de mensagens enviadas com sucesso e erros
- Pausa entre envios para evitar rate limiting
- Relatório detalhado após a execução

## Configuração

O módulo está configurado para:
- **Servidor**: 1046404063287332936
- **Cargo alvo**: 1317086939555434557 (membros que receberão a mensagem)
- **Cargos com permissão**: 1046404063689977984, 1046404063689977986

## Estrutura do Módulo

```
wipe/
├── index.js          # Configuração principal do módulo
├── loader.js         # Carregador do módulo
├── commands/         # Comandos do módulo
│   └── wipe.js      # Comando principal
└── README.md         # Esta documentação
```
