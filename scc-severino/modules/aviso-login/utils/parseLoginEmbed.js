/**
 * Extrai Discord ID, nome do player e coordenadas do embed de login (fm-logs).
 * Aceita tanto fields formais quanto texto na description.
 */
export const parseLoginEmbed = (embed) => {
  if (!embed) return null;

  const description = embed.description || '';
  const title = embed.title || '';
  const fields = embed.fields || [];

  let discordId = null;
  let coordenadas = null;
  let playerName = null;

  const findField = (names) =>
    fields.find((f) => names.some((n) => (f.name || '').toLowerCase().includes(n)));

  const discordField = findField(['discord id', 'discordid']);
  if (discordField?.value) {
    const match = String(discordField.value).replace(/[`*]/g, '').match(/(\d{15,20})/);
    if (match) discordId = match[1];
  }

  if (!discordId) {
    const fromText = `${title}\n${description}`.match(
      /Discord\s*ID\s*[:：]\s*`?(\d{15,20}|Not Available)`?/i
    );
    if (fromText && fromText[1] && fromText[1].toLowerCase() !== 'not available') {
      discordId = fromText[1];
    }
  }

  if (!discordId || discordId.toLowerCase() === 'not available') {
    return null;
  }

  const coordsField = findField(['coordenadas', 'coordinates', 'coords']);
  if (coordsField?.value) {
    coordenadas = String(coordsField.value).replace(/[`*]/g, '').trim();
  } else {
    const coordsMatch = `${title}\n${description}`.match(
      /Coordenadas\s*[:：]\s*`?([^`\n]+)`?/i
    );
    if (coordsMatch) coordenadas = coordsMatch[1].trim();
  }

  const playerMatch = `${title}\n${description}`.match(
    /\[Player\]\s*(.+?)\s+apareceu/i
  );
  if (playerMatch) playerName = playerMatch[1].trim();

  return { discordId, playerName, coordenadas };
};
