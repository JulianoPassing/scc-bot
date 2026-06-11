# Módulo TagSeason

Este módulo permite que os usuários resgatem tags comemorativas da temporada através de um botão interativo.

## Funcionalidades

- **Comando `!tag-season`**: Cria um painel com botão para resgatar a tag da temporada
- **Sistema de botões**: Usuários podem clicar no botão para receber automaticamente o cargo da tag
- **Verificação de duplicatas**: Impede que usuários recebam o mesmo cargo múltiplas vezes
- **Restrição de canal**: Comando só funciona no canal específico configurado

## Configuração

### Canais
- **Canal de uso**: `1406085682639671468`

### Cargos
- **Cargo da tag**: `1514769357190860872`

## Comandos

### `!tag-season`
Cria o painel para resgatar a tag da temporada 04.

**Uso**: `!tag-season`
**Canal**: Apenas no canal configurado
**Permissões**: Qualquer usuário

## Estrutura do Módulo

```
tagseason/
├── index.js          # Configuração principal do módulo
├── loader.js         # Carregador do módulo
├── commands/         # Comandos do módulo
│   └── tag-season.js # Comando principal
├── events/           # Eventos do módulo
│   └── interactionCreate.js # Processamento de interações
└── README.md         # Esta documentação
```

## Como Funciona

1. Um staff executa o comando `!tag-season` no canal configurado
2. O bot envia uma mensagem com embed e botão "Resgatar Tag"
3. Usuários clicam no botão para receber o cargo automaticamente
4. O sistema verifica se o usuário já possui o cargo antes de adicionar
5. Feedback é enviado ao usuário sobre o sucesso ou falha da operação

## Mensagens

### Painel Principal
🏆 A Temporada 04 do SCC foi inesquecível! 🏆

Para celebrar suas conquistas, resgate agora sua Tag comemorativa. Basta clicar no botão resgatar e ela será sua!

### Respostas
- **Sucesso**: 🎉 Parabéns! Você resgatou com sucesso sua Tag da Temporada 04! 🏆
- **Já possui**: ❌ Você já possui esta tag da temporada!
- **Erro**: ❌ Ocorreu um erro ao adicionar a tag. Entre em contato com a equipe.
