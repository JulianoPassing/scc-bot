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

### `!status-wipe`
- **Descrição**: Verifica o status atual dos envios de wipe
- **Permissão**: Cargos específicos (1046404063689977984, 1046404063689977986)
- **Uso**: `!status-wipe`

### `!reset-wipe`
- **Descrição**: Reseta o progresso dos envios (requer confirmação)
- **Permissão**: Cargos específicos (1046404063689977984, 1046404063689977986)
- **Uso**: `!reset-wipe --confirm`

## Funcionalidades

- **Sistema de Progresso**: Grava em JSON os membros que já receberam a mensagem
- **Continuidade**: Pode ser interrompido e continuado de onde parou
- **Sem Duplicatas**: Não envia mensagem para membros que já receberam
- **Controle Total**: Comandos para verificar status e resetar progresso
- **Envio Inteligente**: Fetch automático de todos os membros do servidor
- **Relatórios Detalhados**: Status completo com contadores e progresso visual
- **Pausa Otimizada**: 50ms entre envios para evitar rate limiting

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
│   ├── wipe.js       # Comando principal
│   ├── teste-wipe.js # Comando de teste
│   ├── status-wipe.js # Verificar status
│   └── reset-wipe.js # Resetar progresso
├── data/             # Dados de progresso
│   └── progress.json # Controle de envios
└── README.md         # Esta documentação
```
