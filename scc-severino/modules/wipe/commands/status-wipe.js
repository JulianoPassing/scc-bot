import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const progressFile = path.join(__dirname, '../data/progress.json');

export const data = {
  name: 'status-wipe',
  description: 'Verifica o status atual dos envios de wipe.'
};

export async function execute(message, args, client) {
  try {
    // Verificar se o usuário tem um dos cargos permitidos
    const allowedRoles = ['1046404063689977984', '1046404063689977986'];
    const hasAllowedRole = message.member.roles.cache.some(role => allowedRoles.includes(role.id));
    
    if (!hasAllowedRole) {
      return message.reply('❌ Você não tem permissão para usar este comando. Apenas membros com cargos específicos podem utilizá-lo.');
    }

    // Verificar se existe arquivo de progresso
    if (!fs.existsSync(progressFile)) {
      return message.reply('ℹ️ Nenhum envio foi realizado ainda. Use `!wipe` para começar.');
    }

    // Carregar progresso atual
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    
    // Calcular estatísticas
    const totalSent = progress.sentMembers.length;
    const totalMembers = progress.totalMembers;
    const pendingMembers = totalMembers - totalSent;
    const percentage = totalMembers > 0 ? Math.round((totalSent / totalMembers) * 100) : 0;
    
    // Criar barra de progresso visual
    const barLength = 20;
    const filledLength = Math.round((totalSent / totalMembers) * barLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    // Formatar data do último wipe
    let lastWipeText = 'Nunca';
    if (progress.lastWipe) {
      const lastWipeDate = new Date(progress.lastWipe);
      lastWipeText = lastWipeDate.toLocaleDateString('pt-BR') + ' às ' + lastWipeDate.toLocaleTimeString('pt-BR');
    }

    const statusEmbed = new EmbedBuilder()
      .setColor('#EAF207')
      .setTitle('📊 Status dos Envios de Wipe')
      .setDescription(
        `📈 **Progresso Geral:**\n` +
        `\`${progressBar}\` ${percentage}%\n\n` +
        `📝 **Estatísticas:**\n` +
        `✅ **Total enviados:** ${totalSent}\n` +
        `🔄 **Pendentes:** ${pendingMembers}\n` +
        `📊 **Total de moradores:** ${totalMembers}\n\n` +
        `⏰ **Último wipe:** ${lastWipeText}\n` +
        `🕒 **Última atualização:** ${progress.lastUpdate ? new Date(progress.lastUpdate).toLocaleString('pt-BR') : 'Nunca'}`
      )
      .setFooter({ text: 'StreetCarClub • Sistema de Controle de Wipe' })
      .setTimestamp();

    await message.channel.send({ embeds: [statusEmbed] });

  } catch (error) {
    console.error('Erro no comando status-wipe:', error);
    await message.reply('❌ Ocorreu um erro ao executar o comando.');
  }
}
