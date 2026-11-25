import { serializarOrdenado } from '../core/serializacao.js?v=1.4.23';
import { normalizarFicha } from '../core/validacao.js?v=1.4.23';
import { localDoItem } from '../dominio/inventario.js?v=1.4.23';

function idPersistente(ficha) {
    const id = ficha.railroadId;
    return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,90}$/.test(id) ? 'id:' + id : null;
}

async function hash(texto) {
    const assinatura = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    const hexadecimal = Array.from(new Uint8Array(assinatura), (byte) => byte.toString(16).padStart(2, '0'));
    return 'sha256:' + hexadecimal.join('');
}

// O banco antigo gravava o hash antes de preservar extras e quantidades zero.
// Essa representação é usada só para reconhecer importações anteriores.
function conteudoAnterior(original) {
    const ficha = normalizarFicha(original);
    const inventario = original.inventario;
    const itens = Array.isArray(inventario) ? inventario : inventario?.itens;
    ficha.inventario = {
        rolagens: ficha.inventario.rolagens,
        itens: (Array.isArray(itens) ? itens : []).filter((item) => item && typeof item === 'object')
            .map((item) => ({
                nome: String(item.nome || ''),
                quantidade: Math.max(1, Number(item.quantidade) || 1),
                descricao: String(item.descricao || ''),
                tamanho: String(item.tamanho ?? ''),
                preco: Number(item.preco) || 0,
                local: localDoItem(item.local),
            })),
    };
    return JSON.stringify(ficha);
}

function identificarConteudo(ficha) {
    return hash('railroad:2\n' + serializarOrdenado(ficha));
}

export async function identidadeDaImportacao(dados) {
    const ficha = normalizarFicha(dados);
    return idPersistente(ficha) ?? identificarConteudo(ficha);
}

export async function identificarArquivo(ficha, textoOriginal) {
    const id = idPersistente(ficha);
    if (id) return { principal: id };
    const [principal, anterior] = await Promise.all([
        identificarConteudo(ficha),
        hash(conteudoAnterior(JSON.parse(textoOriginal))),
    ]);
    return { principal, anterior };
}
