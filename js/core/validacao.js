import { normalizarInventario } from '../dominio/inventario.js?v=1.4.18';

export function validarFicha(dados) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Ficha inválida.');
    if (dados.versao !== undefined && ![1, 2, 3].includes(dados.versao)) throw new Error('Versão de ficha não suportada.');
    if (dados.itensQuadro !== undefined && !Array.isArray(dados.itensQuadro)) throw new Error('Itens do quadro inválidos.');
    return dados;
}

export function normalizarFicha(dados) {
    validarFicha(dados);
    const personagem = dados.personagem;
    return {
        ...dados, versao: 3, itensQuadro: dados.itensQuadro || [],
        personagem: personagem && typeof personagem === 'object' && !Array.isArray(personagem) ? { ...personagem } : {},
        inventario: normalizarInventario(dados.inventario),
    };
}

/**
 * Valida arquivos externos antes de converter formatos legados. A edição normal
 * continua permissiva com campos adicionais para não perder dados das fichas.
 */
export function validarArquivoFicha(dados) {
    validarFicha(dados);
    const objeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
    const validarObjeto = (valor, nome) => {
        if (valor !== undefined && !objeto(valor))
            throw new Error(`${nome} precisa ser um objeto.`);
    };
    validarObjeto(dados.personagem, 'Personagem');
    if (dados.inventario !== undefined && !objeto(dados.inventario) && !Array.isArray(dados.inventario))
        throw new Error('Inventário inválido.');
    const inventario = dados.inventario;
    const itens = Array.isArray(inventario) ? inventario : inventario?.itens;
    if (itens !== undefined) {
        if (!Array.isArray(itens) || itens.length > 5000)
            throw new Error('Lista de itens inválida ou excessiva.');
        for (const item of itens) {
            if (!objeto(item)) throw new Error('Cada item de inventário precisa ser um objeto.');
            for (const campo of ['nome', 'descricao', 'tamanho', 'local']) {
                if (item[campo] !== undefined && !['string', 'number'].includes(typeof item[campo]))
                    throw new Error(`Campo ${campo} do inventário inválido.`);
            }
            if (item.quantidade !== undefined) {
                const valor = Number(String(item.quantidade).trim().replace(',', '.'));
                if (!Number.isFinite(valor) || valor < 0 || valor > 1000000)
                    throw new Error('Quantidade do item inválida.');
            }
        }
    }
    if (objeto(inventario)) validarObjeto(inventario.rolagens, 'Rolagens');
    if (dados.itensQuadro && dados.itensQuadro.length > 2000)
        throw new Error('Quantidade excessiva de elementos no quadro.');
    // Elimina chaves especiais que poderiam se tornar perigosas ao serem
    // copiadas para outros objetos por código atual ou integrações futuras.
    const pendentes = [{ valor: dados, nivel: 0 }];
    let contagem = 0;
    while (pendentes.length) {
        const { valor, nivel } = pendentes.pop();
        if (++contagem > 100000 || nivel > 70)
            throw new Error('Arquivo JSON excessivamente complexo.');
        if (!objeto(valor) && !Array.isArray(valor)) continue;
        for (const [chave, filho] of Object.entries(valor)) {
            if (['__proto__', 'prototype', 'constructor'].includes(chave))
                throw new Error(`Campo reservado não permitido: ${chave}.`);
            if (filho && typeof filho === 'object')
                pendentes.push({ valor: filho, nivel: nivel + 1 });
        }
    }
    return dados;
}
