/** Servidor Street Car Club */
export const GUILD_ID = '1046404063287332936';

/** Cargo modelo (Morador) — origem: `1317086939555434557` */
export const ROLE_MORADOR_ID = '1317086939555434557';

/**
 * Cargo Idade verificada — destino: `1492688339558600806`
 * `!clonar-permissoes-idade`: copia overwrite explícito do Morador; onde ele não tem linha
 * no canal, calcula allow/deny para `permissionsFor` do Idade = do Morador (categorias primeiro).
 */
export const ROLE_IDADE_VERIFICADA_ID = '1492688339558600806';

/** Intervalo entre chamadas à API de permissões (ms) */
export const DELAY_MS = 400;

/**
 * A cada quantos canais a mensagem de progresso é atualizada (1 = todos; 5 = menos edições).
 * No comando: `5` ou `cada5` nos argumentos força atualizar de 5 em 5.
 */
export const PROGRESS_EDIT_EVERY = 5;

/** Canal de origem do teste `!clonar-canal-teste` — copia todos os overwrites deste canal */
export const TEST_CANAL_ORIGEM_ID = '1046404065690652745';
