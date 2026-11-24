/** A ordem dos campos de um objeto JSON não muda o conteúdo da ficha. */
export function serializarOrdenado(dados) {
    return JSON.stringify(dados, (_, valor) => {
        if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor;
        return Object.fromEntries(Object.keys(valor).sort().map((chave) => [chave, valor[chave]]));
    });
}
