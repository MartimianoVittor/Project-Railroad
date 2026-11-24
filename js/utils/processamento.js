const pendentes = new Map();
const aguardar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const podeAnimar = () => typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
let janela;
let observador;
let aviso;

function manterJanelaNaFrente(registros) {
    const outroDialogoAbriu = registros.some(({ target }) =>
        target !== janela && target.tagName === 'DIALOG' && target.open);
    if (outroDialogoAbriu && janela.open) {
        janela.close();
        janela.showModal();
    }
}

function mostrarJanela(operacao) {
    if (!operacao) {
        observador?.disconnect();
        if (janela?.open) janela.close();
        return;
    }
    if (!janela) {
        const dialogo = document.createElement('dialog');
        if (typeof dialogo.showModal !== 'function') return;
        dialogo.className = 'rr-processamento';
        dialogo.setAttribute('aria-label', 'Operação em andamento');
        dialogo.innerHTML = '<div class="rr-roda" aria-hidden="true"></div><p role="status" aria-live="polite"></p><small>Aguarde a conclusão da operação.</small>';
        dialogo.addEventListener('cancel', (evento) => evento.preventDefault());
        document.body.append(dialogo);
        janela = dialogo;
    }
    janela.querySelector('p').textContent = operacao.texto;
    if (!janela.open) janela.showModal();
    if (typeof MutationObserver !== 'undefined') {
        observador ??= new MutationObserver(manterJanelaNaFrente);
        observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    }
}

function mostrarAviso(operacao) {
    if (!podeAnimar()) return;
    if (!operacao) {
        if (aviso) aviso.hidden = true;
        return;
    }
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.className = 'rr-aviso-processamento';
        aviso.setAttribute('role', 'status');
        aviso.innerHTML = '<span class="rr-roda" aria-hidden="true"></span><span data-mensagem></span>';
        document.body.append(aviso);
    }
    aviso.querySelector('[data-mensagem]').textContent = operacao.texto;
    aviso.hidden = false;
}

function renderizar() {
    if (typeof document === 'undefined' || !document.body?.append || !document.createElement) return;
    const operacoes = [...pendentes.values()];
    const modal = operacoes.findLast((operacao) => operacao.bloquear);
    const fundo = operacoes.findLast((operacao) => !operacao.bloquear);
    mostrarJanela(modal);
    mostrarAviso(modal ? null : fundo);
    document.querySelectorAll('.status-salvamento').forEach((elemento) =>
        elemento.classList.toggle('rr-sincronizando', Boolean(fundo)));
}

export function iniciarProcessamento(texto, { bloquear = true } = {}) {
    const token = Symbol();
    pendentes.set(token, { texto, bloquear });
    renderizar();
    return () => {
        if (pendentes.delete(token)) renderizar();
    };
}

export async function comProcessamento(texto, acao, opcoes) {
    const concluir = iniciarProcessamento(texto, opcoes);
    const inicio = Date.now();
    const animar = opcoes?.bloquear !== false && podeAnimar() && document.visibilityState !== 'hidden';
    try {
        if (animar) {
            // Deixa o navegador pintar o diálogo antes da operação.
            await Promise.race([
                new Promise((resolver) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolver))),
                aguardar(100),
            ]);
        }
        return await acao();
    } finally {
        const restante = 350 - (Date.now() - inicio);
        if (animar && document.visibilityState !== 'hidden' && restante > 0) await aguardar(restante);
        concluir();
    }
}
