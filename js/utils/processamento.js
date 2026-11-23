/** Indicador compartilhado: cada operação possui seu próprio token de conclusão. */
const pendentes = new Map();
let janela;
let observador;
let aviso;
const navegador = () => typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';
const aguardar = ms => new Promise(resolve => setTimeout(resolve, ms));
function renderizar() {
    if (typeof document === 'undefined' || !document.body?.append || !document.createElement) return;
    const bloqueantes = [...pendentes.values()].filter(p => p.bloquear);
    const atual = bloqueantes.at(-1);
    if (!atual) {
        observador?.disconnect();
        if (janela?.open) janela.close();
    } else {
        if (!janela) {
            janela = document.createElement('dialog');
            if (typeof janela.showModal !== 'function') { janela = null; return; }
            janela.className = 'rr-processamento';
            janela.setAttribute('aria-label', 'Operação em andamento');
            janela.innerHTML = '<div class="rr-roda" aria-hidden="true"></div><p role="status" aria-live="polite"></p><small>Aguarde a conclusão da operação.</small>';
            janela.addEventListener('cancel', e => e.preventDefault());
            document.body.append(janela);
        }
        janela.querySelector('p').textContent = atual.texto;
        if (!janela.open) janela.showModal();
        // Um fluxo pode abrir outro diálogo enquanto aguarda o banco.
        if (typeof MutationObserver !== 'undefined') {
            observador ??= new MutationObserver(registros => {
                if (registros.some(r => r.target !== janela && r.target.tagName === 'DIALOG' && r.target.open) && janela.open) {
                    janela.close(); janela.showModal();
                }
            });
            observador.observe(document.body, {subtree:true, attributes:true, attributeFilter:['open']});
        }
    }
    const fundo = [...pendentes.values()].some(p => !p.bloquear);
    if (navegador()) {
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.className = 'rr-aviso-processamento';
            aviso.setAttribute('role', 'status');
            aviso.innerHTML = '<span class="rr-roda" aria-hidden="true"></span><span>Salvando ficha…</span>';
            document.body.append(aviso);
        }
        aviso.hidden = !fundo || Boolean(atual);
    }
    document.querySelectorAll?.('.status-salvamento').forEach(el => el.classList.toggle('rr-sincronizando', fundo));
}
export function iniciarProcessamento(texto, { bloquear = true } = {}) {
    const token = Symbol();
    pendentes.set(token, { texto, bloquear });
    renderizar();
    return () => { if (pendentes.delete(token)) renderizar(); };
}
export async function comProcessamento(texto, acao, opcoes) {
    const concluir = iniciarProcessamento(texto, opcoes);
    const inicio = Date.now();
    const manual = opcoes?.bloquear !== false;
    try {
        // Permite que o navegador pinte o diálogo antes do trabalho assíncrono.
        if (manual && navegador() && document.visibilityState !== 'hidden') {
            await Promise.race([
                new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))),
                aguardar(100),
            ]);
        }
        return await acao();
    } finally {
        if (manual && navegador() && document.visibilityState !== 'hidden') {
            const restante = 350 - (Date.now() - inicio);
            if (restante > 0) await aguardar(restante);
        }
        concluir();
    }
}
