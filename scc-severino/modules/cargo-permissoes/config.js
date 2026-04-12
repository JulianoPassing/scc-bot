/** Servidor Street Car Club */
export const GUILD_ID = '1046404063287332936';

/** Cargo modelo (Morador) — origem: `1317086939555434557` */
export const ROLE_MORADOR_ID = '1317086939555434557';

/**
 * Cargo Idade verificada — destino: `1492688339558600806`
 * Só recebe cópia onde o Morador já tem overwrite; allow/deny ficam idênticos.
 * Onde o Morador não tem linha, o destino não é alterado (nada é removido).
 */
export const ROLE_IDADE_VERIFICADA_ID = '1492688339558600806';

/** Intervalo entre edições (ms) para aliviar rate limit */
export const DELAY_MS = 400;
