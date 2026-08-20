import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateAvaliacoesRelatorio, saveRelatorio } from '../utils/relatorioGenerator.js';
import { withHtmlTimeout, notifyHtmlFailure } from '../../_shared/htmlTheme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, '..', 'avaliacoes.json');

export default {
  data: {
    name: 'relatorio-avaliacoes',
    description: 'Gera um relatório HTML das avaliações de staff'
  },
  
  async execute(message, args, client) {
    const ADMIN_ROLE_ID = '1046404063522197521';
    
    // Verificar permissão
    if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return message.reply('❌ Você não tem permissão para usar este comando. Apenas administradores podem gerar relatórios.');
    }

    let processingMsg = null;
    try {
      processingMsg = await message.reply('🔄 Gerando relatório de avaliações...');

      await withHtmlTimeout(async () => {
      // Carregar dados das avaliações
      let votes = new Map();
      if (fs.existsSync(FILE_PATH)) {
        try {
          const data = fs.readFileSync(FILE_PATH, 'utf-8');
          if (data.length > 0) {
            const jsonObject = JSON.parse(data);
            votes = new Map(Object.entries(jsonObject));
          }
        } catch (error) {
          console.error('Erro ao carregar avaliações:', error);
          return processingMsg.edit('❌ Erro ao carregar dados das avaliações.');
        }
      }

      // Verificar se há avaliações
      const hasVotes = Array.from(votes.values()).some(data => data.count > 0);
      if (!hasVotes) {
        return processingMsg.edit('❌ Nenhuma avaliação encontrada para gerar o relatório.');
      }

      // Gerar nome do arquivo com timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `relatorio-avaliacoes-${timestamp}.html`;

      // Gerar HTML do relatório
      const html = generateAvaliacoesRelatorio(votes, message.guild);

      // Salvar arquivo
      const filePath = saveRelatorio(html, filename);

      // Criar attachment
      const attachment = new AttachmentBuilder(filePath, { name: filename });

      // Embed de sucesso
      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📊 Relatório de Avaliações Gerado!')
        .setDescription('O relatório HTML foi gerado com sucesso e está anexado abaixo.')
        .addFields(
          { name: '📁 Arquivo', value: `\`${filename}\``, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: '👥 Staff Avaliados', value: `${Array.from(votes.values()).filter(data => data.count > 0).length}`, inline: true }
        )
        .setFooter({ text: 'Street Car Club • Sistema de Avaliações' })
        .setTimestamp();

      // Enviar relatório
      await processingMsg.edit({ 
        content: '✅ Relatório gerado com sucesso!',
        embeds: [successEmbed],
        files: [attachment]
      });

      // Deletar arquivo temporário após 5 segundos
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error('Erro ao deletar arquivo temporário:', error);
        }
      }, 5000);
      });
    } catch (error) {
      await notifyHtmlFailure({ processingMsg, message, error });
    }
  }
};
