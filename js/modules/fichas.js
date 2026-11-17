import { supabaseConfigurado } from '../config/supabase.js';
import { obterSupabase } from '../services/supabaseClient.js';
import { criarRepositorioFichas } from '../services/fichasRepository.js';
import { criarRepositorioLocal } from '../services/fichasLocais.js';
import { identidadeDaImportacao } from '../services/identidadeImportacao.js';

const ESPERA_LOCAL_MS = 250;
const ESPERA_NUVEM_MS = 1200;
const PREFIXO_ULTIMA = 'railroad_ultima_ficha';

const tituloValido = (valor) => String(valor || '').trim().slice(0, 120) || 'Novo personagem';
const tituloDoPersonagem = (dados) => tituloValido(dados.personagem?.['nome-personagem'] || 'Ficha importada');

/**
 * O modo de edição é independente do login: uma pessoa conectada pode editar
 * fichas locais sem que seus dados sejam enviados para a nuvem.
 */
export function criarGerenciadorFichas({
    coletarFicha, carregarFicha, normalizarFicha, baixarFicha, interpretarArquivo,
    conectar = obterSupabase, configurado = supabaseConfigurado,
    repositorioLocal = criarRepositorioLocal(),
}) {
    const porId = (id) => document.getElementById(id);
    const painelOnline = porId('painel-fichas');
    const painelLocal = porId('painel-locais');
    const fichaVazia = () => normalizarFicha({ versao: 3 });
    const chaveUltima = (uid) => `${PREFIXO_ULTIMA}:${uid}`;

    let cliente = null;
    let repositorioNuvem = null;
    let usuario = null;
    let modoEdicao = 'local';
    let fichaNuvem = null;
    let fichaLocal = null;
    let timerLocal = null;
    let timerNuvem = null;
    let alteracaoPendente = false;
    let filaEnvios = Promise.resolve();
    let operacaoEmAndamento = false;

    function mensagem(id, texto, erro = false) {
        const elemento = porId(id);
        elemento.textContent = texto;
        elemento.dataset.erro = String(erro);
    }

    function estadoSalvamento(texto) {
        for (const id of ['status-salvamento', 'status-salvamento-mobile'])
            porId(id).textContent = texto;
    }

    function atualizarInterface() {
        porId('conta-visitante').hidden = Boolean(usuario);
        porId('conta-autenticada').hidden = !usuario;
        porId('entrar-google').disabled = !configurado();
        porId('email-conta').textContent = usuario?.email || '';

        const identificacao = modoEdicao === 'local'
            ? `Local: ${fichaLocal?.titulo || 'sem ficha'}`
            : `Online: ${fichaNuvem?.titulo || 'sem ficha'}`;
        for (const id of ['ficha-atual', 'ficha-atual-mobile'])
            porId(id).textContent = identificacao;

        const bloqueado = modoEdicao === 'nuvem' && !fichaNuvem;
        document.querySelectorAll('#jogador, #personagem, #inventario, #quadro-mobile')
            .forEach((secao) => { secao.inert = bloqueado; });
    }

    function fecharPaineis() {
        if (painelOnline.open) painelOnline.close();
        if (painelLocal.open) painelLocal.close();
    }

    function abrirOnline() {
        fecharPaineis();
        painelOnline.showModal();
        if (usuario)
            void atualizarListaOnline();
        else
            mensagem('mensagem-conta', configurado()
                ? 'Entre com Google para acessar suas fichas privadas.'
                : 'Configure o Supabase para usar o gerenciamento online.');
    }

    function abrirLocais() {
        fecharPaineis();
        desenharListaLocal();
        mensagem('mensagem-locais', 'Estas fichas existem somente neste navegador.');
        painelLocal.showModal();
    }

    function garantirLocal() {
        const id = repositorioLocal.ativa();
        fichaLocal = (id && repositorioLocal.obter(id))
            || repositorioLocal.listar().map((ficha) => repositorioLocal.obter(ficha.id)).find(Boolean)
            || repositorioLocal.criar('Ficha local', fichaVazia());
        repositorioLocal.selecionar(fichaLocal.id);
    }

    function restaurarLocal() {
        garantirLocal();
        modoEdicao = 'local';
        fichaNuvem = null;
        carregarFicha(normalizarFicha(fichaLocal.dados));
        atualizarInterface();
        estadoSalvamento('Ficha salva neste navegador');
    }

    function lerRascunho(uid, id) {
        return repositorioLocal.lerRascunho(uid, id);
    }

    async function salvarAgora() {
        clearTimeout(timerLocal);
        alteracaoPendente = false;

        try {
            const dados = coletarFicha();
            if (modoEdicao === 'local') {
                fichaLocal = repositorioLocal.salvar(fichaLocal.id, dados);
                await repositorioLocal.flush();
                estadoSalvamento('Ficha salva neste navegador');
            } else if (usuario && fichaNuvem) {
                repositorioLocal.gravarRascunho(usuario.id, fichaNuvem.id, dados);
                await repositorioLocal.flush();
                estadoSalvamento('Alterações locais; sincronizando…');
                clearTimeout(timerNuvem);
                timerNuvem = setTimeout(() => { void sincronizar(); }, ESPERA_NUVEM_MS);
            } else {
                return false;
            }
            return true;
        } catch (erro) {
            console.error('Não foi possível salvar a ficha no navegador.', erro);
            alteracaoPendente = true;
            estadoSalvamento('Falha no salvamento local; faça um backup JSON');
            return false;
        }
    }

    function agendarSalvamento() {
        alteracaoPendente = true;
        clearTimeout(timerLocal);
        timerLocal = setTimeout(() => { void salvarAgora(); }, ESPERA_LOCAL_MS);
    }

    async function sincronizar() {
        clearTimeout(timerNuvem);
        if (modoEdicao !== 'nuvem' || !usuario || !fichaNuvem)
            return true;

        const uid = usuario.id;
        const id = fichaNuvem.id;
        try {
            await repositorioLocal.flush();
            const rascunho = lerRascunho(uid, id);
            if (!rascunho) return true;

            const envio = filaEnvios.then(() => repositorioNuvem.salvar(id, rascunho.dados));
            filaEnvios = envio.catch(() => {});
            await envio;
            if (lerRascunho(uid, id)?.token === rascunho.token) {
                repositorioLocal.apagarRascunho(uid, id);
                await repositorioLocal.flush();
            }
            if (usuario?.id === uid && fichaNuvem?.id === id) {
                if (lerRascunho(uid, id)) {
                    estadoSalvamento('Novas alterações pendentes…');
                    clearTimeout(timerNuvem);
                    timerNuvem = setTimeout(() => { void sincronizar(); }, ESPERA_NUVEM_MS);
                } else {
                    estadoSalvamento('Ficha salva na nuvem');
                }
            }
            return true;
        } catch (erro) {
            console.warn('Falha ao sincronizar; rascunho preservado.', erro);
            estadoSalvamento('Sem conexão: rascunho guardado neste navegador');
            return false;
        }
    }

    async function concluirSalvamento() {
        clearTimeout(timerLocal);
        clearTimeout(timerNuvem);
        if (alteracaoPendente && !(await salvarAgora()))
            return false;
        try {
            await repositorioLocal.flush();
        } catch (erro) {
            console.error('Falha ao persistir as alterações locais.', erro);
            estadoSalvamento('Falha no salvamento local; faça um backup JSON');
            return false;
        }
        return sincronizar();
    }

    async function executar(painel, acao) {
        if (operacaoEmAndamento) return;
        operacaoEmAndamento = true;
        painel.setAttribute('aria-busy', 'true');
        try {
            await acao();
        } catch (erro) {
            console.error('Railroad: erro na operação de fichas.', erro);
            mensagem(painel === painelOnline ? 'mensagem-conta' : 'mensagem-locais',
                `Operação não concluída: ${erro.message}`, true);
        } finally {
            operacaoEmAndamento = false;
            painel.removeAttribute('aria-busy');
        }
    }

    function criarBotao(texto, acao, painel, desabilitado = false) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = texto;
        botao.disabled = desabilitado;
        botao.addEventListener('click', () => { void executar(painel, acao); });
        return botao;
    }

    function desenharLinha(ficha, painel, acoes, ativa) {
        const linha = document.createElement('li');
        linha.className = `linha-ficha${ativa ? ' ativa' : ''}`;
        const informacoes = document.createElement('div');
        informacoes.className = 'informacoes-ficha';
        const titulo = document.createElement('strong');
        titulo.textContent = ficha.titulo;
        const data = document.createElement('small');
        const atualizadaEm = ficha.updated_at || ficha.updatedAt;
        data.textContent = atualizadaEm
            ? `Atualizada em ${new Date(atualizadaEm).toLocaleString('pt-BR')}` : '';
        informacoes.append(titulo, data);
        const botoes = document.createElement('div');
        botoes.className = 'acoes-linha-ficha';
        for (const [rotulo, acao, desabilitado] of acoes)
            botoes.append(criarBotao(rotulo, acao, painel, desabilitado));
        linha.append(informacoes, botoes);
        return linha;
    }

    function desenharListaLocal() {
        const lista = porId('lista-fichas-locais');
        lista.replaceChildren();
        for (const ficha of repositorioLocal.listar()) {
            const ativa = modoEdicao === 'local' && ficha.id === fichaLocal?.id;
            lista.append(desenharLinha(ficha, painelLocal, [
                [ativa ? 'Aberta' : 'Abrir', () => abrirFichaLocal(ficha.id), ativa],
                ['Renomear', () => renomearLocal(ficha)],
                ['Duplicar', () => duplicarLocal(ficha)],
                ['Excluir local', () => excluirLocal(ficha)],
            ], ativa));
        }
    }

    async function abrirFichaLocal(id) {
        if (!(await concluirSalvamento()))
            return mensagem('mensagem-locais', 'Não foi possível guardar a ficha atual.', true);
        const registro = repositorioLocal.obter(id);
        if (!registro) throw new Error('Ficha local não encontrada.');
        fichaLocal = registro;
        repositorioLocal.selecionar(registro.id);
        modoEdicao = 'local';
        fichaNuvem = null;
        carregarFicha(normalizarFicha(registro.dados));
        atualizarInterface();
        estadoSalvamento('Ficha salva neste navegador');
        fecharPaineis();
    }

    async function criarFichaLocal(titulo, dados = null) {
        if (!(await concluirSalvamento()))
            throw new Error('Salve sua ficha atual antes de criar outra.');
        const nova = dados || normalizarFicha({
            versao: 3, personagem: { 'nome-personagem': titulo },
        });
        const registro = repositorioLocal.criar(tituloValido(titulo), nova);
        await repositorioLocal.flush();
        await abrirFichaLocal(registro.id);
    }

    async function renomearLocal(ficha) {
        const titulo = prompt('Novo nome da ficha local:', ficha.titulo);
        if (titulo === null) return;
        if (!titulo.trim()) throw new Error('O nome não pode ficar vazio.');
        repositorioLocal.renomear(ficha.id, titulo);
        await repositorioLocal.flush();
        if (fichaLocal?.id === ficha.id)
            fichaLocal.titulo = tituloValido(titulo);
        atualizarInterface();
        desenharListaLocal();
    }

    async function duplicarLocal(ficha) {
        const registro = repositorioLocal.obter(ficha.id);
        await criarFichaLocal(`${ficha.titulo} (cópia)`, normalizarFicha(registro.dados));
    }

    async function excluirLocal(ficha) {
        if (!confirm(`Remover "${ficha.titulo}" deste navegador? A nuvem não será alterada.`))
            return;
        if (modoEdicao === 'local' && fichaLocal?.id === ficha.id) {
            clearTimeout(timerLocal);
            alteracaoPendente = false;
        }
        repositorioLocal.excluir(ficha.id);
        if (fichaLocal?.id === ficha.id) {
            garantirLocal();
            if (modoEdicao === 'local')
                carregarFicha(normalizarFicha(fichaLocal.dados));
        }
        await repositorioLocal.flush();
        atualizarInterface();
        desenharListaLocal();
        mensagem('mensagem-locais', 'Ficha excluída apenas deste navegador.');
    }

    function desenharListaOnline(fichas) {
        const lista = porId('lista-fichas');
        lista.replaceChildren();
        if (!fichas.length) {
            const item = document.createElement('li');
            item.textContent = 'Nenhuma ficha online ainda. Crie ou importe uma acima.';
            lista.append(item);
        }
        for (const ficha of fichas) {
            const ativa = modoEdicao === 'nuvem' && ficha.id === fichaNuvem?.id;
            lista.append(desenharLinha(ficha, painelOnline, [
                [ativa ? 'Aberta' : 'Abrir', () => abrirFichaOnline(ficha.id), ativa],
                ['Renomear', () => renomearOnline(ficha)],
                ['Duplicar', () => duplicarOnline(ficha)],
                ['Excluir na nuvem', () => excluirOnline(ficha)],
            ], ativa));
        }
    }

    async function atualizarListaOnline() {
        if (!usuario || !repositorioNuvem) return;
        const uid = usuario.id;
        mensagem('mensagem-conta', 'Consultando fichas…');
        try {
            const fichas = await repositorioNuvem.listar();
            if (usuario?.id !== uid) return;
            desenharListaOnline(fichas);
            mensagem('mensagem-conta', `${fichas.length} ficha(s) online na sua conta.`);
        } catch (erro) {
            mensagem('mensagem-conta', `Falha ao listar fichas: ${erro.message}`, true);
        }
    }

    async function abrirFichaOnline(id) {
        if (!(await concluirSalvamento()))
            throw new Error('Não foi possível salvar a ficha atual; tente novamente.');
        const registro = await repositorioNuvem.obter(id);
        const rascunho = lerRascunho(usuario.id, id);
        fichaNuvem = { id: registro.id, titulo: registro.titulo };
        modoEdicao = 'nuvem';
        carregarFicha(normalizarFicha(rascunho?.dados || registro.dados));
        localStorage.setItem(chaveUltima(usuario.id), id);
        atualizarInterface();
        estadoSalvamento(rascunho ? 'Rascunho local aguardando sincronização' : 'Ficha salva na nuvem');
        if (rascunho) {
            clearTimeout(timerNuvem);
            timerNuvem = setTimeout(() => { void sincronizar(); }, ESPERA_NUVEM_MS);
        }
        fecharPaineis();
    }

    async function criarOnline(titulo, dados = null) {
        if (!(await concluirSalvamento()))
            throw new Error('Salve a ficha atual antes de continuar.');
        const nova = dados || normalizarFicha({
            versao: 3, personagem: { 'nome-personagem': titulo },
        });
        const registro = await repositorioNuvem.criar(usuario.id, tituloValido(titulo), nova);
        await abrirFichaOnline(registro.id);
    }

    async function renomearOnline(ficha) {
        const titulo = prompt('Novo nome da ficha online:', ficha.titulo);
        if (titulo === null) return;
        if (!titulo.trim()) throw new Error('O nome não pode ficar vazio.');
        await repositorioNuvem.renomear(ficha.id, tituloValido(titulo));
        if (fichaNuvem?.id === ficha.id) {
            fichaNuvem.titulo = tituloValido(titulo);
            atualizarInterface();
        }
        await atualizarListaOnline();
    }

    async function duplicarOnline(ficha) {
        if (!(await concluirSalvamento()))
            throw new Error('Não foi possível salvar a ficha atual.');
        const registro = await repositorioNuvem.obter(ficha.id);
        const rascunho = lerRascunho(usuario.id, ficha.id);
        await criarOnline(`${ficha.titulo} (cópia)`, normalizarFicha(rascunho?.dados || registro.dados));
    }

    async function excluirOnline(ficha) {
        if (!confirm(`Excluir "${ficha.titulo}" PERMANENTEMENTE do banco de dados?`))
            return;
        if (fichaNuvem?.id === ficha.id) {
            clearTimeout(timerLocal);
            clearTimeout(timerNuvem);
            alteracaoPendente = false;
        }
        await filaEnvios;
        await repositorioNuvem.excluir(ficha.id);
        repositorioLocal.apagarRascunho(usuario.id, ficha.id);
        await repositorioLocal.flush();
        if (fichaNuvem?.id === ficha.id) {
            localStorage.removeItem(chaveUltima(usuario.id));
            restaurarLocal();
        }
        await atualizarListaOnline();
    }

    async function importarArquivoLocal(arquivo) {
        const dados = interpretarArquivo(await arquivo.text());
        await criarFichaLocal(tituloDoPersonagem(dados), dados);
        estadoSalvamento('JSON importado para este navegador');
    }

    async function importarArquivoOnline(arquivo) {
        if (!usuario)
            throw new Error('Entre com Google antes de importar para a nuvem.');
        const dados = interpretarArquivo(await arquivo.text());
        const identidade = await identidadeDaImportacao(dados);
        const resultado = await repositorioNuvem.criarImportada(
            usuario.id, tituloDoPersonagem(dados), dados, identidade
        );
        if (resultado.duplicada) {
            await atualizarListaOnline();
            mensagem('mensagem-conta',
                `A ficha "${resultado.registro.titulo}" já foi importada para esta conta. Nenhuma duplicata foi criada.`);
            return;
        }
        await abrirFichaOnline(resultado.registro.id);
    }

    /** O botão externo NUNCA faz DELETE no Supabase. */
    async function apagarLocalAtual() {
        if (modoEdicao === 'nuvem') {
            if (!confirm('Descartar apenas o rascunho deste navegador? A ficha salva no banco permanecerá intacta.'))
                return;
            clearTimeout(timerLocal);
            clearTimeout(timerNuvem);
            alteracaoPendente = false;
            repositorioLocal.apagarRascunho(usuario.id, fichaNuvem.id);
            await repositorioLocal.flush();
            restaurarLocal();
            await repositorioLocal.flush();
            estadoSalvamento('Rascunho local removido; dados online preservados');
        } else {
            if (!confirm('Apagar esta ficha somente do navegador? O banco de dados não será alterado.'))
                return;
            const id = fichaLocal.id;
            clearTimeout(timerLocal);
            alteracaoPendente = false;
            repositorioLocal.excluir(id);
            // Retorna a uma ficha local em branco, preservando as demais.
            fichaLocal = repositorioLocal.criar('Ficha local', fichaVazia());
            repositorioLocal.selecionar(fichaLocal.id);
            await repositorioLocal.flush();
            carregarFicha(normalizarFicha(fichaLocal.dados));
            atualizarInterface();
            estadoSalvamento('Ficha removida apenas deste navegador');
        }
    }

    function modoVisitante() {
        clearTimeout(timerLocal);
        clearTimeout(timerNuvem);
        alteracaoPendente = false;
        usuario = null;
        restaurarLocal();
    }

    async function modoAutenticado(conta) {
        if (alteracaoPendente && !(await salvarAgora())) return;
        usuario = conta;
        // Limpa da tela a ficha de outra conta antes de carregar a nova.
        restaurarLocal();
        const ultima = localStorage.getItem(chaveUltima(conta.id));
        if (ultima) {
            try {
                await abrirFichaOnline(ultima);
                return;
            } catch (erro) {
                console.warn('Última ficha não disponível:', erro);
                localStorage.removeItem(chaveUltima(conta.id));
            }
        }
        restaurarLocal();
        abrirOnline();
    }

    async function entrarGoogle() {
        if (!cliente) throw new Error('O Supabase ainda não está configurado.');
        const { error } = await cliente.auth.signInWithOAuth({
            provider: 'google', options: { redirectTo: `${location.origin}${location.pathname}` },
        });
        if (error) throw error;
    }

    async function sairGoogle() {
        if (!(await concluirSalvamento()) && !confirm(
            'Há um rascunho sem sincronizar. Ele continuará neste navegador. Deseja sair?'
        )) return;
        const { error } = await cliente.auth.signOut();
        if (error) throw error;
        modoVisitante();
        fecharPaineis();
    }

    function registrarEventos() {
        porId('btn-minhas-fichas').addEventListener('click', abrirOnline);
        porId('btn-fichas-locais').addEventListener('click', abrirLocais);
        porId('btn-apagar-ficha').addEventListener('click', () => { void apagarLocalAtual(); });
        porId('fechar-painel-fichas').addEventListener('click', fecharPaineis);
        porId('fechar-painel-locais').addEventListener('click', fecharPaineis);
        porId('entrar-google').addEventListener('click', () => { void executar(painelOnline, entrarGoogle); });
        porId('sair-google').addEventListener('click', () => { void executar(painelOnline, sairGoogle); });

        porId('form-criar-ficha').addEventListener('submit', (evento) => {
            evento.preventDefault();
            void executar(painelOnline, async () => {
                await criarOnline(porId('nome-nova-ficha').value);
                porId('nome-nova-ficha').value = '';
            });
        });
        porId('form-criar-local').addEventListener('submit', (evento) => {
            evento.preventDefault();
            void executar(painelLocal, async () => {
                await criarFichaLocal(porId('nome-nova-local').value);
                porId('nome-nova-local').value = '';
            });
        });

        porId('exportar-json').addEventListener('click', () => {
            const dados = normalizarFicha(coletarFicha());
            const id = modoEdicao === 'local' ? fichaLocal?.id : fichaNuvem?.id;
            // ID estável reconhece a mesma ficha mesmo depois de edições futuras.
            baixarFicha({ ...dados, railroadId: id });
        });
        for (const [botao, input, painel, importar] of [
            ['importar-json-local', 'input-importar-local', painelLocal, importarArquivoLocal],
            ['importar-ficha-local', 'input-importar-online', painelOnline, importarArquivoOnline],
        ]) {
            porId(botao).addEventListener('click', () => porId(input).click());
            porId(input).addEventListener('change', (evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = '';
                if (arquivo) void executar(painel, () => importar(arquivo));
            });
        }

        const salvarAoSair = () => {
            if (alteracaoPendente) void salvarAgora();
        };
        window.addEventListener('pagehide', salvarAoSair);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') salvarAoSair();
        });
    }

    async function iniciar() {
        registrarEventos();
        try {
            await repositorioLocal.migrarAntiga(normalizarFicha);
            restaurarLocal();
            await repositorioLocal.flush();
        } catch (erro) {
            console.error('Falha ao preparar as fichas locais.', erro);
            estadoSalvamento('Falha no armazenamento local; exporte suas fichas JSON');
            return;
        }
        if (!configurado()) return;

        try {
            cliente = await conectar();
            repositorioNuvem = criarRepositorioFichas(cliente);
            cliente.auth.onAuthStateChange((evento, sessao) => {
                if (evento === 'SIGNED_OUT' && usuario)
                    queueMicrotask(() => { modoVisitante(); fecharPaineis(); });
                else if (evento === 'SIGNED_IN' && usuario && sessao?.user?.id !== usuario.id)
                    queueMicrotask(() => { void modoAutenticado(sessao.user); });
            });
            const { data: sessao, error: erroSessao } = await cliente.auth.getSession();
            if (erroSessao) throw erroSessao;
            if (!sessao.session) return;
            const { data, error } = await cliente.auth.getUser();
            if (error) throw error;
            if (data.user) await modoAutenticado(data.user);
        } catch (erro) {
            console.warn('Supabase indisponível; a ficha local continuará funcionando.', erro);
            estadoSalvamento('Nuvem indisponível; você pode continuar no modo local');
        }
    }

    return { iniciar, agendarSalvamento, salvarAgora, apagarLocalAtual };
}
