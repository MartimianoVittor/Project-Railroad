export function criarFerramentas({canvas,ctx,zonaDrop,agendarSalvamento,btnLapis,btnBorracha,btnTexto,btnMover,btnLimpar,elementos,salvarDadosFicha}) {
 let modoAtual='lapis';
 const {selecionarItem,limparElementosDoQuadro,obterSelecionado}=elementos;
function selecionarFerramenta(modo, botaoAtivo) {

        selecionarItem(null);

        modoAtual = modo;

        zonaDrop.closest('#jogador')?.querySelectorAll('.btn-oeste').forEach(botao => {
            botao.classList.remove('ativo');
        });

        if (botaoAtivo) {
            botaoAtivo.classList.add('ativo');
        }

        if (modo === 'mover') {

            zonaDrop.classList.add('modo-mover-ativo');

            canvas.style.cursor = 'default';

        } else {

            zonaDrop.classList.remove('modo-mover-ativo');

            canvas.style.cursor =
                modo === 'texto' ? 'text' : 'crosshair';
        }
    }

    if (btnLapis) {
        btnLapis.addEventListener('click', () => {
            selecionarFerramenta('lapis', btnLapis);
        });
    }

    if (btnBorracha) {
        btnBorracha.addEventListener('click', () => {
            selecionarFerramenta('borracha', btnBorracha);
        });
    }

    if (btnTexto) {
        btnTexto.addEventListener('click', () => {
            selecionarFerramenta('texto', btnTexto);
        });
    }

    if (btnMover) {
        btnMover.addEventListener('click', () => {
            selecionarFerramenta('mover', btnMover);
        });
    }

    if (btnLimpar) {

        btnLimpar.addEventListener('click', () => {

            const confirmar = confirm(
                'Tem certeza de que deseja limpar todo o quadro tático?'
            );

            if (!confirmar) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            limparElementosDoQuadro();

            salvarDadosFicha();
        });
    }

    document.addEventListener('keydown', evento => {

        const campoEmEdicao = evento.target.matches(
            'input, textarea, select, [contenteditable="true"]'
        );

        if (campoEmEdicao) return;

        if (
            modoAtual === 'mover' &&
            obterSelecionado() &&
            (evento.key === 'Delete' || evento.key === 'Backspace')
        ) {

            obterSelecionado().remove();

            selecionarItem(null);

            salvarDadosFicha();
        }
    });
 return {selecionarFerramenta,obterModo:()=>modoAtual};
}
