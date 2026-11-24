export function iniciarDesenho({
    canvas, ctx, obterModo, obterPosicaoNoQuadro, criarElementoTexto, selecionarItem, seletorCor, agendarSalvamento,
}) {
    let ponteiroAtivo = null;

    canvas.addEventListener('pointerdown', (evento) => {
        if (evento.button !== 0 || ponteiroAtivo !== null) return;
        const modo = obterModo();
        if (modo === 'mover') {
            selecionarItem(null);
            return;
        }
        const { x, y } = obterPosicaoNoQuadro(evento);
        if (modo === 'texto') {
            const texto = prompt('Digite o texto para inserir no quadro:')?.trim();
            if (texto) criarElementoTexto(texto, x + 'px', y + 'px', seletorCor?.value || '#000000');
            return;
        }
        ponteiroAtivo = evento.pointerId;
        canvas.setPointerCapture(ponteiroAtivo);
        ctx.beginPath();
        ctx.moveTo(x, y);
    });

    canvas.addEventListener('pointermove', (evento) => {
        if (evento.pointerId !== ponteiroAtivo) return;
        const { x, y } = obterPosicaoNoQuadro(evento);
        const apagar = obterModo() === 'borracha';
        ctx.save();
        ctx.lineWidth = apagar ? 20 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = apagar ? 'destination-out' : 'source-over';
        ctx.strokeStyle = apagar ? '#000000' : (seletorCor?.value || '#000000');
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(x, y);
    });

    function finalizar(evento) {
        if (evento.pointerId !== ponteiroAtivo) return;
        ponteiroAtivo = null;
        ctx.closePath();
        agendarSalvamento();
    }

    canvas.addEventListener('pointerup', finalizar);
    canvas.addEventListener('pointercancel', finalizar);
    canvas.addEventListener('lostpointercapture', finalizar);
    return () => { ponteiroAtivo = null; };
}
