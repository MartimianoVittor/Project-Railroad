/** IndexedDB em memória para testar o repositório sem depender do navegador. */
export function criarBancoEmMemoria() {
    const fichas = new Map();
    const rascunhos = new Map();
    const copiar = (valor) => structuredClone(valor);

    return {
        listarFichas: async () => [...fichas.values()].map(copiar),
        gravarFicha: async (ficha) => { fichas.set(ficha.id, copiar(ficha)); },
        excluirFicha: async (id) => { fichas.delete(id); },
        listarRascunhos: async () => [...rascunhos.values()].map(copiar),
        gravarRascunho: async (rascunho) => { rascunhos.set(rascunho.chave, copiar(rascunho)); },
        excluirRascunho: async (chave) => { rascunhos.delete(chave); },
    };
}
