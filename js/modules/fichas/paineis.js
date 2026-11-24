import { porId } from '../../utils/dom.js?v=1.4.19';
import { comProcessamento } from '../../utils/processamento.js?v=1.4.19';

const AVISOS_ACAO = {
    Abrir: 'Carregando ficha…', Duplicar: 'Duplicando ficha…', Renomear: 'Renomeando ficha…',
    'Excluir na nuvem': 'Excluindo ficha…', 'Excluir local': 'Excluindo ficha local…',
};

export function criarPaineisFicha(estado) {
    let operacaoEmAndamento = false;
    let ultimoUsuario;
    const painelOnline = porId('painel-fichas');
    const painelConta = porId('painel-conta');
    const painelLocal = porId('painel-locais');

    function mensagem(id, texto, erro = false) {
        const elemento = porId(id);
        if (!elemento) {
            console.warn(`Railroad: área de mensagem ausente (#${id}).`);
            return;
        }
        elemento.textContent = texto;
        elemento.dataset.erro = String(erro);
    }

    function estadoSalvamento(texto) {
        for (const id of ['status-salvamento', 'status-salvamento-mobile']) {
            const elemento = porId(id);
            if (elemento) elemento.textContent = texto;
        }
    }

    function atualizarInterface() {
        porId('conta-visitante').hidden = Boolean(estado.usuario);
        porId('conta-autenticada').hidden = !estado.usuario;
        porId('fichas-visitante').hidden = Boolean(estado.usuario);
        porId('fichas-autenticadas').hidden = !estado.usuario;
        porId('importar-json-online-container').hidden = !estado.usuario;
        porId('email-conta').textContent = estado.usuario?.email || '';
        if (ultimoUsuario !== (estado.usuario?.id ?? null) && typeof document.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
            ultimoUsuario = estado.usuario?.id ?? null;
            document.dispatchEvent(new CustomEvent('railroad:auth', { detail: { autenticado: Boolean(estado.usuario), usuarioId: estado.usuario?.id ?? null } }));
        }

        const identificacao = estado.modoEdicao === 'local'
            ? `Local: ${estado.fichaLocal?.titulo || 'sem ficha'}`
            : `Online: ${estado.fichaNuvem?.titulo || 'sem ficha'}`;
        for (const id of ['ficha-atual', 'ficha-atual-mobile'])
            porId(id).textContent = identificacao;

        const area = porId('area-fichas');
        if (area) area.inert = estado.preparando || (estado.modoEdicao === 'nuvem' && !estado.fichaNuvem);
    }
    function fecharPaineis() {
        if (painelOnline.open) painelOnline.close();
        if (painelLocal.open) painelLocal.close();
        if (painelConta.open) painelConta.close();
    }
    async function executar(painel, acao, texto = 'Processando…') {
        if (operacaoEmAndamento) return;
        operacaoEmAndamento = true;
        painel.setAttribute('aria-busy', 'true');
        try {
            await comProcessamento(texto, acao);
        } catch (erro) {
            console.error('Railroad: erro na operação de fichas.', erro);
            mensagem(painel === painelConta ? 'mensagem-conta'
                : painel === painelOnline ? 'mensagem-fichas' : 'mensagem-locais',
                `Operação não concluída: ${erro.message}`, true);
        } finally {
            operacaoEmAndamento = false;
            painel.removeAttribute('aria-busy');
        }
    }

    function criarBotao(texto, acao, painel, desabilitado = false, estilo = 'bege') {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = `rr-botao-${estilo}`;
        botao.textContent = texto;
        botao.disabled = desabilitado;
        botao.addEventListener('click', () => void executar(painel, acao, AVISOS_ACAO[texto] || 'Processando ficha…'));
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
        for (const [rotulo, acao, desabilitado, estilo] of acoes)
            botoes.append(criarBotao(rotulo, acao, painel, desabilitado, estilo));
        linha.append(informacoes, botoes);
        return linha;
    }

    return { painelConta, painelOnline, painelLocal, atualizarInterface, estadoSalvamento, mensagem, executar, fecharPaineis, desenharLinha };
}
