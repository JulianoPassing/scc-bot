import { EmbedBuilder, MessageFlags } from 'discord.js';
import {
  CARGO_IDADE_VERIFICADA as CARGO_IDADE_OK,
  CARGO_VERIFICACAO_ADICIONAL,
  CARGO_RECUSA_VERIFICACAO_ETARIA
} from '../verificacaoEtaria.js';
import { buildModalWlEtapa1, getWlPrecheck } from '../wlForm.js';

/** Canal de logs — verificação etária / termos */
const CANAL_LOG_VERIFICACAO_IDADE = '1492629401895178480';

const IDS_ACEITAR = new Set(['verif_idade_aceitar', 'verif_idade_aceitar_wl']);
const IDS_RECUSAR = new Set(['verif_idade_recusar', 'verif_idade_recusar_wl']);

/**
 * Log no mesmo padrão visual dos embeds de resultado da WL.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').User} user
 * @param {{ termosAceitos: boolean; idadeVerificada: boolean; fluxoWl: boolean; observacao?: string }} opts
 */
async function enviarLogVerificacaoIdade(guild, user, opts) {
  try {
    const canal = guild.channels.cache.get(CANAL_LOG_VERIFICACAO_IDADE);
    if (!canal?.isTextBased()) {
      console.error('[WL][idadeVerification] Canal de log de idade não encontrado ou não é texto:', CANAL_LOG_VERIFICACAO_IDADE);
      return;
    }
    const { termosAceitos, idadeVerificada, fluxoWl, observacao } = opts;
    const aprovado = termosAceitos && idadeVerificada;
    const embed = new EmbedBuilder()
      .setColor(aprovado ? 0x00ff00 : 0xff0000)
      .setTitle(aprovado ? '✅ Verificação etária' : '❌ Verificação etária — Termos não aceitos')
      .setDescription(`**Usuário:** <@${user.id}> (${user.tag})`)
      .addFields(
        {
          name: 'Idade verificada',
          value: idadeVerificada ? '✅ Sim (cargo aplicado / mantido)' : '❌ Não',
          inline: true
        },
        {
          name: 'Termos aceitos',
          value: termosAceitos ? '✅ Sim' : '❌ Não',
          inline: true
        },
        {
          name: 'Origem',
          value: fluxoWl ? 'Whitelist (etapa 18+)' : 'Painel de verificação etária',
          inline: false
        }
      )
      .setFooter({ text: 'Street Car Club • Sistema de Whitelist' })
      .setTimestamp()
      .setThumbnail(user.displayAvatarURL({ size: 128 }));
    if (observacao) {
      embed.addFields({ name: 'Observação', value: observacao, inline: false });
    }
    await canal.send({ embeds: [embed] });
  } catch (err) {
    console.error('[WL][idadeVerification] Erro ao enviar log de verificação de idade:', err);
  }
}

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
      await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
        termosAceitos: true,
        idadeVerificada: true,
        fluxoWl: false,
        observacao: 'Usuário já possuía o cargo de idade verificada; confirmou novamente os termos.'
      });
      return interaction.editReply({
        content: '✅ Você já possui o cargo de **idade verificada** neste servidor.'
      });
    }

    await member.roles.add(CARGO_IDADE_OK, 'Verificação etária — confirmação no Discord (etapa 1)');
    try {
      await member.roles.remove(
        CARGO_VERIFICACAO_ADICIONAL,
        'Confirmou verificação etária — removendo marcação de verificação adicional'
      );
    } catch (_) {}
    try {
      await member.roles.remove(
        CARGO_RECUSA_VERIFICACAO_ETARIA,
        'Confirmou verificação etária — removendo cargo de recusa'
      );
    } catch (_) {}

    await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
      termosAceitos: true,
      idadeVerificada: true,
      fluxoWl: false
    });

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
    try {
      await member.roles.remove(
        CARGO_RECUSA_VERIFICACAO_ETARIA,
        'Confirmou verificação etária (WL) — removendo cargo de recusa'
      );
    } catch (_) {}

    const atualizado = await interaction.guild.members.fetch(interaction.user.id, { force: true });
    const pre = getWlPrecheck(atualizado);
    if (!pre.ok) {
      await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
        termosAceitos: true,
        idadeVerificada: true,
        fluxoWl: true,
        observacao:
          'Termos aceitos e cargo de idade OK; o pré-check da whitelist impediu abrir o formulário (ex.: cooldown ou já aprovado).'
      });
      return interaction.reply({ content: pre.message, flags: MessageFlags.Ephemeral });
    }

    await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
      termosAceitos: true,
      idadeVerificada: true,
      fluxoWl: true
    });

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

    const jaAdicional = member.roles.cache.has(CARGO_VERIFICACAO_ADICIONAL);
    const jaRecusa = member.roles.cache.has(CARGO_RECUSA_VERIFICACAO_ETARIA);
    const fluxoWl = interaction.customId === 'verif_idade_recusar_wl';
    if (jaAdicional && jaRecusa) {
      await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
        termosAceitos: false,
        idadeVerificada: false,
        fluxoWl,
        observacao: 'Clicou em não confirmar, mas a conta já estava com verificação adicional e cargo de recusa.'
      });
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

    if (!jaAdicional) {
      await member.roles.add(
        CARGO_VERIFICACAO_ADICIONAL,
        'Verificação etária — não confirmou / verificação adicional'
      );
    }
    if (!jaRecusa) {
      await member.roles.add(
        CARGO_RECUSA_VERIFICACAO_ETARIA,
        'Verificação etária — não confirmou (cargo complementar)'
      );
    }

    await enviarLogVerificacaoIdade(interaction.guild, interaction.user, {
      termosAceitos: false,
      idadeVerificada: false,
      fluxoWl
    });

    return interaction.editReply({
      content:
        'Você indicou que **não pode confirmar** a verificação etária. Foram aplicados os cargos de **verificação adicional** e o cargo complementar de recusa. ' +
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
