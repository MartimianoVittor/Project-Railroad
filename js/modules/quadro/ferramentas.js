export function criarFerramentas({ canvas, zonaDrop, botoes, elementos, limparQuadro, salvarDadosFicha }) {
    let modoAtual;

    function selecionarFerramenta(modo) {
        elementos.selecionarItem(null);
        modoAtual = modo;
        for (const [nome, botao] of Object.entries(botoes)) {
            botao?.classList.toggle('ativo', nome === modo);
            botao?.setAttribute('aria-pressed', String(nome === modo));
        }
        zonaDrop.classList.toggle('modo-mover-ativo', modo === 'mover');
        canvas.style.cursor = modo === 'mover' ? 'default' : modo === 'texto' ? 'text' : 'crosshair';
    }

    for (const [modo, botao] of Object.entries(botoes)) {
        botao?.addEventListener('click', () => selecionarFerramenta(modo));
    }
    document.getElementById('btn-limpar')?.addEventListener('click', () => {
        if (!confirm('Tem certeza de que deseja limpar todo o quadro tático?')) return;
        limparQuadro();
        salvarDadosFicha();
    });

    document.addEventListener('keydown', (evento) => {
        if (modoAtual !== 'mover' || !['Delete', 'Backspace'].includes(evento.key)) return;
        if (evento.target.matches('input, textarea, select, [contenteditable="true"]')) return;
        if (zonaDrop.closest('[hidden], [inert]')) return;
        const item = elementos.obterSelecionado();
        if (!item) return;
        evento.preventDefault();
        item.remove();
        elementos.selecionarItem(null);
        salvarDadosFicha();
    });

    selecionarFerramenta('lapis');
    return { selecionarFerramenta, obterModo: () => modoAtual };
}
