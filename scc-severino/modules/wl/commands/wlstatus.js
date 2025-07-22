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

export const data = {
  name: 'wlstatus',
  description: 'Mostra o status da whitelist do usuário.'
};

export async function execute(message, args, client) {
  const user = message.mentions.members.first() || message.member;
  const db = loadDB();
  const info = db[user.id];
  if (!info) {
    return message.reply({ embeds: [new EmbedBuilder().setTitle('📊 Status da Whitelist').setDescription(`**Usuário:** ${user}\n**Status:** Nunca tentou a whitelist`).setColor(0x808080)] });
  }
  let status = info.aprovado ? '✅ Aprovado' : '❌ Reprovado';
  let color = info.aprovado ? 0x00ff00 : 0xff0000;
  const embed = new EmbedBuilder()
    .setTitle('📊 Status da Whitelist')
    .setDescription(`**Usuário:** ${user}\n**Status:** ${status}\n**Tentativas:** ${info.tentativas || 0}/2`)
    .setColor(color);
  if (info.last_attempt) {
    embed.addFields({ name: 'Última tentativa', value: `<t:${Math.floor(new Date(info.last_attempt).getTime()/1000)}:R>`, inline: false });
  }
  await message.reply({ embeds: [embed] });
} 