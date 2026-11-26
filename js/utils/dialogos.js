/** Diálogos assíncronos da interface Railroad. Substituem alert/confirm/prompt nativos.
 * Promessas preservam cancelamentos; a fila impede mensagens sobrepostas.
 */
const fila = [];
let atual = null;
let janela = null;
let retornoFoco = null;

function preparar() {
    if (janela) return janela;
    janela = document.createElement('dialog');
    janela.id = 'rr-dialogo-sistema';
    janela.className = 'rr-dialogo-sistema__janela painel-fichas rr-moldura-alvo rr-leitura-automatica';
    janela.setAttribute('aria-labelledby', 'rr-dialogo-titulo');
    janela.setAttribute('aria-describedby', 'rr-dialogo-mensagem');
    janela.innerHTML = `
        <div class="rr-dialogo-sistema__conteudo">
            <p class="rr-dialogo-sistema__marca" aria-hidden="true">★ RAILROAD ★</p>
            <h2 id="rr-dialogo-titulo" class="rr-dialogo-sistema__titulo"></h2>
            <p id="rr-dialogo-mensagem" class="rr-dialogo-sistema__mensagem"></p>
            <label class="rr-dialogo-sistema__campo" for="rr-dialogo-entrada">Resposta
                <input id="rr-dialogo-entrada" type="text" autocomplete="off" maxlength="2000">
            </label>
            <div class="rr-dialogo-sistema__acoes">
                <button type="button" class="rr-dialogo-sistema__cancelar">Cancelar</button>
                <button type="button" class="rr-dialogo-sistema__aceitar">OK</button>
            </div>
        </div>`;
    janela.querySelector('.rr-dialogo-sistema__aceitar').addEventListener('click', () => concluir(true));
    janela.querySelector('.rr-dialogo-sistema__cancelar').addEventListener('click', () => concluir(false));
    janela.querySelector('#rr-dialogo-entrada').addEventListener('keydown', evento => {
        if (evento.key === 'Enter' && !evento.isComposing) {
            evento.preventDefault();
            concluir(true);
        }
    });
    janela.addEventListener('cancel', evento => { evento.preventDefault(); concluir(false); });
    janela.addEventListener('close', () => { if (atual && !janela.open) concluir(false); });
    document.body.append(janela);
    personalizarJanelas(temaAtual);
    return janela;
}

function concluir(aceito) {
    if (!atual) return;
    const pedido = atual;
    atual = null;
    const resposta = pedido.tipo === 'confirmar' ? aceito
        : pedido.tipo === 'solicitar' ? (aceito ? janela.querySelector('#rr-dialogo-entrada').value : null)
        : undefined;
    if (janela.open) janela.close();
    document.dispatchEvent?.(new Event('rr:dialogo-sistema-fechado'));
    pedido.resolver(resposta);
    if (retornoFoco?.isConnected && !retornoFoco.closest('[inert]')) retornoFoco.focus?.({ preventScroll: true });
    retornoFoco = null;
    queueMicrotask(mostrarProximo);
}

function mostrarProximo() {
    if (atual || !fila.length) return;
    const dialogo = preparar();
    atual = fila.shift();
    retornoFoco = document.activeElement;
    dialogo.querySelector('#rr-dialogo-titulo').textContent = ({
        informar: 'Aviso', confirmar: 'Confirmação', solicitar: 'Preencha o campo',
    })[atual.tipo];
    dialogo.querySelector('#rr-dialogo-mensagem').textContent = atual.mensagem;
    const ehEntrada = atual.tipo === 'solicitar';
    const campo = dialogo.querySelector('.rr-dialogo-sistema__campo');
    const entrada = dialogo.querySelector('#rr-dialogo-entrada');
    campo.hidden = !ehEntrada;
    entrada.disabled = !ehEntrada;
    entrada.value = ehEntrada ? atual.valor : '';
    const cancelar = dialogo.querySelector('.rr-dialogo-sistema__cancelar');
    cancelar.hidden = atual.tipo === 'informar';
    const aceitar = dialogo.querySelector('.rr-dialogo-sistema__aceitar');
    aceitar.textContent = atual.tipo === 'confirmar' ? 'Confirmar' : 'OK';
    dialogo.dataset.tipo = atual.tipo;
    document.dispatchEvent?.(new Event('rr:dialogo-sistema-aberto'));
    dialogo.showModal();
    if (ehEntrada) entrada.select();
    else (atual.tipo === 'confirmar' ? cancelar : aceitar).focus();
}

function solicitarResposta(tipo, mensagem, valor = '') {
    // Navegadores sem <dialog> modal: manter as ações operacionais.
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
        const texto = String(mensagem ?? '');
        if (tipo === 'confirmar') return Promise.resolve(globalThis.confirm?.(texto) ?? false);
        if (tipo === 'solicitar') return Promise.resolve(globalThis.prompt?.(texto, String(valor ?? '')) ?? null);
        globalThis.alert?.(texto);
        return Promise.resolve();
    }
    return new Promise(resolver => {
        fila.push({ tipo, mensagem: String(mensagem ?? ''), valor: String(valor ?? ''), resolver });
        mostrarProximo();
    });
}

export const informar = mensagem => solicitarResposta('informar', mensagem);
export const confirmar = mensagem => solicitarResposta('confirmar', mensagem);
export const solicitar = (mensagem, valor = '') => solicitarResposta('solicitar', mensagem, valor);

// A aparência ativa (inclusive a sincronizada com a conta) acompanha a janela.
import { recuperarPreferencias, PADRAO } from '../modules/aparencia/preferencias.js?v=1.4.26';
import { personalizarJanelas } from '../modules/aparencia/visual.js?v=1.4.26';
let temaAtual = (() => {
    try { return recuperarPreferencias(window.localStorage); }
    catch { return PADRAO; }
})();
if (typeof document !== 'undefined') document.addEventListener('railroad:aparencia-atualizada', evento => {
    temaAtual = evento.detail;
    if (janela) personalizarJanelas(temaAtual);
});
