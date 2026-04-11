import { MessageFlags } from 'discord.js';
import {
  CARGO_IDADE_VERIFICADA as CARGO_IDADE_OK,
  CARGO_VERIFICACAO_ADICIONAL
} from '../verificacaoEtaria.js';
import { buildModalWlEtapa1, getWlPrecheck } from '../wlForm.js';

const IDS_ACEITAR = new Set(['verif_idade_aceitar', 'verif_idade_aceitar_wl']);
const IDS_RECUSAR = new Set(['verif_idade_recusar', 'verif_idade_recusar_wl']);

export default async function (client) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const id = interaction.customId;
    if (!IDS_ACEITAR.has(id) && !IDS_RECUSAR.has(id)) return;

    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Este botão só pode ser usado em um servidor.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (id === 'verif_idade_aceitar_wl') {
      return handleAceitarWl(interaction);
    }

    if (id === 'verif_idade_aceitar') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return handleAceitarPadrao(interaction);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    return handleRecusar(interaction);
  });
}

/** Fluxo painel público: só cargos + mensagem (resposta adiada). */
async function handleAceitarPadrao(interaction) {
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (member.roles.cache.has(CARGO_IDADE_OK)) {
      return interaction.editReply({
        content: '✅ Você já possui o cargo de **idade verificada** neste servidor.'
      });
    }

    await member.roles.add(CARGO_IDADE_OK, 'Verificação etária — confirmação no Discord (etapa 1)');
    if (member.roles.cache.has(CARGO_VERIFICACAO_ADICIONAL)) {
      try {
        await member.roles.remove(
          CARGO_VERIFICACAO_ADICIONAL,
          'Confirmou verificação etária — removendo marcação de verificação adicional'
        );
      } catch (_) {}
    }

    return interaction.editReply({
      content:
        '✅ **Verificação registrada.** Você recebeu o cargo de idade verificada para a liberação inicial dos canais.\n\n' +
        'Lembrete: esta etapa no Discord **não** substitui a segunda etapa obrigatória no jogo.'
    });
  } catch (err) {
    return tratarErro(interaction, err);
  }
}

/**
 * Após confirmar idade no fluxo da WL: **não** pode usar defer antes do modal.
 */
async function handleAceitarWl(interaction) {
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id, { force: true });

    if (member.roles.cache.has(CARGO_VERIFICACAO_ADICIONAL) && !member.roles.cache.has(CARGO_IDADE_OK)) {
      return interaction.reply({
        content:
          '⛔ **Verificação adicional pendente.** Sua conta está marcada para revisão. Não é possível continuar a whitelist por aqui até a equipe regularizar.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (!member.roles.cache.has(CARGO_IDADE_OK)) {
      await member.roles.add(CARGO_IDADE_OK, 'Verificação etária — confirmação no Discord (WL)');
    }
    try {
      await member.roles.remove(
        CARGO_VERIFICACAO_ADICIONAL,
        'Confirmou verificação etária — removendo marcação de verificação adicional'
      );
    } catch (_) {}

    const atualizado = await interaction.guild.members.fetch(interaction.user.id, { force: true });
    const pre = getWlPrecheck(atualizado);
    if (!pre.ok) {
      return interaction.reply({ content: pre.message, flags: MessageFlags.Ephemeral });
    }

    return interaction.showModal(buildModalWlEtapa1());
  } catch (err) {
    console.error('[WL][idadeVerification][aceitar_wl]', err);
    const msg =
      err?.code === 50013 || err?.message?.includes('Missing Permissions')
        ? '❌ O bot não conseguiu alterar cargos ou abrir o formulário. Verifique hierarquia de cargos e permissões.'
        : `❌ Não foi possível concluir: ${err?.message || err}`;
    try {
      if (interaction.replied || interaction.deferred) {
        return await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      }
      return await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
    } catch (e) {
      console.error('[WL][idadeVerification] falha ao responder', e);
    }
  }
}

async function handleRecusar(interaction) {
  try {
    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (member.roles.cache.has(CARGO_VERIFICACAO_ADICIONAL)) {
      return interaction.editReply({
        content:
          'ℹ️ Sua conta já está marcada para **verificação adicional**. Em caso de dúvida, procure a equipe pelo canal adequado.'
      });
    }

    if (member.roles.cache.has(CARGO_IDADE_OK)) {
      try {
        await member.roles.remove(CARGO_IDADE_OK, 'Recusou verificação etária — removendo idade verificada');
      } catch (_) {}
    }

    await member.roles.add(
      CARGO_VERIFICACAO_ADICIONAL,
      'Verificação etária — não confirmou / verificação adicional'
    );

    return interaction.editReply({
      content:
        'Você indicou que **não pode confirmar** a verificação etária. Foi aplicado o cargo de **verificação adicional**. ' +
        'Se isso foi um engano, abra um ticket ou fale com a equipe para regularizar seu caso.'
    });
  } catch (err) {
    return tratarErro(interaction, err);
  }
}

async function tratarErro(interaction, err) {
  console.error('[WL][idadeVerification]', err);
  const msg =
    err?.code === 50013 || err?.message?.includes('Missing Permissions')
      ? '❌ O bot não conseguiu alterar cargos. Verifique se o cargo do bot está **acima** dos cargos de verificação e se ele tem **Gerenciar cargos**.'
      : `❌ Não foi possível concluir: ${err?.message || err}`;
  try {
    return await interaction.editReply({ content: msg });
  } catch (_) {}
}
