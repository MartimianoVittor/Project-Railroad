export const ARMAS = ['primaria', 'secundaria'];
export const DISTANCIAS = ['corpo', 'curta', 'media', 'longa'];

export function inteiroNaoNegativo(valor) {
    const numero = Number(String(valor ?? '').trim().replace(',', '.'));
    return Number.isFinite(numero) ? Math.max(0, Math.trunc(numero)) : 0;
}

export function localDoItem(valor) {
    if (valor === 'montaria' || valor === '') return valor;
    return 'jogador';
}

export function normalizarItem(item) {
    const { nome, quantidade, descricao, tamanho, preco, local, ...extras } = item;
    return {
        nome: String(nome || ''), quantidade: inteiroNaoNegativo(quantidade ?? 1),
        descricao: String(descricao || ''), tamanho: String(tamanho ?? ''),
        preco: Number(preco) || 0, local: localDoItem(local), ...extras,
    };
}

/** Nas fichas mais antigas o inventário é diretamente uma lista de itens. */
export function normalizarInventario(valor) {
    const dados = valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {};
    const { rolagens, itens, ...extras } = dados;
    const lista = Array.isArray(valor) ? valor : Array.isArray(itens) ? itens : [];
    return {
        rolagens: rolagens && typeof rolagens === 'object' && !Array.isArray(rolagens) ? { ...rolagens } : {},
        itens: lista.filter((item) => item && typeof item === 'object' && !Array.isArray(item)).map(normalizarItem),
        ...extras,
    };
}

export function espacoOcupado(itens) {
    const totais = { jogador: 0, montaria: 0 };
    for (const { local, quantidade, tamanho } of itens) {
        if (Object.hasOwn(totais, local)) totais[local] += inteiroNaoNegativo(quantidade) * inteiroNaoNegativo(tamanho);
    }
    return totais;
}
