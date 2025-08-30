# Módulo Wipe

Este módulo permite enviar mensagens de anúncio de wipe para todos os membros de um servidor específico que possuem um cargo específico.

## Comandos

### `!wipe`
- **Descrição**: Envia mensagem de anúncio de Season 5 para todos os membros com o cargo especificado
- **Permissão**: Administrador
- **Uso**: `!wipe`

### `!teste-wipe`
- **Descrição**: Testa o envio da mensagem de wipe para um membro específico (ID: 405487427327885313)
- **Permissão**: Administrador
- **Uso**: `!teste-wipe`

## Funcionalidades

- Envia mensagem embed personalizada para todos os membros com o cargo `1317086939555434557` no servidor `1046404063287332936`
- Inclui contagem de mensagens enviadas com sucesso e erros
- Pausa entre envios para evitar rate limiting
- Relatório detalhado após a execução

## Configuração

O módulo está configurado para:
- **Servidor**: 1046404063287332936
- **Cargo**: 1317086939555434557
- **Permissão necessária**: Administrador

## Estrutura do Módulo

```
wipe/
├── index.js          # Configuração principal do módulo
├── loader.js         # Carregador do módulo
├── commands/         # Comandos do módulo
│   └── wipe.js      # Comando principal
└── README.md         # Esta documentação
```
