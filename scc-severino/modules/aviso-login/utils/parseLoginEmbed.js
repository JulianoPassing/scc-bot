/**
 * Extrai Discord ID, nome do player e coordenadas do embed de login (fm-logs).
 * Aceita fields formais e texto na description (com markdown ** e `).
 */
export const parseLoginEmbed = (embed) => {
  if (!embed) return null;

  const description = embed.description || '';
  const title = embed.title || '';
  const fields = embed.fields || [];
  const text = `${title}\n${description}`;

  let discordId = null;
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
    // Ex: **Discord ID:** `531132498692800530`
    const fromText = text.match(
      /Discord\s*ID\s*[:：]\s*\*{0,2}\s*`?(\d{15,20}|Not Available)`?/i
    );
    if (fromText?.[1] && !/^not\s*available$/i.test(fromText[1])) {
      discordId = fromText[1];
    }
  }

  if (!discordId) {
    // Fallback: qualquer snowflake após a label Discord ID
    const fallback = text.match(/Discord\s*ID[\s\S]{0,20}?(\d{15,20})/i);
    if (fallback?.[1]) discordId = fallback[1];
  }

  if (!discordId) return null;

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

  return { discordId, playerName, coordenadas };
};
