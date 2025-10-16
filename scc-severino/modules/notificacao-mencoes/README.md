# Módulo: Notificação de Menções

## Descrição
Este módulo monitora menções em canais específicos e envia notificações automáticas via DM para os usuários mencionados.

## Funcionalidades
- 🔔 Detecta menções de usuários em canais específicos
- 📬 Envia DM personalizado e bonito para usuários mencionados
- 📝 Inclui a mensagem original e quem mencionou
- 🔗 Fornece link direto para a mensagem
- 🎨 Embed visualmente atraente
- 🛡️ Proteções contra erros (DMs fechadas, bots, etc)

## Configuração

### Arquivo: `config.js`

```javascript
{
    SERVER_ID: 'ID_DO_SERVIDOR',
    CHANNEL_ID: 'ID_DO_CANAL',
    EMBED_COLOR: 0x3498db
}
```

### Configuração Atual
- **Servidor monitorado**: `1046404063287332936`
- **Canal monitorado**: `1414380734092939284`

## Como funciona

1. O bot monitora mensagens no canal configurado
2. Quando uma mensagem contém menções de usuários:
   - Verifica se não é um bot
   - Verifica se não é auto-menção
   - Envia um DM bonito para cada usuário mencionado

3. O DM contém:
   - Título chamativo
   - Aviso de que foi mencionado
   - Quem mencionou
   - Conteúdo da mensagem
   - Link direto para a mensagem
   - Informação sobre anexos (se houver)

## Características

### Proteções implementadas
- Ignora mensagens de bots
- Ignora auto-menções
- Trata erros de DM fechada graciosamente
- Limita tamanho da mensagem no embed (máx 1024 caracteres)

### Informações incluídas no DM
- ✅ Usuário que mencionou
- ✅ Conteúdo da mensagem original
- ✅ Link direto para a mensagem
- ✅ Nome e ícone do servidor
- ✅ Timestamp
- ✅ Indicação de anexos

## Logs
O módulo registra no console:
- Quando DMs são enviados com sucesso
- Quando não é possível enviar DM (usuário com DMs fechadas)
- Erros gerais no processo

## Exemplo de Notificação

```
🔔 Você foi mencionado!
Você foi marcado no canal #canal-nome, verifique o quanto antes!

👤 Mencionado por
Usuario#1234 (@Usuario)

💬 Mensagem
Olá @MencionadoUsuário, preciso falar com você!

🔗 Link da mensagem
[Clique aqui para ver](link)

📎 Anexos
Esta mensagem contém 1 anexo(s)
```

## Instalação
O módulo é carregado automaticamente pelo sistema de módulos do bot.

## Dependências
- discord.js (EmbedBuilder)

## Versão
1.0.0

