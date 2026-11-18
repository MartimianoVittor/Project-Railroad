export function criarCanvas({ canvas, ctx, zonaDrop, agendarSalvamento }) {
    let primeiraMedicao = true;
    let versaoImagem = 0;
    let imagemPendente = null;
    let imagemPronta = null;

    function aplicarImagemCarregada() {
        if (!imagemPronta || zonaDrop.clientWidth < 2 || zonaDrop.clientHeight < 2) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imagemPronta, 0, 0, canvas.width, canvas.height);
        imagemPronta = null;
        imagemPendente = null;
    }
    function ajustarTamanhoCanvas() {
        const larguraAnterior = canvas.width;
        const alturaAnterior = canvas.height;
        // Não reduza a imagem a 1px quando a aba Quadro estiver oculta.
        if (zonaDrop.clientWidth < 2 || zonaDrop.clientHeight < 2) return;
        const novaLargura = Math.round(zonaDrop.clientWidth);
        const novaAltura = Math.round(zonaDrop.clientHeight);
        if (novaLargura === larguraAnterior &&
            novaAltura === alturaAnterior) {
            aplicarImagemCarregada();
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
        aplicarImagemCarregada();
        if (primeiraMedicao)
            primeiraMedicao = false;
        else
            agendarSalvamento();
    }
    function carregarImagemNoCanvas(dataURL) {
        // Ao trocar de personagem, ignora carregamentos atrasados da ficha anterior.
        const requisicao = ++versaoImagem;
        imagemPendente = typeof dataURL === 'string' && dataURL ? dataURL : null;
        imagemPronta = null;
        if (!imagemPendente)
            return;
        const imagem = new Image();
        imagem.onload = () => {
            if (requisicao !== versaoImagem)
                return;
            imagemPronta = imagem;
            aplicarImagemCarregada();
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
