# Módulo de Liberação

Este módulo permite liberar usuários através de reações em mensagens específicas.

## Funcionalidades

- **Canal específico**: Funciona apenas no canal `1317096106844225586`
- **Emoji de confirmação**: Usa o emoji `:V_confirm:` para confirmar a liberação
- **Alteração de nome**: Altera o nickname do usuário para o nome da mensagem
- **Gerenciamento de cargos**: 
  - Adiciona o cargo `1317086939555434557`
  - Remove o cargo `1263487190575349892`

## Como usar

1. Envie uma mensagem no canal de liberação
2. Reaja com o emoji `:V_confirm:` na mensagem
3. O bot irá automaticamente:
   - Alterar o nome do usuário para o conteúdo da mensagem
   - Adicionar o cargo de liberação
   - Remover o cargo anterior
   - Enviar uma confirmação

## Configuração

As configurações estão no arquivo `config.json`:

```json
{
    "canalLiberacao": "1317096106844225586",
    "emojiConfirmacao": "V_confirm",
    "cargoAdicionar": "1317086939555434557",
    "cargoRemover": "1263487190575349892"
}
```

## Estrutura do módulo

```
liberacao/
├── index.js          # Arquivo principal do módulo
├── loader.js         # Carregador de eventos
├── config.json       # Configurações
├── events/           # Eventos do módulo
│   └── messageReactionAdd.js
└── README.md         # Esta documentação
``` 