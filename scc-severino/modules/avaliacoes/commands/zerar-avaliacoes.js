import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, '..', 'avaliacoes.json');

export default {
  data: {
    name: 'zerar-avaliacoes',
    description: 'Zera todas as avaliações de staff (apenas para administradores)'
  },
  
  async execute(message, args, client) {
    const ADMIN_ROLE_ID = '1046404063522197521';
    
    // Verificar permissão
    if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando. Apenas administradores podem zerar as avaliações.');
    }

    try {
      // Verificar se o arquivo existe
      if (!fs.existsSync(FILE_PATH)) {
        return message.reply('❌ Arquivo de avaliações não encontrado. As avaliações já estão zeradas.');
      }

      // Ler o arquivo atual para mostrar quantas avaliações serão removidas
      const currentData = fs.readFileSync(FILE_PATH, 'utf-8');
      const currentVotes = JSON.parse(currentData);
      
      let totalAvaliacoes = 0;
      let totalStaff = 0;
      
      for (const [staffId, data] of Object.entries(currentVotes)) {
        if (data.count > 0) {
          totalAvaliacoes += data.count;
          totalStaff++;
        }
      }

      // Confirmar a ação
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('⚠️ Confirmação de Zerar Avaliações')
        .setDescription('Você está prestes a zerar **TODAS** as avaliações de staff!')
        .addFields(
          { name: '📊 Dados que serão removidos:', value: 
            `• **${totalStaff}** staff com avaliações\n` +
            `• **${totalAvaliacoes}** avaliações totais\n` +
            `• Médias e contadores serão resetados`, inline: false },
          { name: '⚠️ Aviso:', value: 'Esta ação **NÃO PODE SER DESFEITA**!', inline: false }
        )
        .setFooter({ text: 'Digite "CONFIRMAR" para prosseguir ou "CANCELAR" para cancelar' })
        .setTimestamp();

      const confirmMessage = await message.reply({ embeds: [confirmEmbed] });

      // Coletar resposta do usuário
      const filter = (response) => response.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async (response) => {
        if (response.content.toUpperCase() === 'CONFIRMAR') {
          try {
            // Zerar o arquivo de avaliações
            fs.writeFileSync(FILE_PATH, '[]');
            
            const successEmbed = new EmbedBuilder()
              .setColor(0x00FF00)
              .setTitle('✅ Avaliações Zeradas com Sucesso!')
              .setDescription('Todas as avaliações de staff foram removidas do sistema.')
              .addFields(
                { name: '📊 Dados Removidos:', value: 
                  `• **${totalStaff}** staff com avaliações\n` +
                  `• **${totalAvaliacoes}** avaliações totais`, inline: false },
                { name: '🔄 Próximos Passos:', value: 
                  '• Use `!painel-avaliacao` para recriar os painéis\n' +
                  '• Os painéis aparecerão com "Nenhuma avaliação ainda"', inline: false }
              )
              .setTimestamp();

            await response.reply({ embeds: [successEmbed] });
            
            // Deletar mensagens de confirmação
            try {
              await confirmMessage.delete();
              await response.delete();
            } catch (error) {}
            
          } catch (error) {
            console.error('Erro ao zerar avaliações:', error);
            await response.reply('❌ Erro ao zerar as avaliações. Verifique os logs para mais detalhes.');
          }
        } else if (response.content.toUpperCase() === 'CANCELAR') {
          await response.reply('❌ Operação cancelada. As avaliações permanecem inalteradas.');
          try {
            await confirmMessage.delete();
            await response.delete();
          } catch (error) {}
        } else {
          await response.reply('❌ Resposta inválida. Digite "CONFIRMAR" ou "CANCELAR".');
        }
      });

      collector.on('end', async (collected) => {
        if (collected.size === 0) {
          await message.reply('⏰ Tempo esgotado. Operação cancelada automaticamente.');
          try {
            await confirmMessage.delete();
          } catch (error) {}
        }
      });

    } catch (error) {
      console.error('Erro no comando zerar-avaliacoes:', error);
      await message.reply('❌ Erro ao processar o comando. Verifique os logs para mais detalhes.');
    }
  }
};

