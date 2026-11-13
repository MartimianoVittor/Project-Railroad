export const CHAVE_STORAGE = 'railroad_rpg_ficha';
export function lerFicha() {
    const texto = localStorage.getItem(CHAVE_STORAGE);
    if (!texto) return null;
    return JSON.parse(texto);
}
export function gravarFicha(dados) {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
}
export function apagarFicha() { localStorage.removeItem(CHAVE_STORAGE); }
