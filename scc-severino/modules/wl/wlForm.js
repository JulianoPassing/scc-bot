import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_PATH = path.join(__dirname, 'whitelist.json');

function loadWlDb() {
  if (!fs.existsSync(DATABASE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

const CARGO_APROVADO_WL = '1263487190575349892';
const CARGO_ESPECIAL_SEM_COOLDOWN = '1046404063689977984';

/**
 * Mesmas regras de antes do modal em "Iniciar Whitelist" (aprovado / cooldown).
 * @param {import('discord.js').GuildMember} member
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function getWlPrecheck(member) {
  const db = loadWlDb();
  const user = db[member.id];
  const now = new Date();

  if (user && user.aprovado && member.roles.cache.has(CARGO_APROVADO_WL)) {
    return { ok: false, message: '✅ Você já foi aprovado na whitelist!' };
  }

  if (!member.roles.cache.has(CARGO_ESPECIAL_SEM_COOLDOWN)) {
    if (user && user.tentativas >= 2) {
      const last = new Date(user.last_attempt);
      const diff = (now - last) / (1000 * 60 * 60);
      if (diff < 24) {
        return {
          ok: false,
          message: `⏳ Você atingiu o limite de tentativas. Tente novamente em <t:${Math.floor((last.getTime() + 24 * 60 * 60 * 1000) / 1000)}:R>.`
        };
      }
    }
  }

  return { ok: true };
}

export function buildModalWlEtapa1() {
  return new ModalBuilder()
    .setCustomId('modal_wl_etapa1')
    .setTitle('Whitelist Street Car Club - Dados Pessoais')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nome')
          .setLabel('1. Seu nome e sobrenome completo?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('idade')
          .setLabel('2. Qual sua idade real?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(2)
          .setPlaceholder('Sua idade real em números, ex: 18')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('motivo')
          .setLabel('3. Por que quer jogar no Street Car Club?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(300)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('conheceu')
          .setLabel('4. Como conheceu o servidor?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('historia')
          .setLabel('5. História do personagem')
          .setPlaceholder('Digite uma história com no mínimo 700 caracteres')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(700)
          .setMaxLength(1000)
      )
    );
}
