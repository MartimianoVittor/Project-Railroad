import { arquivoParaDataURL, mostrarErro } from '../../utils/arquivos.js?v=1.4.25';
export function iniciarImagens({ zonaDrop, uploadMapa, criarElementoImagem, obterPosicaoNoQuadro }) {
    let geracao = 0;
    async function inserirImagemMovel(arquivo, posX = 30, posY = 30) {
        if (!arquivo ||
            !arquivo.type ||
            !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(arquivo.type)
            || arquivo.size > 8 * 1024 * 1024) {
            alert('Escolha PNG, JPG, WebP ou GIF de até 8 MiB.');
            return;
        }
        const atual = geracao;
        try {
            const dataURL = await arquivoParaDataURL(arquivo);
            if (atual !== geracao) return;
            criarElementoImagem(dataURL, `${posX}px`, `${posY}px`);
        }
        catch (erro) {
            if (atual === geracao) mostrarErro('Não foi possível inserir a imagem.', erro);
        }
    }
    if (uploadMapa) {
        uploadMapa.addEventListener('change', evento => {
            const arquivo = evento.target.files[0];
            if (arquivo) {
                inserirImagemMovel(arquivo);
            }
            evento.target.value = '';
        });
    }
    zonaDrop.addEventListener('dragover', evento => {
        evento.preventDefault();
        zonaDrop.style.borderColor = '#a64b2a';
    });
    zonaDrop.addEventListener('dragleave', () => {
        zonaDrop.style.borderColor = '#3d2314';
    });
    zonaDrop.addEventListener('drop', evento => {
        evento.preventDefault();
        zonaDrop.style.borderColor = '#3d2314';
        const arquivo = evento.dataTransfer.files[0];
        if (!arquivo)
            return;
        const { x, y } = obterPosicaoNoQuadro(evento);
        inserirImagemMovel(arquivo, Math.max(0, x), Math.max(0, y));
    });
    window.addEventListener('paste', evento => {
        const itens = evento.clipboardData && evento.clipboardData.items;
        if (!itens)
            return;
        for (const item of itens) {
            if (item.type && item.type.startsWith('image/')) {
                const arquivo = item.getAsFile();
                if (arquivo) {
                    inserirImagemMovel(arquivo, 50, 50);
                }
                break;
            }
        }
    });
    return () => { geracao++; };
}
