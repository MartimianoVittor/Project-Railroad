import { CHAVE_STORAGE } from '../core/storage.js';

const CHAVE_INDICE = 'railroad_fichas_locais_v1';
const CHAVE_ATIVA = 'railroad_ficha_local_ativa_v1';
const CHAVE_MIGRADA = 'railroad_ficha_legada_migrada_v1';
const PREFIXO_FICHA = 'railroad_ficha_local:';

const nomeValido = (valor) => String(valor || '').trim().slice(0, 120) || 'Personagem local';
const chaveFicha = (id) => `${PREFIXO_FICHA}${id}`;

/** Uma ficha por chave: a lista não duplica as imagens grandes salvas em JSON. */
export function criarRepositorioLocal(armazenamento = localStorage) {
    const lerIndice = () => JSON.parse(armazenamento.getItem(CHAVE_INDICE) || '[]');
    const gravarIndice = (lista) => armazenamento.setItem(CHAVE_INDICE, JSON.stringify(lista));

    function obter(id) {
        const texto = armazenamento.getItem(chaveFicha(id));
        return texto ? JSON.parse(texto) : null;
    }

    function criar(titulo, dados) {
        const registro = {
            id: crypto.randomUUID(),
            titulo: nomeValido(titulo),
            dados,
            updatedAt: new Date().toISOString(),
        };
        armazenamento.setItem(chaveFicha(registro.id), JSON.stringify(registro));
        try {
            gravarIndice([...lerIndice(), {
                id: registro.id, titulo: registro.titulo, updatedAt: registro.updatedAt,
            }]);
        } catch (erro) {
            armazenamento.removeItem(chaveFicha(registro.id));
            throw erro;
        }
        return registro;
    }

    function salvar(id, dados) {
        const anterior = obter(id);
        if (!anterior)
            throw new Error('Ficha local não encontrada.');
        const atualizado = { ...anterior, dados, updatedAt: new Date().toISOString() };
        armazenamento.setItem(chaveFicha(id), JSON.stringify(atualizado));
        gravarIndice(lerIndice().map((ficha) => ficha.id === id
            ? { id, titulo: atualizado.titulo, updatedAt: atualizado.updatedAt }
            : ficha));
        return atualizado;
    }

    function renomear(id, titulo) {
        const registro = obter(id);
        if (!registro)
            throw new Error('Ficha local não encontrada.');
        registro.titulo = nomeValido(titulo);
        armazenamento.setItem(chaveFicha(id), JSON.stringify(registro));
        gravarIndice(lerIndice().map((ficha) => ficha.id === id
            ? { ...ficha, titulo: registro.titulo }
            : ficha));
        return registro;
    }

    function excluir(id) {
        gravarIndice(lerIndice().filter((ficha) => ficha.id !== id));
        armazenamento.removeItem(chaveFicha(id));
        if (armazenamento.getItem(CHAVE_ATIVA) === id)
            armazenamento.removeItem(CHAVE_ATIVA);
    }

    function migrarAntiga(normalizarFicha) {
        if (armazenamento.getItem(CHAVE_MIGRADA))
            return;
        const legada = armazenamento.getItem(CHAVE_STORAGE);
        if (legada) {
            let dados;
            try {
                dados = normalizarFicha(JSON.parse(legada));
            } catch (erro) {
                // Mantém o valor antigo para recuperação manual sem bloquear o site.
                console.warn('A ficha antiga não é válida e foi preservada.', erro);
                armazenamento.setItem(CHAVE_MIGRADA, '1');
                return;
            }
            const titulo = dados.personagem?.['nome-personagem'] || 'Ficha antiga';
            const registro = criar(titulo, dados);
            armazenamento.setItem(CHAVE_ATIVA, registro.id);
            // Só remove o antigo depois que a nova cópia foi salva corretamente.
            armazenamento.removeItem(CHAVE_STORAGE);
        }
        armazenamento.setItem(CHAVE_MIGRADA, '1');
    }

    return {
        listar: () => lerIndice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        obter, criar, salvar, renomear, excluir, migrarAntiga,
        ativa: () => armazenamento.getItem(CHAVE_ATIVA),
        selecionar: (id) => armazenamento.setItem(CHAVE_ATIVA, id),
    };
}
