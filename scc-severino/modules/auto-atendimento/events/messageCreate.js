import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import conversationManager from '../utils/conversationManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../config.json'), 'utf8'));

export default {
  async execute(message, client) {
    // Ignora mensagens de bots
    if (message.author.bot) return;

    // Verifica se está no servidor correto
    if (message.guild.id !== config.serverId) return;

    // Verifica se existe conversação ativa no canal
    const conversation = conversationManager.getConversation(message.channel.id);
    if (!conversation) return;

    // Verifica se é o usuário correto
    if (conversation.userId !== message.author.id) {
      return message.reply('❌ Apenas o usuário que abriu o ticket pode responder.');
    }

    // Processa a mensagem de acordo com o passo atual
    try {
      switch (conversation.step) {
        case 'waiting_description':
          await handleDescription(message, conversation, client);
          break;
        case 'waiting_print':
          await handlePrint(message, conversation, client);
          break;
        case 'waiting_id':
          await handleIdLimbo(message, conversation, client);
          break;
        case 'waiting_id_plate':
          await handleIdPlateGuincho(message, conversation, client);
          break;
        case 'waiting_alive_check':
          await handleAliveCheck(message, conversation, client);
          break;
      }
    } catch (error) {
      console.error('[Auto-Atendimento] Erro ao processar mensagem:', error);
      await message.reply('❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
    }
  }
};

/**
 * Lida com a descrição do problema
 */
async function handleDescription(message, conversation, client) {
  const description = message.content;

  // Salva a descrição
  conversationManager.updateStep(message.channel.id, 'waiting_print', { description });

  // Pede o print da tela
  const embed = new EmbedBuilder()
    .setTitle('📸 Print da Tela')
    .setColor('#0099FF')
    .setTimestamp();

  if (conversation.type === 'guincho') {
    embed.setDescription(
      '**Por favor, envie um print (screenshot) com a GARAGEM ABERTA, mostrando o veículo e a placa.**\n\n' +
      '⚠️ É importante que a garagem esteja aberta e a placa do veículo esteja visível!\n' +
      '⚠️ O print deve ser uma imagem anexada à mensagem.\n\n' +
      '```diff\n' +
      '- ⛔ O PRINT DEVE SER DA TELA INTEIRA E NÃO RECORTE!\n' +
      '```'
    );
  } else {
    embed.setDescription(
      '**Por favor, envie um print (screenshot) da tela do seu jogo mostrando a situação.**\n\n' +
      '⚠️ O print deve ser uma imagem anexada à mensagem.\n\n' +
      '```diff\n' +
      '- ⛔ O PRINT DEVE SER DA TELA INTEIRA E NÃO RECORTE!\n' +
      '```'
    );
  }

  await message.reply({ embeds: [embed] });
}

/**
 * Lida com o print da tela
 */
async function handlePrint(message, conversation, client) {
  // Verifica se a mensagem tem anexos de imagem
  const hasImage = message.attachments.size > 0 && 
    message.attachments.some(att => att.contentType && att.contentType.startsWith('image/'));

  if (!hasImage) {
    return message.reply('❌ Por favor, envie uma imagem (print da tela do jogo) como anexo.');
  }

  // Pega a URL da primeira imagem
  const imageAttachment = message.attachments.find(att => att.contentType && att.contentType.startsWith('image/'));
  
  // Salva o print e avança para o próximo passo
  conversationManager.updateStep(
    message.channel.id, 
    conversation.type === 'limbo' ? 'waiting_id' : 'waiting_id_plate',
    { printUrl: imageAttachment.url }
  );

  // Pergunta o próximo passo
  const embed = new EmbedBuilder()
    .setTitle('📝 Informações Necessárias')
    .setColor('#0099FF')
    .setTimestamp();

  if (conversation.type === 'limbo') {
    embed.setDescription('**Por favor, me informe seu ID atual no servidor.**');
  } else if (conversation.type === 'guincho') {
    embed.setDescription(
      '**Por favor, me informe seu ID atual e a PLACA do veículo.**\n\n' +
      '**Formato:** ID: [seu_id] PLACA: [placa_do_veiculo]\n' +
      '**Exemplo:** ID: 99 PLACA: ABC1234'
    );
  }

  await message.reply({ embeds: [embed] });
}

/**
 * Lida com o ID para o caso de Limbo
 */
async function handleIdLimbo(message, conversation, client) {
  const playerId = message.content.trim();

  // Valida se é um número
  if (isNaN(playerId)) {
    return message.reply('❌ Por favor, informe apenas o número do seu ID.');
  }

  // Salva o ID
  conversationManager.updateStep(message.channel.id, 'waiting_alive_check', { playerId });

  // Envia o comando para o servidor de comando
  await sendCommandToStaff(client, `!teleport ${playerId}`);

  // Informa o usuário e pergunta se está vivo
  const embed = new EmbedBuilder()
    .setTitle('✅ Comando Executado')
    .setDescription(
      `O comando de teleporte foi enviado para a staff!\n\n` +
      '**Você está vivo no momento?**\n\n' +
      'Por favor, responda com **SIM** ou **NÃO**.'
    )
    .setColor('#00FF00')
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

/**
 * Lida com a verificação se o player está vivo (Limbo)
 */
async function handleAliveCheck(message, conversation, client) {
  const answer = message.content.trim().toLowerCase();
  const playerId = conversation.data.playerId;

  if (answer === 'sim' || answer === 's') {
    // Está vivo, vai direto para verificação de teleporte
    conversationManager.updateStep(message.channel.id, 'waiting_verification');

    const embed = new EmbedBuilder()
      .setTitle('✅ Perfeito!')
      .setDescription(
        '**Por favor, verifique se você foi teleportado para fora do limbo.**\n\n' +
        'Você foi teleportado com sucesso?'
      )
      .setColor('#00FF00')
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autoatend_verify_yes')
          .setLabel('Sim')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('autoatend_verify_no')
          .setLabel('Não')
          .setStyle(ButtonStyle.Danger)
      );

    await message.reply({
      embeds: [embed],
      components: [row]
    });

  } else if (answer === 'não' || answer === 'nao' || answer === 'n') {
    // Não está vivo, envia comando de reviver
    await sendCommandToStaff(client, `!reviver ${playerId}`);

    conversationManager.updateStep(message.channel.id, 'waiting_verification');

    const embed = new EmbedBuilder()
      .setTitle('✅ Comando de Reviver Enviado')
      .setDescription(
        `O comando para reviver foi enviado para a staff!\n\n` +
        '**Aguarde alguns instantes e verifique se você foi revivido e teleportado.**\n\n' +
        'O problema foi resolvido?'
      )
      .setColor('#00FF00')
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autoatend_verify_yes')
          .setLabel('Sim')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('autoatend_verify_no')
          .setLabel('Não')
          .setStyle(ButtonStyle.Danger)
      );

    await message.reply({
      embeds: [embed],
      components: [row]
    });

  } else {
    return message.reply('❌ Por favor, responda com **SIM** ou **NÃO**.');
  }
}

