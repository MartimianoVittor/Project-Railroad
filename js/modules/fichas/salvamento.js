import { normalizarReferencias, obterImagensStorage } from '../../services/imagensStorage.js?v=1.4.26';
import { comProcessamento } from '../../utils/processamento.js?v=1.4.26';

const ESPERA_LOCAL_MS = 250;
const ESPERA_NUVEM_MS = 1200;

export function criarSalvamento({ estado, coletarFicha, repositorioLocal, informar }) {
    let timerLocal;
    let timerNuvem;
    let versaoEdicao = 0;
    let pendente = false;
    let filaEnvios = Promise.resolve();
    let timerRetentativa;
    let tentativas = 0;
    const conflitos = new Set();

    function contextoAtual() {
        return {
            modo: estado.modoEdicao, uid: estado.usuario?.id, conta: estado.geracaoConta,
            id: estado.modoEdicao === 'local' ? estado.fichaLocal?.id : estado.fichaNuvem?.id,
        };
    }

    function aindaAberta(contexto) {
        const atual = contextoAtual();
        return atual.id === contexto.id && atual.modo === contexto.modo && atual.conta === contexto.conta;
    }

    function programarEnvio() {
        const contexto = contextoAtual();
        clearTimeout(timerNuvem);
        clearTimeout(timerRetentativa);
        timerNuvem = setTimeout(() => { if (aindaAberta(contexto)) void sincronizar(contexto); }, ESPERA_NUVEM_MS);
    }

    function salvarAgora() {
        clearTimeout(timerLocal);
        const contexto = contextoAtual();
        if (!contexto.id) return Promise.resolve(false);
        const versao = versaoEdicao;
        pendente = false;
        return comProcessamento('Salvando ficha…', async () => {
            try {
                const dados = contexto.modo === 'nuvem'
                    ? normalizarReferencias(coletarFicha()) : coletarFicha();
                if (contexto.modo === 'local') estado.fichaLocal = repositorioLocal.salvar(contexto.id, dados);
                else repositorioLocal.gravarRascunho(contexto.uid, contexto.id, dados, estado.fichaNuvem?.revisao);
                await repositorioLocal.flush();
                if (aindaAberta(contexto) && versao === versaoEdicao) {
                    if (contexto.modo === 'local') informar('Ficha salva neste navegador');
                    else if (conflitos.has(identificador(contexto))) {
                        informar('Conflito: edição preservada neste navegador. Exporte o JSON para recuperar.');
                    } else {
                        informar('Alterações locais; sincronizando…');
                        programarEnvio();
                    }
                }
                return true;
            } catch (erro) {
                console.error('Não foi possível salvar a ficha no navegador.', erro);
                if (aindaAberta(contexto)) {
                    pendente = true;
                    informar('Falha no salvamento local; faça um backup JSON');
                }
                return false;
            }
        }, { bloquear: false });
    }

    function agendarSalvamento() {
        versaoEdicao++;
        pendente = true;
        clearTimeout(timerLocal);
        timerLocal = setTimeout(() => void salvarAgora(), ESPERA_LOCAL_MS);
    }

    function identificador(contexto) { return `${contexto.uid}:${contexto.id}`; }

    function programarRetentativa(contexto) {
        if (!aindaAberta(contexto) || conflitos.has(identificador(contexto)) || tentativas >= 4) return;
        clearTimeout(timerRetentativa);
        const espera = Math.min(60000, 5000 * (2 ** tentativas++));
        timerRetentativa = setTimeout(() => {
            if (aindaAberta(contexto)) void sincronizar(contexto);
        }, espera);
        // Evita manter um processo Node aberto por causa do temporizador de teste.
        timerRetentativa?.unref?.();
    }

    function bloquearConflito() {
        const contexto = contextoAtual();
        if (contexto.modo !== 'nuvem' || !contexto.uid || !contexto.id) return;
        conflitos.add(identificador(contexto));
        clearTimeout(timerNuvem);
        clearTimeout(timerRetentativa);
    }

    function tentarSincronizar() {
        const contexto = contextoAtual();
        if (contexto.modo !== 'nuvem' || !contexto.uid || !contexto.id
            || conflitos.has(identificador(contexto))) return;
        tentativas = 0;
        clearTimeout(timerRetentativa);
        void sincronizar(contexto);
    }

    async function enviar(contexto) {
        if (!aindaAberta(contexto)) return true;
        if (conflitos.has(identificador(contexto))) return false;
        try {
            await repositorioLocal.flush();
            if (!aindaAberta(contexto)) return true;
            const { uid, id } = contexto;
            const rascunho = repositorioLocal.lerRascunho(uid, id);
            if (!rascunho) return true;

            const resultado = await comProcessamento('Salvando ficha…',
                async () => {
                    const preparado = typeof estado.conectar === 'function'
                        ? await obterImagensStorage(await estado.conectar()).prepararDocumento(rascunho.dados, `fichas/${id}`)
                        : rascunho.dados; // Compatibilidade com repositórios injetados em testes.
                    return estado.repositorioNuvem.salvar(id, preparado, estado.fichaNuvem?.revisao);
                },
                { bloquear: false });
            // Somente remove o rascunho depois de confirmar a nova revisão.
            if (!Number.isSafeInteger(resultado?.revisao) ||
                resultado.revisao <= estado.fichaNuvem?.revisao)
                throw new Error('O Supabase não confirmou uma revisão nova; rascunho preservado.');
            if (aindaAberta(contexto)) {
                estado.fichaNuvem.revisao = resultado.revisao;
                estado.fichaNuvem.updated_at = resultado.updated_at;
            }
            tentativas = 0;
            clearTimeout(timerRetentativa);
            // A limpeza é best-effort e não pode bloquear o salvamento confirmado.
            if (typeof estado.conectar === 'function') {
                void estado.conectar().then((cliente) =>
                    obterImagensStorage(cliente).limparImagensObsoletasDaFicha(id)
                ).catch((erro) => console.warn('Limpeza de imagens adiada:', erro));
            }
            // Uma edição feita durante a requisição já possui outro token.
            if (repositorioLocal.lerRascunho(uid, id)?.token === rascunho.token) {
                repositorioLocal.apagarRascunho(uid, id);
                await repositorioLocal.flush();
            }
            if (aindaAberta(contexto)) {
                if (pendente || repositorioLocal.lerRascunho(uid, id)) {
                    informar('Novas alterações pendentes…');
                    programarEnvio();
                } else informar('Ficha salva na nuvem');
            }
            return true;
        } catch (erro) {
            console.warn('Falha ao sincronizar; rascunho preservado.', erro);
            if (erro?.code === 'FICHA_EM_CONFLITO') {
                conflitos.add(identificador(contexto));
                if (aindaAberta(contexto)) informar('Conflito com outra edição! Rascunho local preservado. Exporte o JSON antes de reabrir.');
            } else if (['22023', '42501', 'PGRST202'].includes(erro?.code)) {
                if (aindaAberta(contexto))
                    informar(`Falha no salvamento: ${erro.message}. Rascunho local preservado; exporte o JSON.`);
            } else {
                if (aindaAberta(contexto)) informar('Sem conexão ou erro temporário: rascunho guardado neste navegador');
                programarRetentativa(contexto);
            }
            return false;
        }
    }

    function sincronizar(contexto) {
        clearTimeout(timerNuvem);
        if (contexto.modo !== 'nuvem' || !contexto.uid || !contexto.id) return Promise.resolve(true);
        // Consulta o token dentro da fila para evitar enviar duas vezes o mesmo rascunho.
        const envio = filaEnvios.then(() => enviar(contexto));
        filaEnvios = envio.catch(() => false);
        return envio;
    }

    async function concluir() {
        const contexto = contextoAtual();
        clearTimeout(timerLocal);
        clearTimeout(timerNuvem);
        do {
            const versao = versaoEdicao;
            if (pendente && !(await salvarAgora())) return false;
            try { await repositorioLocal.flush(); }
            catch (erro) {
                if (aindaAberta(contexto)) informar('Falha no salvamento local; faça um backup JSON');
                return false;
            }
            if (!aindaAberta(contexto)) return false;
            const sincronizou = await sincronizar(contexto);
            if (!sincronizou || !aindaAberta(contexto)) return false;
            if (versao === versaoEdicao) return true;
        } while (aindaAberta(contexto));
        return false;
    }

    function descartarAgendado() {
        clearTimeout(timerLocal);
        clearTimeout(timerNuvem);
        clearTimeout(timerRetentativa);
        tentativas = 0;
        versaoEdicao++;
        pendente = false;
    }

    return { agendarSalvamento, salvarAgora, concluir, programarEnvio, tentarSincronizar, descartarAgendado,
        bloquearConflito, pendente: () => pendente, aguardarEnvios: () => filaEnvios };
}
