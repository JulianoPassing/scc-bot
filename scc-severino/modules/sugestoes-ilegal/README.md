# Módulo Sugestões Ilegais

Este módulo gerencia o sistema de sugestões ilegais automático para o servidor específico do Street Car Club.

## Configuração

- **Servidor Alvo**: `1326731475797934080`
- **Canal de Sugestões**: `1336660114249224262`
- **Canal de Logs**: `1410612496947216485`

## Funcionalidades

### Sistema Automático de Sugestões
- Converte automaticamente mensagens em sugestões ilegais
- Cria threads de debate automaticamente
- Sistema de votação com botões 👍 e 👎
- Cálculo automático de percentuais
- Persistência de votos em arquivo JSON

### Sistema de Votação
- Votos são salvos e carregados automaticamente
- Usuários podem mudar seus votos
- Percentuais atualizados em tempo real
- Logs detalhados de todas as votações

### Threads de Debate
- Criados automaticamente para cada sugestão
- Nome baseado no conteúdo da sugestão
- Arquivamento automático após 60 minutos de inatividade

## Comandos Disponíveis

- `!ajuda-sugestao-ilegal` - Mostra informações sobre o sistema

## Estrutura de Arquivos

```
sugestoes-ilegal/
├── index.js              # Arquivo principal do módulo
├── loader.js             # Carregador do módulo
├── commands/             # Comandos disponíveis
│   └── ajuda-sugestao-ilegal.js
├── votes.json            # Arquivo de persistência dos votos
└── README.md             # Este arquivo
```

## Como Funciona

1. **Criação de Sugestão**: Usuário envia mensagem no canal de sugestões ilegais
2. **Conversão Automática**: Sistema converte a mensagem em embed com botões de votação
3. **Thread de Debate**: Thread é criado automaticamente para discussão
4. **Sistema de Votos**: Usuários votam com 👍 ou 👎
5. **Logs**: Todas as votações são registradas no canal de logs
6. **Persistência**: Votos são salvos e carregados automaticamente

## Características Especiais

- **Verificação de Servidor**: Funciona apenas no servidor configurado
- **Cores Distintivas**: Usa cor vermelha (#FF6B6B) para diferenciar de sugestões normais
- **Título Específico**: "🚨 Sugestão Ilegal" para identificação clara
- **Logs Separados**: Canal específico para logs de sugestões ilegais

## Dependências

- Discord.js v14+
- Sistema de arquivos do Node.js para persistência
- Permissões de gerenciamento de mensagens e threads
