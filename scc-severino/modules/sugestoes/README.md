# Módulo de Sugestões

## Descrição
Este módulo gerencia o sistema de sugestões do servidor, permitindo que usuários enviem sugestões e outros membros votem nelas.

## Funcionalidades

### 📝 Envio de Sugestões
- Usuários podem enviar sugestões no canal de sugestões
- As mensagens são automaticamente convertidas em embeds com botões de votação
- Um thread de debate é criado automaticamente para cada sugestão

### 🗳️ Sistema de Votação
- Botões de 👍 (Sim) e 👎 (Não) para cada sugestão
- Contagem em tempo real de votos
- Percentuais calculados automaticamente
- Sistema de persistência de dados (votos são salvos em `votes.json`)

### 📊 Logs de Votação
- Canal dedicado para logs de votação
- Embed detalhado mostrando todos os votantes
- Atualização automática dos logs

## Persistência de Dados

### Arquivo `votes.json`
O módulo agora salva automaticamente todos os votos em um arquivo JSON para persistir os dados entre reinicializações do bot.

**Estrutura do arquivo:**
```json
{
  "messageId1": {
    "yes": ["userId1", "userId2"],
    "no": ["userId3"]
  },
  "messageId2": {
    "yes": ["userId4"],
    "no": []
  }
}
```

### Funcionalidades de Persistência
- ✅ **Carregamento automático**: Votos são carregados ao inicializar o bot
- ✅ **Salvamento automático**: Votos são salvos após cada interação
- ✅ **Atualização de botões**: Botões são atualizados com contagens corretas após reinicialização
- ✅ **Recuperação de dados**: Sistema recupera votos mesmo se mensagens foram deletadas

## Canais Configurados
- **Canal de Sugestões**: `1395117926402756669`
- **Canal de Logs**: `1395118049115246825`

## Comandos Disponíveis
- `!ajuda-sugestao` - Mostra informações sobre como usar o sistema

## Como Funciona

1. **Envio de Sugestão**:
   - Usuário envia mensagem no canal de sugestões
   - Bot deleta a mensagem original
   - Cria embed com botões de votação
   - Inicializa estrutura de votos vazia

2. **Votação**:
   - Usuário clica em 👍 ou 👎
   - Voto é registrado na memória e salvo no arquivo
   - Botões são atualizados com nova contagem
   - Log é atualizado no canal de logs

3. **Persistência**:
   - Ao inicializar, bot carrega votos do arquivo JSON
   - Atualiza botões de todas as sugestões existentes
   - Mantém contagem correta mesmo após reinicialização

## Arquivos do Módulo
- `index.js` - Lógica principal do módulo
- `loader.js` - Carregador do módulo
- `votes.json` - Arquivo de persistência de votos (criado automaticamente)
- `commands/ajuda-sugestao.js` - Comando de ajuda
- `README.md` - Esta documentação