/**
 * Lida com ID e Placa para o caso de Guincho
 */
async function handleIdPlateGuincho(message, conversation, client) {
  const content = message.content.trim();

  // Extrai ID e PLACA usando regex
  const idMatch = content.match(/ID:\s*(\d+)/i);
  const plateMatch = content.match(/PLACA:\s*([A-Za-z0-9]+)/i);

  if (!idMatch || !plateMatch) {
    return message.reply(
      '❌ Por favor, informe o ID e a PLACA no formato correto:\n' +
      '**Formato:** ID: [seu_id] PLACA: [placa_do_veiculo]\n' +
      '**Exemplo:** ID: 99 PLACA: ABC1234'
    );
  }

  const playerId = idMatch[1];
  const plate = plateMatch[1];

  // Salva os dados
  conversationManager.updateStep(message.channel.id, 'waiting_verification', { playerId, plate });

  // Envia o comando para o servidor de comando
  await sendCommandToStaff(client, `!guinchar ${playerId} ${plate}`);

  // Informa o usuário e pede verificação
  const embed = new EmbedBuilder()
    .setTitle('✅ Comando Executado')
    .setDescription(
      `O comando de guincho foi enviado para a staff!\n\n` +
      '**Por favor, verifique se seu veículo foi guinchado até você.**\n\n' +
      'Seu veículo foi guinchado com sucesso?'
    )
    .setColor('#00FF00')
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('autoatend_verify_yes')
        .setLabel('Sim')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('autoatend_verify_no')
        .setLabel('Não')
        .setStyle(ButtonStyle.Danger)
    );

  await message.reply({
    embeds: [embed],
    components: [row]
  });
}

/**
 * Envia comando para o canal da staff
 */
async function sendCommandToStaff(client, command) {
  try {
    const guild = client.guilds.cache.get(config.commandServerId);
    if (!guild) {
      console.error('[Auto-Atendimento] Servidor de comando não encontrado');
      return;
    }

    const channel = guild.channels.cache.get(config.commandChannelId);
    if (!channel) {
      console.error('[Auto-Atendimento] Canal de comando não encontrado');
      return;
    }

    await channel.send(command);
    console.log(`[Auto-Atendimento] Comando enviado: ${command}`);
  } catch (error) {
    console.error('[Auto-Atendimento] Erro ao enviar comando:', error);
  }
}
