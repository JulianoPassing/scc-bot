/**
 * Extrai Discord ID, nome do player e coordenadas do embed de LOGIN (apareceu).
 * Ignora logs de saída (saiu do servidor).
 */
export const parseLoginEmbed = (embed) => {
  if (!embed) return null;

  const description = embed.description || '';
  const title = embed.title || '';
  const fields = embed.fields || [];
  const text = `${title}\n${description}`;

  // Só avisa no login ("apareceu"). Ignora logout ("saiu").
  if (!/apareceu/i.test(text)) return null;
  if (/saiu\s+do\s+servidor/i.test(text)) return null;

  let discordId = null;
  let serverId = null;
  let coordenadas = null;
  let playerName = null;

  const findField = (names) =>
    fields.find((f) => names.some((n) => (f.name || '').toLowerCase().includes(n)));

  const extractDiscordId = (raw) => {
    if (!raw) return null;
    const cleaned = String(raw).replace(/[*`]/g, '').trim();
    if (/^not\s*available$/i.test(cleaned)) return null;
    const match = cleaned.match(/(\d{15,20})/);
    return match ? match[1] : null;
  };

  const discordField = findField(['discord id', 'discordid']);
  if (discordField?.value) {
    discordId = extractDiscordId(discordField.value);
  }

  if (!discordId) {
    const fromText = text.match(
      /Discord\s*ID\s*[:：]\s*\*{0,2}\s*`?(\d{15,20}|Not Available)`?/i
    );
    if (fromText?.[1] && !/^not\s*available$/i.test(fromText[1])) {
      discordId = fromText[1];
    }
  }

  if (!discordId) {
    const fallback = text.match(/Discord\s*ID[\s\S]{0,20}?(\d{15,20})/i);
    if (fallback?.[1]) discordId = fallback[1];
  }

  if (!discordId) return null;

  const serverField = findField(['id do servidor', 'server id', 'servidor']);
  if (serverField?.value) {
    const cleaned = String(serverField.value).replace(/[*`]/g, '').trim();
    if (cleaned && !/^not\s*available$/i.test(cleaned)) serverId = cleaned;
  }

  if (!serverId) {
    const serverMatch = text.match(
      /ID\s+do\s+Servidor\s*[:：]\s*\*{0,2}\s*`?([^`*\n]+)`?/i
    );
    if (serverMatch?.[1]) {
      const cleaned = serverMatch[1].trim();
      if (cleaned && !/^not\s*available$/i.test(cleaned)) serverId = cleaned;
    }
  }

  const coordsField = findField(['coordenadas', 'coordinates', 'coords']);
  if (coordsField?.value) {
    coordenadas = String(coordsField.value).replace(/[*`]/g, '').trim();
  } else {
    const coordsMatch = text.match(
      /Coordenadas\s*[:：]\s*\*{0,2}\s*`?([^`*\n]+)`?/i
    );
    if (coordsMatch) coordenadas = coordsMatch[1].trim();
  }

  const playerMatch = text.match(/\[Player\]\s*(.+?)\s+apareceu/i);
  if (playerMatch) playerName = playerMatch[1].trim();

  return { discordId, serverId, playerName, coordenadas };
};
