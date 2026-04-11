import { buildPainelVerificacaoEtaria } from '../verificacaoEtaria.js';

export const data = {
  name: 'painel-idade',
  description: 'Publica o aviso legal e o painel de verificação etária (18+).'
};

export async function execute(message, args, client) {
  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Você não tem permissão!');
  }

  const { embeds, components } = buildPainelVerificacaoEtaria();

  await message.channel.send({
    embeds,
    components
  });
  await message.reply('✅ Painel de verificação etária publicado.');
}
