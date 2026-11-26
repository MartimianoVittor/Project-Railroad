import { solicitar } from '../../utils/dialogos.js?v=1.4.26';
export function iniciarDesenho({
    canvas, ctx, obterModo, obterPosicaoNoQuadro, criarElementoTexto, selecionarItem, seletorCor, agendarSalvamento,
}) {
    let ponteiroAtivo = null;

    let tracou = false;
    canvas.addEventListener('pointerdown', async (evento) => {
        if (evento.button !== 0 || ponteiroAtivo !== null) return;
        const modo = obterModo();
        if (modo === 'mover') {
            selecionarItem(null);
            return;
        }
        const { x, y } = obterPosicaoNoQuadro(evento);
        if (modo === 'texto') {
            const texto = (await solicitar('Digite o texto para inserir no quadro:'))?.trim();
            if (texto) criarElementoTexto(texto, x + 'px', y + 'px', seletorCor?.value || '#000000');
            return;
        }
        ponteiroAtivo = evento.pointerId;
        tracou = false;
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
        tracou = true;
        ctx.restore();
        ctx.beginPath();
        ctx.moveTo(x, y);
    });

    function finalizar(evento) {
        if (evento.pointerId !== ponteiroAtivo) return;
        ponteiroAtivo = null;
        ctx.closePath();
        if (tracou) agendarSalvamento();
        tracou = false;
    }

    canvas.addEventListener('pointerup', finalizar);
    canvas.addEventListener('pointercancel', finalizar);
    canvas.addEventListener('lostpointercapture', finalizar);
    return () => { ponteiroAtivo = null; };
}
