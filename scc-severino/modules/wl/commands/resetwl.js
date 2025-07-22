import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, '../whitelist.json');

function loadDB() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
}
function saveDB(db) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(db, null, 2));
}

export const data = {
  name: 'resetwl',
  description: 'Reseta o status da whitelist do usuário.'
};

export async function execute(message, args, client) {
  if (!message.member.permissions.has('Administrator')) return message.reply('❌ Você não tem permissão!');
  const user = message.mentions.members.first();
  if (!user) return message.reply('❌ Mencione o usuário para resetar!');
  const db = loadDB();
  if (db[user.id]) {
    delete db[user.id];
    saveDB(db);
    await message.reply(`🔄 Whitelist de ${user} resetada!`);
  } else {
    await message.reply('❌ Usuário não possui registro de whitelist.');
  }
} 