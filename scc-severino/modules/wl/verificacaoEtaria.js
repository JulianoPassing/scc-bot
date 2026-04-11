import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/** Idade Verificada — libera etapa inicial (inclui iniciar WL) */
export const CARGO_IDADE_VERIFICADA = '1491613865967095868';
/** Reprovado / suspeito — verificação adicional (staff) */
export const CARGO_VERIFICACAO_ADICIONAL = '1491622218432516106';
/** Aplicado junto ao recusar a verificação etária (“Não posso confirmar”) */
export const CARGO_RECUSA_VERIFICACAO_ETARIA = '1277776569389289562';

/** Azul institucional */
const COR_AVISO = 0x2563eb;
/** Âmbar — destaque para ação obrigatória */
const COR_VERIF = 0xea580c;

/**
 * Mesmo conteúdo do !painel-idade — usado no canal e ao bloquear a WL.
 * @param {{ wlFlow?: boolean }} [options] — se `wlFlow`, botões continuam a WL após confirmar idade.
 * @returns {{ embeds: import('discord.js').EmbedBuilder[], components: import('discord.js').ActionRowBuilder[] }}
 */
export function buildPainelVerificacaoEtaria(options = {}) {
  const wlFlow = options.wlFlow === true;
  const aceitarId = wlFlow ? 'verif_idade_aceitar_wl' : 'verif_idade_aceitar';
  const recusarId = wlFlow ? 'verif_idade_recusar_wl' : 'verif_idade_recusar';

  const embedAviso = new EmbedBuilder()
    .setColor(COR_AVISO)
    .setTitle('Acesso ao servidor — exclusivo para maiores de 18 anos')
    .setDescription(
      '**Este ambiente digital possui restrição etária.** O servidor destina-se **exclusivamente a pessoas com 18 anos ou mais**, em linha com as exigências legais vigentes no Brasil para a **proteção de crianças e adolescentes** em plataformas online.'
    )
    .addFields(
      {
        name: 'Natureza desta medida',
        value:
          'Trata-se de **cumprimento legal**, não de política interna opcional. A coleta de confirmação etária integra o processo de **adequação regulatória** do servidor.'
      },
      {
        name: 'Marco legal',
        value:
          '**Lei nº 15.211/2025** — Estatuto Digital da Criança e do Adolescente (“ECA Digital”, também referida como “Lei Felca”).\n' +
          '**Decreto nº 12.880/2026** — regulamentação aplicável.'
      },
      {
        name: 'Conteúdo e duas etapas',
        value:
          'As interações, linguagem e temas são voltados ao **público adulto**. Por isso, o acesso à **comunidade** e à **cidade** exige **confirmação em duas etapas**, conforme o processo de adequação legal.'
      }
    )
    .setFooter({ text: 'Street Car Club · Verificação de elegibilidade etária' });

  const embedVerificacao = new EmbedBuilder()
    .setColor(COR_VERIF)
    .setTitle('Verificação etária obrigatória')
    .setDescription(
      '**Leia com atenção.** Ao utilizar os botões abaixo, você formaliza declarações com efeito para o acesso ao servidor.\n\n' +
        '*Declarações sob sua responsabilidade:*'
    )
    .addFields(
      {
        name: 'O que você reconhece',
        value:
          '**1.** Possuir **18 anos ou mais**.\n' +
          '**2.** Compreender que o ambiente é destinado **exclusivamente ao público adulto**.\n' +
          '**3.** Estar ciente de que o acesso à comunidade e ao servidor depende de **confirmação em duas etapas**.\n' +
          '**4.** Reconhecer que informações **falsas ou enganosas** podem implicar **reprovação de acesso**, suspensão, bloqueio, banimento e **preservação de registros**, nos termos aplicáveis.\n' +
          '**5.** Aceitar que, em caso de **denúncia**, suspeita fundamentada, inconsistência cadastral ou necessidade de validação, a equipe poderá solicitar **comprovação manual complementar**.'
      },
      {
        name: 'Efeito da confirmação',
        value:
          'Ao **confirmar**, você receberá o cargo **Idade verificada**, habilitando a **liberação inicial** dos canais compatíveis com esta etapa.'
      },
      {
        name: 'Etapa no jogo',
        value:
          '> **Importante:** a confirmação neste **Discord não substitui** a **segunda etapa obrigatória no jogo**. O acesso pleno à cidade somente ocorre após a **conclusão integral das duas etapas**.'
      }
    )
    .setFooter({ text: 'Discord = etapa 1 · Jogo = etapa 2 · Ambos obrigatórios' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(aceitarId)
      .setLabel('Confirmar — maior de 18 anos')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(recusarId)
      .setLabel('Não posso confirmar')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embedAviso, embedVerificacao], components: [row] };
}
