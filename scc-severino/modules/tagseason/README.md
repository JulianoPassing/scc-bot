# Módulo TagSeason

## Descrição
Módulo automático para gerenciar cargos baseado em reações específicas. Quando um usuário reagir com o emoji 🎉 (tada) à mensagem especificada, ele receberá automaticamente o cargo de participante da temporada.

## Funcionalidades
- **Detecção automática de reações**: Monitora reações na mensagem específica
- **Atribuição de cargos**: Adiciona automaticamente o cargo configurado
- **Validação de canal**: Funciona apenas no canal especificado
- **Notificação**: Envia mensagem de confirmação quando o cargo é adicionado

## Configuração
- **Canal**: 1406085682639671468
- **Mensagem**: 1406087068437708913
- **Emoji**: 🎉 (tada)
- **Cargo**: 1406086032989880350

## Como funciona
1. Usuário reage com 🎉 à mensagem especificada
2. Sistema verifica se é o canal e mensagem corretos
3. Cargo é automaticamente adicionado ao usuário
4. Mensagem de confirmação é enviada no canal

## Arquivos
- `index.js` - Arquivo principal do módulo
- `loader.js` - Carregador de eventos
- `events/messageReactionAdd.js` - Evento para detectar reações
- `README.md` - Esta documentação

## Dependências
- Discord.js
- Permissões para gerenciar cargos no servidor
