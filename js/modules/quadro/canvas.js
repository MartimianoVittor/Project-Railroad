/** O bitmap do quadro possui dimensões próprias; a viewport nunca o reamostra. */
export function criarCanvas({ canvas, ctx, zonaDrop }) {
    let versaoImagem = 0;
    let fonteOriginal = null;
    let desenhoAlterado = false;
    let dimensoesDefinidas = false;

    function ajustarTamanhoCanvas() {
        // O tamanho CSS acompanha a janela; o bitmap só é dimensionado ao criar
        // um quadro vazio. Alterações de orientação não modificam os pixels.
        if (dimensoesDefinidas || zonaDrop.clientWidth < 2 || zonaDrop.clientHeight < 2) return;
        canvas.width = Math.round(zonaDrop.clientWidth);
        canvas.height = Math.round(zonaDrop.clientHeight);
        dimensoesDefinidas = true;
    }

    function carregarImagemNoCanvas(dataURL) {
        const requisicao = ++versaoImagem;
        fonteOriginal = typeof dataURL === 'string' && dataURL ? dataURL : null;
        desenhoAlterado = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!fonteOriginal) return;
        const imagem = new Image();
        imagem.crossOrigin = 'anonymous';
        imagem.onload = () => {
            if (requisicao !== versaoImagem) return;
            // Preserva a resolução e a proporção reais do desenho salvo.
            canvas.width = imagem.naturalWidth || imagem.width || canvas.width;
            canvas.height = imagem.naturalHeight || imagem.height || canvas.height;
            dimensoesDefinidas = true;
            ctx.drawImage(imagem, 0, 0);
        };
        imagem.onerror = () => {
            if (requisicao === versaoImagem) console.warn('Não foi possível restaurar o desenho.');
        };
        imagem.src = fonteOriginal;
    }

    function obterImagem() {
        return desenhoAlterado ? canvas.toDataURL('image/png') : (fonteOriginal || '');
    }
    function registrarAlteracao() {
        desenhoAlterado = true;
        fonteOriginal = null;
    }
    return { ajustarTamanhoCanvas, carregarImagemNoCanvas, obterImagem, registrarAlteracao };
}
