import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const progressFile = path.join(__dirname, '../data/progress.json');

export const data = {
  name: 'reset-wipe',
  description: 'Reseta o progresso dos envios de wipe.'
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
      return message.reply('ℹ️ Não há progresso para resetar.');
    }

    // Carregar progresso atual
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    
    // Confirmar reset
    if (args[0] !== '--confirm') {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ Confirmação Necessária')
        .setDescription(
          `Você está prestes a resetar o progresso dos envios!\n\n` +
          `📊 **Status Atual:**\n` +
          `📝 **Total de moradores:** ${progress.totalMembers}\n` +
          `✅ **Já enviados:** ${progress.sentMembers.length}\n` +
          `🔄 **Pendentes:** ${progress.totalMembers - progress.sentMembers.length}\n\n` +
          `Para confirmar, use: \`!reset-wipe --confirm\`\n\n` +
          `⚠️ **Atenção:** Isso fará com que todos os membros recebam a mensagem novamente!`
        )
        .setTimestamp();

      return message.channel.send({ embeds: [confirmEmbed] });
    }

    // Resetar progresso
    const resetProgress = {
      lastWipe: null,
      sentMembers: [],
      totalMembers: 0,
      lastUpdate: new Date().toISOString()
    };

    fs.writeFileSync(progressFile, JSON.stringify(resetProgress, null, 2));

    const successEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Progresso Resetado!')
      .setDescription(
        `O progresso dos envios foi resetado com sucesso!\n\n` +
        `🔄 **Próximo comando:** \`!wipe\` enviará para todos os moradores novamente.\n` +
        `📝 **Status:** Todos os membros voltaram para "pendentes"`
      )
      .setTimestamp();

    await message.channel.send({ embeds: [successEmbed] });

  } catch (error) {
    console.error('Erro no comando reset-wipe:', error);
    await message.reply('❌ Ocorreu um erro ao executar o comando.');
  }
}
