import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/** Idade Verificada — libera etapa inicial (inclui iniciar WL) */
export const CARGO_IDADE_VERIFICADA = '1491613865967095868';
/** Reprovado / suspeito — verificação adicional (staff) */
export const CARGO_VERIFICACAO_ADICIONAL = '1491622218432516106';

const COR_AVISO = 0x5865f2;
const COR_VERIF = 0xe67e22;

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
    .setTitle('⚖️ Acesso exclusivo — maiores de 18 anos')
    .setColor(COR_AVISO)
    .setDescription(
      'Informamos que nosso servidor tem acesso exclusivo para **maiores de 18 anos**, em adequação às exigências legais atualmente vigentes no Brasil para proteção de crianças e adolescentes em ambientes digitais.\n\n' +
        'Esta medida **não** se trata de uma escolha interna opcional.\n' +
        'Ela decorre do cumprimento da **Lei nº 15.211/2025** (Estatuto Digital da Criança e do Adolescente / “ECA Digital”, popularmente chamada por muitos de “Lei Felca”) e de sua regulamentação pelo **Decreto nº 12.880/2026**.\n\n' +
        'Nosso ambiente possui interações, linguagem e temas voltados ao **público adulto**. Por isso, o acesso à comunidade e à cidade passa a exigir **confirmação obrigatória em duas etapas**, como parte do nosso processo de adequação legal.'
    );

  const embedVerificacao = new EmbedBuilder()
    .setTitle('🔞 VERIFICAÇÃO ETÁRIA')
    .setColor(COR_VERIF)
    .setDescription(
      'Ao aceitar esta verificação, você declara, sob sua responsabilidade, que:\n\n' +
        '• possui **18 anos ou mais**;\n' +
        '• compreende que este é um ambiente destinado **exclusivamente ao público adulto**;\n' +
        '• está ciente de que o acesso à comunidade e ao servidor depende de **confirmação em duas etapas**;\n' +
        '• reconhece que o fornecimento de informações falsas poderá resultar em **reprovação de acesso**, suspensão, bloqueio, banimento e preservação de registros internos, conforme as regras aplicáveis;\n' +
        '• compreende que o servidor poderá, em caso de denúncia, suspeita fundada, inconsistência cadastral ou necessidade de validação adicional, solicitar **comprovação manual complementar**.\n\n' +
        'Ao **confirmar** esta etapa, você receberá o cargo de **idade verificada** para liberação inicial dos canais.\n\n' +
        '**Importante:** esta confirmação no Discord **não substitui** a segunda etapa obrigatória **dentro do jogo**. O acesso à cidade somente será liberado após a conclusão integral das **duas etapas**.'
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(aceitarId)
      .setLabel('Confirmar verificação etária')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(recusarId)
      .setLabel('Não posso confirmar')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embedAviso, embedVerificacao], components: [row] };
}
