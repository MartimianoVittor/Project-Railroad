export function criarCanvas({ canvas, ctx, zonaDrop, agendarSalvamento }) {
    let primeiraMedicao = true;
    let versaoImagem = 0;
    let imagemPendente = null;
    function ajustarTamanhoCanvas() {
        const larguraAnterior = canvas.width;
        const alturaAnterior = canvas.height;
        const novaLargura = Math.max(1, Math.round(zonaDrop.clientWidth));
        const novaAltura = Math.max(1, Math.round(zonaDrop.clientHeight));
        if (novaLargura === larguraAnterior &&
            novaAltura === alturaAnterior) {
            return;
        }
        const copia = document.createElement('canvas');
        copia.width = larguraAnterior;
        copia.height = alturaAnterior;
        const contextoCopia = copia.getContext('2d');
        contextoCopia.drawImage(canvas, 0, 0);
        canvas.width = novaLargura;
        canvas.height = novaAltura;
        ctx.drawImage(copia, 0, 0, novaLargura, novaAltura);
        if (primeiraMedicao)
            primeiraMedicao = false;
        else
            agendarSalvamento();
    }
    function carregarImagemNoCanvas(dataURL) {
        // Ao trocar de personagem, ignora carregamentos atrasados da ficha anterior.
        const requisicao = ++versaoImagem;
        imagemPendente = typeof dataURL === 'string' && dataURL ? dataURL : null;
        if (!imagemPendente)
            return;
        const imagem = new Image();
        imagem.onload = () => {
            if (requisicao !== versaoImagem)
                return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
            imagemPendente = null;
        };
        imagem.onerror = () => {
            if (requisicao === versaoImagem)
                console.warn('Não foi possível restaurar o desenho.');
        };
        imagem.src = dataURL;
    }
    function obterImagem() {
        // Evita sobrescrever o desenho salvo antes de a imagem terminar de carregar.
        return imagemPendente || canvas.toDataURL('image/png');
    }
    return { ajustarTamanhoCanvas, carregarImagemNoCanvas, obterImagem };
}
