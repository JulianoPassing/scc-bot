import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Events, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// IDs e configs fixos do bot original
const CARGO_APROVADO = '1263487190575349892';
const CANAL_FORMULARIOS = '1392299124371751075';
const TENTATIVAS_MAXIMAS = 2;
const COOLDOWN_HORAS = 24;
const DATABASE_PATH = path.join(__dirname, 'whitelist.json');

// Banco de dados simples em JSON
function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
}

const setupWLModule = async function(client) {
  // Carregar comandos modulares
  const commandsPath = path.join(__dirname, 'commands');
  if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    if (!client.commands) client.commands = new Collection();
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = await import(filePath);
      if (command && command.data && command.data.name) {
        client.commands.set(command.data.name, command);
      }
    }
  }
  // Carregar eventos (handler completo)
  const eventsPath = path.join(__dirname, 'events');
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = await import(filePath);
      if (event && typeof event.default === 'function') {
        await event.default(client);
      }
    }
  }
};
export default setupWLModule;