import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const progressFile = path.join(__dirname, '../data/progress.json');

// Funções para gerenciar o progresso
function loadProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      const data = fs.readFileSync(progressFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
  }
  return { lastWipe: null, sentMembers: [], totalMembers: 0, lastUpdate: null };
}

function saveProgress(progress) {
  try {
    // Garantir que o diretório existe
    const dir = path.dirname(progressFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    progress.lastUpdate = new Date().toISOString();
    fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
  }
}

export const data = {
  name: 'wipe',
  description: 'Envia mensagem de wipe para todos os membros com cargo específico.'
};

export async function execute(message, args, client) {
  try {
    // Verificar se o usuário tem um dos cargos permitidos
    const allowedRoles = ['1046404063689977984', '1046404063689977986'];
    const hasAllowedRole = message.member.roles.cache.some(role => allowedRoles.includes(role.id));
    
    if (!hasAllowedRole) {
      return message.reply('❌ Você não tem permissão para usar este comando. Apenas membros com cargos específicos podem utilizá-lo.');
    }

    const guildId = '1046404063287332936';
    const roleId = '1317086939555434557';

    // Buscar o servidor
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return message.reply('❌ Servidor não encontrado.');
    }

    // Buscar o cargo
    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply('❌ Cargo não encontrado.');
    }

    // Fazer fetch de todos os membros do servidor
    await message.reply('🔄 Carregando todos os membros do servidor... Isso pode demorar alguns segundos.');
    
    try {
      await guild.members.fetch();
    } catch (error) {
      console.error('Erro ao fazer fetch dos membros:', error);
      await message.reply('❌ Erro ao carregar membros do servidor.');
      return;
    }

    // Buscar todos os membros com o cargo após o fetch
    const allMembers = guild.members.cache.filter(member => member.roles.cache.has(roleId));
    
    if (allMembers.size === 0) {
      return message.reply('❌ Nenhum membro encontrado com este cargo.');
    }

    // Carregar progresso anterior
    const progress = loadProgress();
    const sentMembers = new Set(progress.sentMembers);
    
    // Filtrar membros que ainda não receberam a mensagem
    const pendingMembers = allMembers.filter(member => !sentMembers.has(member.id));
    
    if (pendingMembers.size === 0) {
      return message.reply('✅ Todos os membros já receberam a mensagem! Use `!reset-wipe` para limpar o histórico.');
    }

    await message.reply(`📊 **Status do Envio:**\n` +
      `📝 **Total de moradores:** ${allMembers.size}\n` +
      `✅ **Já enviados:** ${sentMembers.size}\n` +
      `🔄 **Pendentes:** ${pendingMembers.size}\n\n` +
      `Iniciando envio para os membros pendentes...`);

    // Criar o embed
    const embed = new EmbedBuilder()
      .setColor('#EAF207')
      .setTitle('🎉 A contagem regressiva começou!')
      .setDescription(
        'Em uma semana, a **SEASON 5** vai revolucionar tudo que você conhece! 💥 Novas áreas, novas mecânicas e um mundo de novidades te esperando.\n\n' +
        'Prepare-se para um mapa cheio de oportunidades, com o novíssimo **Distrito 69** se tornando o centro de toda a inovação! 🗺️\n\n' +
        'Você já viu o que estamos preparando? 👀 Se liga no teaser:\n' +
        'https://www.youtube.com/watch?v=GGCUmlH4zVA\n\n' +
        'Quer ser o primeiro a saber de tudo? As novidades mais quentes já estão esperando por você no canal **#spoilers** do nosso Discord. Vem com a gente! 👉'
      )
      .setFooter({ text: 'StreetCarClub • Season 5 | ™ Street CarClub © All rights reserved' })
      .setTimestamp();

    // Contador para acompanhar o progresso
    let successCount = 0;
    let errorCount = 0;

    // Enviar mensagem para cada membro pendente
    for (const [memberId, member] of pendingMembers) {
      try {
        await member.send({ embeds: [embed] });
        successCount++;
        
        // Adicionar ao progresso
        sentMembers.add(member.id);
        
        // Salvar progresso a cada 10 envios
        if (successCount % 10 === 0) {
          progress.sentMembers = Array.from(sentMembers);
          progress.totalMembers = allMembers.size;
          saveProgress(progress);
        }
        
        // Pequena pausa para evitar rate limiting (reduzida para muitos membros)
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${member.user.tag}:`, error);
        errorCount++;
      }
    }

    // Salvar progresso final
    progress.sentMembers = Array.from(sentMembers);
    progress.totalMembers = allMembers.size;
    progress.lastWipe = new Date().toISOString();
    saveProgress(progress);

    // Relatório final
    const reportEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📊 Relatório de Envio')
      .setDescription(
        `✅ **Mensagens enviadas com sucesso:** ${successCount}\n` +
        `❌ **Erros:** ${errorCount}\n` +
        `📝 **Total de moradores:** ${allMembers.size}\n` +
        `📤 **Total enviados (incluindo anteriores):** ${sentMembers.size}\n` +
        `🔄 **Pendentes restantes:** ${allMembers.size - sentMembers.size}`
      )
      .setTimestamp();

    await message.channel.send({ embeds: [reportEmbed] });

  } catch (error) {
    console.error('Erro no comando wipe:', error);
    await message.reply('❌ Ocorreu um erro ao executar o comando.');
  }
}
