import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { dirname } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

// Carregar módulos de cada pasta
const modules = [
  'avaliacoes',
  'boost',
  'sugestoes',
  'ticket',
  'ticket-s-wl',
  'wl'
];

for (const mod of modules) {
  const modPath = path.join(__dirname, 'modules', mod);
  if (fs.existsSync(modPath)) {
    const loader = path.join(modPath, 'loader.js');
    if (fs.existsSync(loader)) {
      import(loader).then(m => m.default(client));
    }
  }
}

client.once('ready', () => {
  console.log(`🤖 ${client.user.tag} está online!`);
});

client.login(process.env.TOKEN); 