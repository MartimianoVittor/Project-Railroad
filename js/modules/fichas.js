import { supabaseConfigurado } from '../config/supabase.js';
import { obterSupabase } from '../services/supabaseClient.js';
import { criarRepositorioFichas } from '../services/fichasRepository.js';

const TEMPO_RASCUNHO_MS = 250;
const TEMPO_NUVEM_MS = 1200;
const CHAVE_RASCUNHO = 'railroad_rascunho';
const CHAVE_ULTIMA_FICHA = 'railroad_ultima_ficha';

/** Mantém a sessão, a ficha selecionada e a sincronização fora dos módulos de jogo. */
export function criarGerenciadorFichas({
    coletarFicha, carregarFicha, normalizarFicha, lerLocal, gravarLocal, apagarLocal,
    conectar = obterSupabase, configurado = supabaseConfigurado,
}) {
    const porId = (id) => document.getElementById(id);
    const painel = porId('painel-fichas');
    let cliente = null;
    let repositorio = null;
    let usuario = null;
    let fichaAtiva = null;
    let timerRascunho = null;
    let timerNuvem = null;
    let alteracaoPendente = false;
    let filaEnvios = Promise.resolve();
    let operacaoEmAndamento = false;

    const fichaVazia = () => normalizarFicha({ versao: 3 });
    const chaveRascunho = (usuarioId, fichaId) => `${CHAVE_RASCUNHO}:${usuarioId}:${fichaId}`;
    const chaveUltima = (usuarioId) => `${CHAVE_ULTIMA_FICHA}:${usuarioId}`;
    const tituloValido = (titulo) => String(titulo ?? '').trim().slice(0, 120) || 'Novo personagem';
    const tituloDaFicha = (dados) => tituloValido(dados?.personagem?.['nome-personagem'] || 'Ficha importada');

    function informar(mensagem, erro = false) {
        const elemento = porId('mensagem-conta');
        if (elemento) {
            elemento.textContent = mensagem;
            elemento.dataset.erro = String(erro);
        }
    }

    function estadoSalvamento(mensagem) {
        for (const id of ['status-salvamento', 'status-salvamento-mobile']) {
            const elemento = porId(id);
            if (elemento)
                elemento.textContent = mensagem;
        }
    }

    function atualizarInterface() {
        porId('conta-visitante').hidden = Boolean(usuario);
        porId('conta-autenticada').hidden = !usuario;
        porId('entrar-google').disabled = !configurado();
        porId('email-conta').textContent = usuario?.email || 'Conta autenticada';

        const identificacao = usuario
            ? (fichaAtiva ? `Ficha: ${fichaAtiva.titulo}` : 'Nenhuma ficha selecionada')
            : 'Ficha local (sem login)';
        for (const id of ['ficha-atual', 'ficha-atual-mobile']) {
            const elemento = porId(id);
            if (elemento)
                elemento.textContent = identificacao;
        }
        porId('btn-conta-google').textContent = usuario ? 'Minha conta' : 'Entrar com Google';
        porId('conta-mobile').textContent = usuario ? 'Minha conta' : 'Entrar com Google';
        // Evita editar uma ficha sem identificador enquanto há uma sessão ativa.
        document.querySelectorAll('#jogador, #personagem, #inventario, #quadro-mobile')
            .forEach((secao) => { secao.inert = Boolean(usuario && !fichaAtiva); });
        let existeFichaLocal = false;
        try { existeFichaLocal = Boolean(lerLocal()); } catch { /* JSON local antigo inválido. */ }
        porId('importar-ficha-local').hidden = !usuario || !existeFichaLocal;
    }

    function abrirPainel() {
        if (!painel.open)
            painel.showModal();
        if (usuario)
            void atualizarLista();
        else if (!configurado())
            informar('Configure o Supabase para ativar o login. Sua ficha local continua funcionando.');
        else
            informar('Entre com Google para acessar suas fichas privadas.');
    }

    function fecharPainel() {
        if (painel.open)
            painel.close();
    }

    function lerRascunho(usuarioId, fichaId) {
        try {
            const texto = localStorage.getItem(chaveRascunho(usuarioId, fichaId));
            return texto ? JSON.parse(texto) : null;
        } catch (erro) {
            console.warn('Rascunho local inválido.', erro);
            return null;
        }
    }

    function agendarNuvem() {
        clearTimeout(timerNuvem);
        timerNuvem = setTimeout(() => { void sincronizar(); }, TEMPO_NUVEM_MS);
    }

    /** Grava um rascunho antes de tentar enviar para a nuvem. */
    function salvarAgora() {
        clearTimeout(timerRascunho);
        alteracaoPendente = false;
        if (usuario && !fichaAtiva)
            return false;
        try {
            const dados = coletarFicha();
            if (!usuario) {
                gravarLocal(dados);
                estadoSalvamento('Salva neste dispositivo');
            } else {
                const rascunho = { dados, token: crypto.randomUUID() };
                localStorage.setItem(chaveRascunho(usuario.id, fichaAtiva.id), JSON.stringify(rascunho));
                estadoSalvamento('Alterações locais; aguardando nuvem…');
                agendarNuvem();
            }
            return true;
        } catch (erro) {
            console.error('Erro ao salvar a ficha localmente.', erro);
            estadoSalvamento('Erro ao guardar alterações locais');
            return false;
        }
    }

    function agendarSalvamento() {
        if (usuario && !fichaAtiva)
            return;
        alteracaoPendente = true;
        clearTimeout(timerRascunho);
        timerRascunho = setTimeout(salvarAgora, TEMPO_RASCUNHO_MS);
    }

    /** Os envios são serializados para não sobrescrever um salvamento mais novo. */
    async function sincronizar() {
        clearTimeout(timerNuvem);
        if (!usuario || !fichaAtiva)
            return true;
        const usuarioId = usuario.id;
        const fichaId = fichaAtiva.id;
        const rascunho = lerRascunho(usuarioId, fichaId);
        if (!rascunho)
            return true;

        const envio = filaEnvios.then(() => repositorio.salvar(fichaId, rascunho.dados));
        filaEnvios = envio.catch(() => {});
        try {
            await envio;
            // Só remove o rascunho enviado; outro pode ter sido criado durante o envio.
            if (lerRascunho(usuarioId, fichaId)?.token === rascunho.token)
                localStorage.removeItem(chaveRascunho(usuarioId, fichaId));
            if (usuario?.id === usuarioId && fichaAtiva?.id === fichaId) {
                if (lerRascunho(usuarioId, fichaId)) {
                    estadoSalvamento('Novas alterações pendentes…');
                    agendarNuvem();
                } else {
                    estadoSalvamento('Salva na nuvem');
                }
            }
            return true;
        } catch (erro) {
            console.warn('Não foi possível sincronizar a ficha.', erro);
            if (usuario?.id === usuarioId && fichaAtiva?.id === fichaId)
                estadoSalvamento('Sem sincronização; rascunho mantido neste dispositivo');
            return false;
        }
    }

    async function concluirSalvamento() {
        clearTimeout(timerRascunho);
        clearTimeout(timerNuvem);
        if (alteracaoPendente && !salvarAgora())
            return false;
        return sincronizar();
    }

    async function executar(acao) {
        if (operacaoEmAndamento)
            return;
        operacaoEmAndamento = true;
        painel.setAttribute('aria-busy', 'true');
        try {
            await acao();
        } catch (erro) {
            console.error('Railroad: falha na operação de fichas.', erro);
            informar(`Não foi possível concluir: ${erro.message}`, true);
        } finally {
            operacaoEmAndamento = false;
            painel.removeAttribute('aria-busy');
        }
    }

    function botaoAcao(texto, acao, desabilitado = false) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = texto;
        botao.disabled = desabilitado;
        botao.addEventListener('click', () => { void executar(acao); });
        return botao;
    }

    function desenharLista(fichas) {
        const lista = porId('lista-fichas');
        lista.replaceChildren();
        if (!fichas.length) {
            const aviso = document.createElement('li');
            aviso.textContent = 'Nenhuma ficha na nuvem. Crie a primeira acima.';
            lista.append(aviso);
            return;
        }
        for (const ficha of fichas) {
            const linha = document.createElement('li');
            linha.className = `linha-ficha${ficha.id === fichaAtiva?.id ? ' ativa' : ''}`;
            const informacoes = document.createElement('div');
            informacoes.className = 'informacoes-ficha';
            const titulo = document.createElement('strong');
            titulo.textContent = ficha.titulo;
            const data = document.createElement('small');
            data.textContent = `Atualizada em ${new Date(ficha.updated_at).toLocaleString('pt-BR')}`;
            informacoes.append(titulo, data);
            const acoes = document.createElement('div');
            acoes.className = 'acoes-linha-ficha';
            acoes.append(
                botaoAcao(ficha.id === fichaAtiva?.id ? 'Aberta' : 'Abrir', () => selecionarFicha(ficha.id), ficha.id === fichaAtiva?.id),
                botaoAcao('Renomear', () => renomearFicha(ficha)),
                botaoAcao('Duplicar', () => duplicarFicha(ficha)),
                botaoAcao('Excluir', () => excluirFicha(ficha))
            );
            linha.append(informacoes, acoes);
            lista.append(linha);
        }
    }

    async function atualizarLista() {
        if (!usuario || !repositorio)
            return;
        const usuarioConsultado = usuario.id;
        informar('Consultando fichas…');
        try {
            const fichas = await repositorio.listar();
            if (usuario?.id !== usuarioConsultado)
                return;
            desenharLista(fichas);
            informar(`${fichas.length} ficha(s) na sua conta.`);
        } catch (erro) {
            informar(`Não foi possível listar as fichas: ${erro.message}`, true);
        }
    }

    async function selecionarFicha(id) {
        await concluirSalvamento(); // Se a rede falhar, o rascunho anterior permanece no dispositivo.
        const registro = await repositorio.obter(id);
        fichaAtiva = { id: registro.id, titulo: registro.titulo };
        const rascunho = lerRascunho(usuario.id, id);
        carregarFicha(normalizarFicha(rascunho?.dados || registro.dados));
        localStorage.setItem(chaveUltima(usuario.id), id);
        atualizarInterface();
        estadoSalvamento(rascunho ? 'Rascunho local pendente de sincronização' : 'Salva na nuvem');
        if (rascunho)
            agendarNuvem();
        fecharPainel();
    }

    async function criarFicha(titulo, dados = null) {
        await concluirSalvamento();
        const nova = dados || normalizarFicha({ versao: 3, personagem: { 'nome-personagem': titulo } });
        const registro = await repositorio.criar(usuario.id, tituloValido(titulo), nova);
        await selecionarFicha(registro.id);
    }

    async function renomearFicha(ficha) {
        const resposta = prompt('Novo nome desta ficha:', ficha.titulo);
        if (resposta === null)
            return;
        if (!resposta.trim()) {
            informar('O nome da ficha não pode ficar vazio.', true);
            return;
        }
        const titulo = tituloValido(resposta);
        await repositorio.renomear(ficha.id, titulo);
        if (fichaAtiva?.id === ficha.id) {
            fichaAtiva.titulo = titulo;
            atualizarInterface();
        }
        await atualizarLista();
    }

    async function duplicarFicha(ficha) {
        await concluirSalvamento();
        const registro = await repositorio.obter(ficha.id);
        const dados = lerRascunho(usuario.id, ficha.id)?.dados || registro.dados;
        await criarFicha(`${ficha.titulo} (cópia)`.slice(0, 120), normalizarFicha(dados));
    }

    async function excluirFicha(ficha) {
        if (!confirm(`Excluir definitivamente a ficha "${ficha.titulo}" da sua conta?`))
            return;
        // Aguarda envios anteriores; não inicia novos envios da ficha a excluir.
        if (fichaAtiva?.id === ficha.id) {
            clearTimeout(timerRascunho);
            clearTimeout(timerNuvem);
            alteracaoPendente = false;
        }
        await filaEnvios;
        await repositorio.excluir(ficha.id);
        localStorage.removeItem(chaveRascunho(usuario.id, ficha.id));
        if (fichaAtiva?.id === ficha.id) {
            fichaAtiva = null;
            localStorage.removeItem(chaveUltima(usuario.id));
            carregarFicha(fichaVazia());
            atualizarInterface();
            estadoSalvamento('Crie ou abra uma ficha para editar');
        }
        await atualizarLista();
    }

    async function importarFicha(dados) {
        const ficha = normalizarFicha(dados);
        if (!usuario) {
            carregarFicha(ficha);
            gravarLocal(ficha);
            estadoSalvamento('Ficha importada e salva neste dispositivo');
            return;
        }
        await criarFicha(tituloDaFicha(ficha), ficha);
    }

    async function apagarAtual() {
        if (!usuario) {
            if (!confirm('Apagar a ficha local deste dispositivo?'))
                return;
            clearTimeout(timerRascunho);
            alteracaoPendente = false;
            apagarLocal();
            carregarFicha(fichaVazia());
            estadoSalvamento('Ficha local apagada');
            return;
        }
        if (!fichaAtiva) {
            abrirPainel();
            return;
        }
        await executar(() => excluirFicha(fichaAtiva));
    }

    function modoVisitante() {
        clearTimeout(timerRascunho);
        clearTimeout(timerNuvem);
        alteracaoPendente = false;
        usuario = null;
        fichaAtiva = null;
        try {
            carregarFicha(normalizarFicha(lerLocal() || fichaVazia()));
        } catch (erro) {
            console.warn('Ficha local inválida.', erro);
            carregarFicha(fichaVazia());
        }
        atualizarInterface();
        estadoSalvamento('Modo local');
    }

    async function modoAutenticado(user) {
        usuario = user;
        fichaAtiva = null;
        carregarFicha(fichaVazia());
        atualizarInterface();
        estadoSalvamento('Selecione ou crie uma ficha');
        const ultima = localStorage.getItem(chaveUltima(user.id));
        if (ultima) {
            try {
                await selecionarFicha(ultima);
                return;
            } catch (erro) {
                console.warn('Última ficha indisponível.', erro);
                localStorage.removeItem(chaveUltima(user.id));
            }
        }
        abrirPainel();
    }

    async function entrarGoogle() {
        if (!cliente) {
            informar('Configure o Supabase antes de usar o Google.', true);
            return;
        }
        const { error } = await cliente.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${location.origin}${location.pathname}` },
        });
        if (error)
            throw error;
    }

    async function sairGoogle() {
        if (!(await concluirSalvamento())) {
            if (!confirm('Não foi possível sincronizar as últimas alterações. O rascunho ficou neste navegador. Sair mesmo assim?'))
                return;
        }
        const { error } = await cliente.auth.signOut();
        if (error)
            throw error;
        modoVisitante();
        fecharPainel();
    }

    function registrarEventos() {
        for (const id of ['btn-minhas-fichas', 'btn-conta-google'])
            porId(id)?.addEventListener('click', abrirPainel);
        porId('fechar-painel-fichas').addEventListener('click', fecharPainel);
        porId('entrar-google').addEventListener('click', () => { void executar(entrarGoogle); });
        porId('sair-google').addEventListener('click', () => { void executar(sairGoogle); });
        porId('form-criar-ficha').addEventListener('submit', (evento) => {
            evento.preventDefault();
            const campo = porId('nome-nova-ficha');
            void executar(async () => {
                await criarFicha(campo.value);
                campo.value = '';
            });
        });
        porId('importar-ficha-local').addEventListener('click', () => {
            void executar(async () => {
                const dados = lerLocal();
                if (!dados)
                    return;
                await criarFicha(tituloDaFicha(dados), normalizarFicha(dados));
            });
        });
        window.addEventListener('pagehide', () => {
            if (alteracaoPendente)
                salvarAgora(); // A rede não é garantida no fechamento; mantém o rascunho local.
        });
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && alteracaoPendente)
                salvarAgora();
        });
    }

    async function iniciar() {
        registrarEventos();
        if (!configurado()) {
            modoVisitante();
            return;
        }
        try {
            cliente = await conectar();
            repositorio = criarRepositorioFichas(cliente);
            cliente.auth.onAuthStateChange((evento, sessaoAtual) => {
                // Mudanças de conta em outra aba não podem deixar a ficha anterior visível.
                // Evita chamadas assíncronas do Supabase dentro do callback de autenticação.
                if (evento === 'SIGNED_OUT' && usuario)
                    queueMicrotask(() => {
                        if (alteracaoPendente) salvarAgora();
                        modoVisitante();
                        fecharPainel();
                    });
                else if (evento === 'SIGNED_IN' && usuario && sessaoAtual?.user?.id !== usuario.id)
                    queueMicrotask(() => {
                        if (alteracaoPendente) salvarAgora();
                        void modoAutenticado(sessaoAtual.user);
                    });
            });
            const { data: sessao, error: erroSessao } = await cliente.auth.getSession();
            if (erroSessao)
                throw erroSessao;
            if (!sessao.session) {
                modoVisitante();
                return;
            }
            const { data, error } = await cliente.auth.getUser();
            if (error)
                throw error;
            if (data.user)
                await modoAutenticado(data.user);
            else
                modoVisitante();
        } catch (erro) {
            console.warn('Supabase indisponível; modo local mantido.', erro);
            modoVisitante();
            estadoSalvamento('Nuvem indisponível; modo local');
        }
    }

    return { iniciar, agendarSalvamento, salvarAgora, importarFicha, apagarAtual };
}
