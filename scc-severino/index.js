import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dirname } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ==================== TRATAMENTO DE ERROS GLOBAL ====================
// Captura erros não tratados para evitar que o bot caia
process.on('uncaughtException', (error) => {
  console.error('❌ [ERRO CRÍTICO] Exceção não capturada:', error);
  // Não encerra o processo, permite que o bot continue rodando
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [ERRO] Promise rejeitada não tratada:', reason);
  // Não encerra o processo, permite que o bot continue rodando
});

// Captura warnings do Node.js
process.on('warning', (warning) => {
  console.warn('⚠️ [WARNING]', warning.name, warning.message);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  // Configurações para cache de mensagens antigas
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
  // Habilitar cache de mensagens antigas
  messageCacheMaxSize: 1000,
  messageCacheLifetime: 0, // Cache permanente
  messageSweepInterval: 0 // Não limpar cache
});

// Aumentar limite de listeners para evitar warning de memory leak
client.setMaxListeners(25);

client.commands = new Collection();

// ==================== TRATAMENTO DE ERROS DO DISCORD ====================
// Captura erros do client Discord
client.on('error', (error) => {
  console.error('❌ [DISCORD ERROR]', error);
});

// Captura quando o bot é desconectado
client.on('disconnect', () => {
  console.warn('⚠️ [DISCORD] Bot desconectado! Tentando reconectar...');
});

// Captura quando o bot reconecta
client.on('reconnecting', () => {
  console.log('🔄 [DISCORD] Reconectando...');
});

// Captura avisos do Discord
client.on('warn', (info) => {
  console.warn('⚠️ [DISCORD WARN]', info);
});

// Captura quando a sessão é invalidada
client.on('invalidated', () => {
  console.error('❌ [DISCORD] Sessão invalidada! Reiniciando...');
  process.exit(1); // PM2 vai reiniciar automaticamente
});

// Captura erros de shard (se usar sharding no futuro)
client.on('shardError', (error, shardId) => {
  console.error(`❌ [SHARD ${shardId}] Erro:`, error);
});

client.on('shardDisconnect', (event, shardId) => {
  console.warn(`⚠️ [SHARD ${shardId}] Desconectado`);
});

client.on('shardReconnecting', (shardId) => {
  console.log(`🔄 [SHARD ${shardId}] Reconectando...`);
});

// Carregar módulos de cada pasta
const modules = [
  'altnomes',
  'apagar-msg-bot',
  'setup-discord',
  'auto-atendimento',
  'avaliacoes',
  'batebapo',
  'blacklist',
  'boost',
  'drogas',
  'instagram',
  'liberacao',
  'limparchat',
  'notificacao-mencoes',
  'regras-acoes',
  'sistema-ticket',
  'streams',
  'sugestoes',
  'sugestoes-ilegal',
  'sugestoes-pm',
  'sugestoes-prs',
  'tagseason',
  'ticket',
  'ticket-s-wl',
  'wl'
];

for (const mod of modules) {
  const modPath = path.join(__dirname, 'modules', mod);
  if (fs.existsSync(modPath)) {
    const loader = path.join(modPath, 'loader.js');
    if (fs.existsSync(loader)) {
      console.log(`📦 Carregando módulo: ${mod}`);
      if (mod === 'altnomes') {
        console.log(`🔧 CARREGANDO MÓDULO ALTNOMES ESPECÍFICO!`);
        console.log(`🔧 Caminho do loader: ${loader}`);
        console.log(`🔧 Arquivo existe: ${fs.existsSync(loader)}`);
        console.log(`🔧 Conteúdo do arquivo:`, fs.readFileSync(loader, 'utf8').substring(0, 200));
      }
      import(loader).then(m => {
        if (mod === 'altnomes') {
          console.log(`🔧 MÓDULO ALTNOMES IMPORTADO COM SUCESSO!`);
          console.log(`🔧 Módulo altnomes:`, m);
          console.log(`🔧 m.default:`, m.default);
          console.log(`🔧 typeof m.default:`, typeof m.default);
        }
        if (m.default && typeof m.default === 'function') {
          return m.default(client);
        } else if (m.default && typeof m.default.execute === 'function') {
          return m.default.execute(client);
        } else {
          console.error(`❌ Módulo ${mod} não tem função default válida`);
        }
      }).catch(err => {
        console.error(`❌ Erro ao carregar módulo ${mod}:`, err);
        if (mod === 'altnomes') {
          console.error(`❌ ERRO ESPECÍFICO NO MÓDULO ALTNOMES:`, err);
        }
      });
    }
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (command && typeof command.execute === 'function') {
    try {
      await command.execute(message, args, client);
    } catch (error) {
      console.error(error);
      message.reply('❌ Ocorreu um erro ao executar o comando.');
    }
  }
});

client.once('ready', async () => {
  console.log(`🤖 ${client.user.tag} está online!`);
  
  // Definir status e atividade do bot
  try {
    client.user.setPresence({
      activities: [{
        name: 'A melhor cidade StreetCarClub!',
        type: 0 // 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching
      }],
      status: 'online'
    });
    console.log('🎮 Atividade definida: 🎮 Jogando A melhor cidade StreetCarClub!');
  } catch (error) {
    console.error('❌ Erro ao definir atividade:', error);
  }
  
  // Fazer fetch das mensagens antigas do canal de liberação
  try {
    const liberacaoChannel = client.channels.cache.get('1317096106844225586');
    if (liberacaoChannel) {
      console.log('📥 Carregando mensagens antigas do canal de liberação...');
      const messages = await liberacaoChannel.messages.fetch({ limit: 100 });
      console.log(`✅ ${messages.size} mensagens antigas carregadas`);
    }
  } catch (error) {
    console.error('❌ Erro ao carregar mensagens antigas:', error);
  }
  
  // Fazer fetch das mensagens antigas do canal de altnomes
  try {
    const altnomesChannel = client.channels.cache.get('1413150739290918962');
    if (altnomesChannel) {
      console.log('📥 Carregando mensagens antigas do canal de altnomes...');
      const messages = await altnomesChannel.messages.fetch({ limit: 100 });
      console.log(`✅ ${messages.size} mensagens antigas carregadas do canal altnomes`);
    }
  } catch (error) {
    console.error('❌ Erro ao carregar mensagens antigas do canal altnomes:', error);
  }
});

// ==================== FUNÇÃO DE LOGIN COM RETRY ====================
async function startBot() {
  try {
    await client.login(process.env.TOKEN);
  } catch (error) {
    console.error('❌ [LOGIN] Erro ao fazer login:', error);
    console.log('🔄 [LOGIN] Tentando novamente em 10 segundos...');
    setTimeout(startBot, 10000);
  }
}

startBot(); 