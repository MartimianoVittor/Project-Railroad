export function iniciarDesenho({canvas,ctx,zonaDrop,obterModo,obterPosicaoNoQuadro,criarElementoTexto,seletorCor,agendarSalvamento}) {
 let desenhando=false;
 const modoAtualProxy=()=>obterModo();
canvas.addEventListener('pointerdown', evento => {

        if (evento.button !== 0) return;

        if (modoAtualProxy() === 'mover') {

            selecionarItem(null);

            return;
        }

        const { x, y } = obterPosicaoNoQuadro(evento);

        if (modoAtualProxy() === 'texto') {

            const texto = prompt(
                'Digite o texto para inserir no quadro:'
            );

            if (texto && texto.trim()) {

                criarElementoTexto(
                    texto.trim(),
                    `${x}px`,
                    `${y}px`,
                    seletorCor ? seletorCor.value : '#000000'
                );
            }

            return;
        }

        desenhando = true;

        canvas.setPointerCapture(evento.pointerId);

        ctx.beginPath();

        ctx.moveTo(x, y);
    });

    canvas.addEventListener('pointermove', evento => {

        if (!desenhando) return;

        const { x, y } = obterPosicaoNoQuadro(evento);

        ctx.lineWidth = modoAtualProxy() === 'borracha' ? 20 : 3;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.strokeStyle = modoAtualProxy() === 'borracha'
            ? '#fcf8f2'
            : (seletorCor ? seletorCor.value : '#000000');

        ctx.lineTo(x, y);

        ctx.stroke();
    });

    function finalizarDesenho() {

        if (!desenhando) return;

        desenhando = false;

        ctx.closePath();

        agendarSalvamento();
    }

    canvas.addEventListener('pointerup', finalizarDesenho);
    canvas.addEventListener('pointercancel', finalizarDesenho);
    canvas.addEventListener('lostpointercapture', finalizarDesenho);
}
