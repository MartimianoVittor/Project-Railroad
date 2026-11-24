/** Banco para fichas e rascunhos grandes; usa transações confirmadas. */
const NOME_BANCO = 'railroad_fichas';
const VERSAO_BANCO = 1;

export function abrirBancoLocal() {
    return new Promise((resolver, rejeitar) => {
        if (!globalThis.indexedDB) {
            rejeitar(new Error('Este navegador não oferece IndexedDB. Use um navegador atualizado.'));
            return;
        }

        let bloqueado = false;
        const pedido = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
        pedido.onupgradeneeded = () => {
            const banco = pedido.result;
            if (!banco.objectStoreNames.contains('fichas'))
                banco.createObjectStore('fichas', { keyPath: 'id' });
            if (!banco.objectStoreNames.contains('rascunhos'))
                banco.createObjectStore('rascunhos', { keyPath: 'chave' });
        };
        pedido.onsuccess = () => {
            const banco = pedido.result;
            if (bloqueado) return banco.close();
            banco.onversionchange = () => banco.close();
            resolver(criarAcesso(banco));
        };
        pedido.onerror = () => rejeitar(pedido.error);
        pedido.onblocked = () => {
            bloqueado = true;
            rejeitar(new Error('O banco local está bloqueado por outra aba. Feche outras abas do Railroad e recarregue.'));
        };
    });
}

function criarAcesso(banco) {
    function executar(colecao, operacao, valor) {
        return new Promise((resolver, rejeitar) => {
            const transacao = banco.transaction(colecao, operacao === 'getAll' ? 'readonly' : 'readwrite');
            const tabela = transacao.objectStore(colecao);
            const pedido = operacao === 'getAll' ? tabela.getAll() : tabela[operacao](valor);
            let resultado;
            pedido.onsuccess = () => { resultado = pedido.result; };
            transacao.oncomplete = () => resolver(resultado);
            transacao.onerror = () => rejeitar(transacao.error || pedido.error);
            transacao.onabort = () => rejeitar(transacao.error || new Error('Gravação local interrompida.'));
        });
    }

    return {
        listarFichas: () => executar('fichas', 'getAll'),
        gravarFicha: (ficha) => executar('fichas', 'put', ficha),
        excluirFicha: (id) => executar('fichas', 'delete', id),
        listarRascunhos: () => executar('rascunhos', 'getAll'),
        gravarRascunho: (rascunho) => executar('rascunhos', 'put', rascunho),
        excluirRascunho: (chave) => executar('rascunhos', 'delete', chave),
    };
}
