export const CHAVE_ATIVA = 'railroad_ficha_local_ativa_v1';
export const PREFIXO_RASCUNHO = 'railroad_rascunho:';
export const nomeValido = (valor) => String(valor || '').trim().slice(0, 120) || 'Personagem local';
