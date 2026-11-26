import { porId } from '../../utils/dom.js?v=1.4.26';
import { criarCanvas } from './canvas.js?v=1.4.26';
import { iniciarDesenho } from './desenho.js?v=1.4.26';
import { criarGerenciadorElementos } from './elementos.js?v=1.4.26';
import { criarFerramentas } from './ferramentas.js?v=1.4.26';
import { iniciarImagens } from './imagens.js?v=1.4.26';

function lerItem(container) {
    const { tipo } = container.dataset;
    const { left, top, width, height } = container.style;
    const posicao = { tipo, left: left || '0px', top: top || '0px', width: width || '', height: height || '' };
    if (tipo === 'texto') {
        const campo = container.querySelector('.texto-conteudo');
        return campo && {
            ...posicao, texto: campo.textContent,
            color: campo.style.color || '#000000', fontSize: campo.style.fontSize || '18px',
        };
    }
    if (tipo === 'imagem') {
        const imagem = container.querySelector('.imagem-conteudo');
        return imagem && { ...posicao, src: imagem.getAttribute('src') || imagem.src };
    }
    return null;
}

export function iniciarQuadro({ agendarSalvamento, salvarDadosFicha }) {
    const canvas = porId('quadro-rpg');
    const zonaDrop = porId('zona-drop');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !zonaDrop) return null;

    function obterPosicaoNoQuadro(evento) {
        // object-fit: contain mantém a proporção e pode introduzir margens.
        const area = canvas.getBoundingClientRect();
        const escala = Math.min(area.width / canvas.width, area.height / canvas.height);
        const largura = canvas.width * escala;
        const altura = canvas.height * escala;
        const esquerda = area.left + (area.width - largura) / 2;
        const topo = area.top + (area.height - altura) / 2;
        return {
            x: Math.max(0, Math.min(canvas.width, (evento.clientX - esquerda) / escala)),
            y: Math.max(0, Math.min(canvas.height, (evento.clientY - topo) / escala)),
        };
    }

    const botoes = Object.fromEntries(['lapis', 'borracha', 'texto', 'mover'].map((modo) => [modo, porId('btn-' + modo)]));
    const desenho = criarCanvas({ canvas, ctx, zonaDrop, agendarSalvamento });
    const obterModo = () => ferramentas.obterModo();
    const elementos = criarGerenciadorElementos({
        zonaDrop, agendarSalvamento, obterModo,
        selecionarFerramenta: (modo) => ferramentas.selecionarFerramenta(modo),
    });
    const ferramentas = criarFerramentas({ canvas, zonaDrop, botoes, elementos, limparQuadro, salvarDadosFicha });
    const cancelarTraco = iniciarDesenho({
        canvas, ctx, obterModo, obterPosicaoNoQuadro,
        agendarSalvamento: () => { desenho.registrarAlteracao(); agendarSalvamento(); },
        criarElementoTexto: elementos.criarElementoTexto, selecionarItem: elementos.selecionarItem,
        seletorCor: porId('seletor-cor'),
    });
    porId('btn-imagem')?.addEventListener('click', () => porId('upload-mapa')?.click());
    const cancelarImagensPendentes = iniciarImagens({
        zonaDrop, uploadMapa: porId('upload-mapa'), obterPosicaoNoQuadro,
        criarElementoImagem: elementos.criarElementoImagem,
    });

    desenho.ajustarTamanhoCanvas();
    window.addEventListener('railroad:pagina-alterada', (evento) => {
        if (['jogador', 'quadro-mobile'].includes(evento.detail?.pagina))
            requestAnimationFrame(desenho.ajustarTamanhoCanvas);
    });
    if ('ResizeObserver' in window) new ResizeObserver(desenho.ajustarTamanhoCanvas).observe(zonaDrop);
    else window.addEventListener('resize', desenho.ajustarTamanhoCanvas);

    function limparQuadro() {
        cancelarTraco();
        cancelarImagensPendentes();
        desenho.carregarImagemNoCanvas(null);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        elementos.limparElementosDoQuadro();
    }

    function restaurarQuadro(ficha) {
        limparQuadro();
        if (ficha.desenhoCanvas) desenho.carregarImagemNoCanvas(ficha.desenhoCanvas);
        for (const item of ficha.itensQuadro || []) {
            if (!item) continue;
            const x = item.left || '0px';
            const y = item.top || '0px';
            if (item.tipo === 'texto' && typeof item.texto === 'string') {
                elementos.criarElementoTexto(item.texto, x, y, item.color || '#000000', item.fontSize || '18px', false);
            } else if (item.tipo === 'imagem' && typeof item.src === 'string' && item.src) {
                elementos.criarElementoImagem(item.src, x, y, item.width || '200px', item.height || 'auto', false);
            }
        }
    }

    function coletarQuadro() {
        const itensQuadro = elementos.obterItensMoveis().map(lerItem).filter(Boolean);
        return { desenhoCanvas: desenho.obterImagem(), itensQuadro };
    }
    return { coletarQuadro, restaurarQuadro };
}
