# Módulo Aviso de Login

Monitora as logs de login (webhook Captain Hook) e avisa o staff quando um Discord ID registrado entrar no servidor.

## Comandos (canal de comandos)

| Comando | Descrição |
|---------|-----------|
| `!avisar <discord_id>` | Registra um ID para ser avisado no login |
| `!avisar-lista` | Lista todos os IDs registrados |
| `!avisar-remover <discord_id>` | Remove um ID da lista |

**Requisitos:** cargo staff + canal de comandos.

## Fluxo

1. Staff registra o Discord ID com `!avisar`.
2. O bot observa o canal de login no servidor de logs.
3. Quando o webhook envia embed com esse Discord ID, o bot marca o cargo staff no canal de comandos.

## IDs configurados

- **Servidor staff:** `1046404063287332936`
- **Canal comandos:** `1537130119506829332`
- **Cargo staff:** `1046404063673192546`
- **Servidor logs:** `1313305951004135434`
- **Canal login:** `1459464917416415316`
- **Webhook login:** `1459464952472539243`

## Arquivos

- `config.js` — IDs
- `registrados.json` — persistência dos IDs
- `commands/` — `avisar`, `avisar-lista`, `avisar-remover`
- `events/messageCreate.js` — monitoramento do canal de login
