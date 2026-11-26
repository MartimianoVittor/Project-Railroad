import { abrirBancoLocal } from './bancoLocal.js?v=1.4.26';
import { migrarArmazenamentoAntigo } from './migracaoFichasLocais.js?v=1.4.26';
import { CHAVE_ATIVA, PREFIXO_RASCUNHO, nomeValido } from './fichasLocaisChaves.js?v=1.4.26';

const chaveRascunho = (uid, id) => `${PREFIXO_RASCUNHO}${uid}:${id}`;

/**
 * Consultas imediatas na memória; gravações sequenciais no IndexedDB.
 * flush() confirma que todas as transações terminaram antes de trocar de ficha.
 */
export function criarRepositorioLocal(armazenamento = localStorage, abrirBanco = abrirBancoLocal) {
    const fichas = new Map();
    const rascunhos = new Map();
    let banco;
    let fila = Promise.resolve();
    const pendentes = new Map();

    function tentar(chave, escrita) {
        escrita.erro = null;
        fila = fila.then(async () => {
            if (pendentes.get(chave) !== escrita) return;
            try {
                await escrita.gravar();
                if (pendentes.get(chave) === escrita) pendentes.delete(chave);
            } catch (erro) { escrita.erro = erro; }
        });
    }

    function enfileirar(chave, gravar) {
        const escrita = { gravar, erro: null };
        pendentes.set(chave, escrita);
        tentar(chave, escrita);
    }

    async function flush() {
        // Outra chamada a flush pode recuperar a última escrita da mesma chave.
        for (const [chave, escrita] of pendentes) {
            if (escrita.erro) tentar(chave, escrita);
        }
        await fila;
        for (const escrita of pendentes.values()) {
            if (escrita.erro) throw escrita.erro;
        }
    }

    function obter(id) {
        return fichas.get(id) || null;
    }

    function criar(titulo, dados) {
        const registro = {
            id: crypto.randomUUID(),
            titulo: nomeValido(titulo),
            dados,
            updatedAt: new Date().toISOString(),
        };
        fichas.set(registro.id, registro);
        enfileirar('ficha:' + registro.id, () => banco.gravarFicha(registro));
        return registro;
    }

    function salvar(id, dados) {
        const anterior = obter(id);
        if (!anterior) throw new Error('Ficha local não encontrada.');
        const atualizado = { ...anterior, dados, updatedAt: new Date().toISOString() };
        fichas.set(id, atualizado);
        enfileirar('ficha:' + id, () => banco.gravarFicha(atualizado));
        return atualizado;
    }

    function renomear(id, titulo) {
        const anterior = obter(id);
        if (!anterior) throw new Error('Ficha local não encontrada.');
        const atualizado = { ...anterior, titulo: nomeValido(titulo), updatedAt: new Date().toISOString() };
        fichas.set(id, atualizado);
        enfileirar('ficha:' + id, () => banco.gravarFicha(atualizado));
        return atualizado;
    }

    function excluir(id) {
        fichas.delete(id);
        enfileirar('ficha:' + id, () => banco.excluirFicha(id));
        if (armazenamento.getItem(CHAVE_ATIVA) === id)
            armazenamento.removeItem(CHAVE_ATIVA);
    }

    function lerRascunho(uid, id) {
        return rascunhos.get(chaveRascunho(uid, id)) || null;
    }

    function gravarRascunho(uid, id, dados, revisaoBase) {
        // A revisão de origem permite identificar rascunhos desatualizados após
        // reiniciar o navegador, sem substituir a versão recente da nuvem.
        const rascunho = { chave: chaveRascunho(uid, id), dados, revisaoBase, token: crypto.randomUUID() };
        rascunhos.set(rascunho.chave, rascunho);
        enfileirar(rascunho.chave, () => banco.gravarRascunho(rascunho));
        return rascunho;
    }

    function apagarRascunho(uid, id) {
        const chave = chaveRascunho(uid, id);
        rascunhos.delete(chave);
        enfileirar(chave, () => banco.excluirRascunho(chave));
    }

    /** Remove cópias antigas somente após cada gravação confirmada no IndexedDB. */
    async function migrarAntiga(normalizarFicha) {
        banco = await abrirBanco();
        for (const registro of await banco.listarFichas()) fichas.set(registro.id, registro);
        for (const rascunho of await banco.listarRascunhos()) rascunhos.set(rascunho.chave, rascunho);

        await migrarArmazenamentoAntigo({ armazenamento, banco, fichas, rascunhos, normalizarFicha });
    }

    return {
        listar: () => [...fichas.values()]
            .map(({ id, titulo, updatedAt }) => ({ id, titulo, updatedAt }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        obter, criar, salvar, renomear, excluir, flush, migrarAntiga,
        lerRascunho, gravarRascunho, apagarRascunho,
        ativa: () => armazenamento.getItem(CHAVE_ATIVA),
        selecionar: (id) => armazenamento.setItem(CHAVE_ATIVA, id),
    };
}
