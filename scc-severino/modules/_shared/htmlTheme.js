/** Visual dos HTML gerados — alinhado ao regras-scc. */
export const HTML_THEME = {
  logo: 'https://i.imgur.com/aawPk38.png',
  favicon: 'https://i.imgur.com/WEh0qkj.png',
  primary: '#ff0000',
  secondary: '#ff3333',
  accent: '#cc0000',
  timeoutMs: 120000
};

export function htmlRetryMessage(error) {
  const timedOut = error?.code === 'REPORT_TIMEOUT' || error?.message === 'TIMEOUT';
  if (timedOut) {
    return '⏱️ A geração do HTML demorou demais e foi interrompida.\n**Tente o comando novamente.**';
  }
  return '❌ Não foi possível gerar o HTML.\n**Tente o comando novamente.**';
}

export async function withHtmlTimeout(work, timeoutMs = HTML_THEME.timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('TIMEOUT');
      err.code = 'REPORT_TIMEOUT';
      reject(err);
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(work), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyHtmlFailure({ processingMsg, message, interaction, error, extra = '' }) {
  console.error('Erro ao gerar HTML:', error);
  const text = `${htmlRetryMessage(error)}${extra ? `\n${extra}` : ''}`;

  if (processingMsg) {
    try {
      await processingMsg.edit({ content: text, embeds: [], files: [], components: [] });
      return;
    } catch (_) { /* cai no fallback */ }
  }

  if (interaction) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: text });
      } else {
        await interaction.reply({ content: text, ephemeral: true });
      }
      return;
    } catch (_) { /* cai no fallback */ }
  }

  if (message) {
    await message.reply(text).catch(() => {});
  }
}
