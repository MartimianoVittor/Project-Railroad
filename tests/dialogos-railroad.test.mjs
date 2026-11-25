import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function criarDOM() {
    const eventosDocumento = new Map();
    const campos = new Map();
    const classe = () => {
        const marcadas = new Set();
        return {
            add: (...nomes) => nomes.forEach(nome => marcadas.add(nome)),
            remove: (...nomes) => nomes.forEach(nome => marcadas.delete(nome)),
            contains: nome => marcadas.has(nome),
            [Symbol.iterator]: () => marcadas.values(),
        };
    };
    function criarCampo() {
        return { hidden: false, disabled: false, value: '', textContent: '',
            eventos: new Map(), addEventListener(evento, fn) { this.eventos.set(evento, fn); },
            foco: false, focus() { this.foco = true; }, select() { this.foco = true; },
            disparar(evento, detalhes = {}) { this.eventos.get(evento)?.(detalhes); },
        };
    }
    const anterior = {
        document: globalThis.document,
        HTMLDialogElement: globalThis.HTMLDialogElement,
        window: globalThis.window,
    };
    let dialogo;
    globalThis.HTMLDialogElement = class { showModal() {} };
    globalThis.document = {
        activeElement: { isConnected: false },
        body: { append(elemento) { dialogo = elemento; } },
        createElement(tipo) {
            assert.equal(tipo, 'dialog');
            const callbacks = new Map();
            const dlg = {
                id: '', open: false, className: '', dataset: {}, classList: classe(),
                setAttribute() {}, addEventListener(nome, acao) { callbacks.set(nome, acao); },
                querySelector(seletor) {
                    if (!campos.has(seletor)) campos.set(seletor, criarCampo());
                    return campos.get(seletor);
                },
                showModal() { this.open = true; },
                close() { this.open = false; callbacks.get('close')?.(); },
                disparar(nome, evento) { callbacks.get(nome)?.(evento); },
            };
            return dlg;
        },
        addEventListener(nome, acao) { eventosDocumento.set(nome, acao); },
        querySelectorAll() { return dialogo ? [dialogo] : []; },
        emitir(nome, detail) { eventosDocumento.get(nome)?.({ detail }); },
    };
    globalThis.window = { localStorage: { getItem: () => null } };
    return { obterDialogo: () => dialogo, campos, documento: globalThis.document,
        restaurar() {
            for (const [nome, valor] of Object.entries(anterior)) {
                if (valor === undefined) delete globalThis[nome];
                else globalThis[nome] = valor;
            }
        },
    };
}

test('confirmações não executam ações no cancelamento; avisos e prompts usam fila', async (t) => {
    const dom = criarDOM();
    t.after(dom.restaurar);
    const { confirmar, solicitar, informar } = await import('../js/utils/dialogos.js');
    const c = seletor => dom.campos.get(seletor);
    dom.documento.emitir('railroad:aparencia-atualizada', {fundoCartao: 'couro', borda: 'filete'});

    const confirmacao = confirmar('Excluir esta campanha?');
    const entrada = solicitar('Novo nome', 'Nome antigo');
    assert.equal(dom.obterDialogo().open, true);
    assert.equal(dom.obterDialogo().classList.contains('rr-fundo--couro'), true);
    assert.equal(dom.obterDialogo().classList.contains('rr-borda--filete'), true);
    assert.equal(c('#rr-dialogo-mensagem').textContent, 'Excluir esta campanha?');
    assert.equal(c('.rr-dialogo-sistema__cancelar').foco, true);
    c('.rr-dialogo-sistema__cancelar').disparar('click');
    assert.equal(await confirmacao, false);
    await Promise.resolve();
    assert.equal(dom.obterDialogo().dataset.tipo, 'solicitar');
    // O close da janela anterior pode chegar depois da abertura da próxima.
    dom.obterDialogo().disparar('close');
    assert.equal(dom.obterDialogo().open, true);
    assert.equal(c('#rr-dialogo-entrada').value, 'Nome antigo');
    c('#rr-dialogo-entrada').value = 'Nome escolhido';
    c('.rr-dialogo-sistema__aceitar').disparar('click');
    assert.equal(await entrada, 'Nome escolhido');

    const aviso = informar('Arquivo incompatível.');
    assert.equal(dom.obterDialogo().dataset.tipo, 'informar');
    assert.equal(c('.rr-dialogo-sistema__cancelar').hidden, true);
    c('.rr-dialogo-sistema__aceitar').disparar('click');
    await aviso;
    const cancelada = solicitar('Outra resposta');
    dom.obterDialogo().disparar('cancel', { preventDefault() {} });
    assert.equal(await cancelada, null);
});

test('diálogos respeitam as regras visuais da Personalização', async () => {
    const css = readFileSync(new URL('../css/dialogos-railroad.css', import.meta.url), 'utf8');
    assert.match(css, /rr-dialogo-sistema__titulo/);
    assert.match(css, /font:.*Rye/);
    assert.match(css, /--rr-leitura-texto/);
    assert.match(css, /--rr-leitura-borda/);
});
