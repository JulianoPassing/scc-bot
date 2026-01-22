import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export const data = {
  name: 'sistema-ticket',
  description: 'Exibe o painel do sistema de tickets web.'
};

export async function execute(message, args, client) {
  // URL base do sistema de tickets (pode ser configurada via .env)
  const baseUrl = process.env.TICKET_BASE_URL || 'https://scc-tickets.vercel.app';
  
  const embed = new EmbedBuilder()
    .setTitle('📄 Central de Atendimento - StreetCarClub')
    .setDescription(`**Bem-vindo à nossa Central de Atendimento!**

Abra um ticket no nosso sistema web para receber suporte personalizado da nossa equipe.

**❗ Importante:**
Tickets tem prazo de resposta de até 72hrs uteis

**📋 Categorias Disponíveis:**
• 🏠 **Casas** - Questões relacionadas a casas e propriedades
• 💎 **Doações** - Assuntos relacionados a doações
• 🐛 **Reportar Bugs** - Reportar erros e problemas técnicos
• ⚠️ **Denúncias** - Reportar infrações e problemas de conduta
• 🚀 **Boost** - Suporte para membros boosters
• 🔎 **Revisão** - Solicitar revisão de advertências e banimentos
• 📁 **Suporte** - Suporte técnico e ajuda geral

**💡 Para abrir um ticket, clique no botão abaixo!**`)
    .setColor(0xEAF207) // Amarelo
    .setThumbnail('https://i.imgur.com/kHvmXj6.png')
    .setFooter({ 
      text: 'StreetCarClub • Atendimento de Qualidade',
      iconURL: 'https://i.imgur.com/kHvmXj6.png'
    })
    .setTimestamp();

  // Botão para abrir ticket no sistema web
  // Nota: Botões de link não podem ter cores customizadas no Discord
  // Eles sempre aparecem com o estilo padrão (azul/cinza)
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Abrir Ticket')
      .setStyle(ButtonStyle.Link)
      .setURL(baseUrl)
      .setEmoji('🟡') // Emoji amarelo para referência visual à cor do embed (#EAF207)
  );

  await message.channel.send({ embeds: [embed], components: [buttonRow] });
}