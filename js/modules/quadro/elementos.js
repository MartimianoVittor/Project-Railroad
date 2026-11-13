export function criarGerenciadorElementos({zonaDrop, agendarSalvamento, obterModo, selecionarFerramenta, btnMover}) {
 let itemSelecionado=null;
 const obterItensMoveis=()=>Array.from(zonaDrop.querySelectorAll('.item-movel'));
 const selecionarItem=elemento=>{
   obterItensMoveis().forEach(item=>item.classList.remove('selecionado'));
   itemSelecionado=elemento||null;
   if(itemSelecionado)itemSelecionado.classList.add('selecionado');
 };
 const limparElementosDoQuadro=()=>{obterItensMoveis().forEach(item=>item.remove());selecionarItem(null);};
 const modoAtualProxy=()=>obterModo();
function configurarItemInterativo(container, tipo) {

        container.dataset.tipo = tipo;

        const alca = document.createElement('div');

        alca.className = 'alca-redimensionar';

        alca.setAttribute(
            'aria-label',
            'Redimensionar elemento'
        );

        container.appendChild(alca);

        let arrastando = false;
        let redimensionando = false;

        let inicioX = 0;
        let inicioY = 0;

        let inicioLeft = 0;
        let inicioTop = 0;

        let inicioWidth = 0;
        let inicioHeight = 0;

        let inicioFonte = 0;
        let proporcao = 1;

        let ponteiroId = null;

        container.addEventListener('pointerdown', evento => {

            if (modoAtualProxy() !== 'mover' || evento.target === alca) return;

            if (evento.button !== 0) return;

            evento.preventDefault();
            evento.stopPropagation();

            selecionarItem(container);

            arrastando = true;

            ponteiroId = evento.pointerId;

            inicioX = evento.clientX;
            inicioY = evento.clientY;

            inicioLeft = container.offsetLeft;
            inicioTop = container.offsetTop;

            container.setPointerCapture(ponteiroId);
        });

        alca.addEventListener('pointerdown', evento => {

            if (modoAtualProxy() !== 'mover' || evento.button !== 0) return;

            evento.preventDefault();
            evento.stopPropagation();

            selecionarItem(container);

            redimensionando = true;

            ponteiroId = evento.pointerId;

            inicioX = evento.clientX;
            inicioY = evento.clientY;

            inicioWidth = container.offsetWidth;
            inicioHeight = container.offsetHeight;

            proporcao = inicioWidth > 0
                ? inicioHeight / inicioWidth
                : 1;

            if (tipo === 'texto') {

                const texto = container.querySelector('.texto-conteudo');

                inicioFonte = parseFloat(
                    getComputedStyle(texto).fontSize
                ) || 18;
            }

            alca.setPointerCapture(ponteiroId);
        });

        function moverOuRedimensionar(evento) {

            if (evento.pointerId !== ponteiroId) return;

            const deltaX = evento.clientX - inicioX;
            const deltaY = evento.clientY - inicioY;

            if (arrastando) {

                const limiteX = Math.max(
                    0,
                    zonaDrop.clientWidth - container.offsetWidth
                );

                const limiteY = Math.max(
                    0,
                    zonaDrop.clientHeight - container.offsetHeight
                );

                const novoX = Math.max(
                    0,
                    Math.min(inicioLeft + deltaX, limiteX)
                );

                const novoY = Math.max(
                    0,
                    Math.min(inicioTop + deltaY, limiteY)
                );

                container.style.left = `${novoX}px`;
                container.style.top = `${novoY}px`;
            }

            if (redimensionando) {

                const novaLargura = Math.max(
                    40,
                    inicioWidth + deltaX
                );

                if (tipo === 'imagem') {

                    container.style.width = `${novaLargura}px`;

                    container.style.height = `${
                        Math.max(30, novaLargura * proporcao)
                    }px`;

                } else if (tipo === 'texto') {

                    const escala = novaLargura / Math.max(1, inicioWidth);

                    const novoTamanho = Math.max(
                        10,
                        Math.min(120, inicioFonte * escala)
                    );

                    const texto = container.querySelector('.texto-conteudo');

                    texto.style.fontSize = `${novoTamanho}px`;
                }
            }
        }

        function finalizarInteracao(evento) {

            if (
                ponteiroId !== null &&
                evento.pointerId !== ponteiroId
            ) {
                return;
            }

            if (!arrastando && !redimensionando) return;

            arrastando = false;
            redimensionando = false;
            ponteiroId = null;

            agendarSalvamento();
        }

        container.addEventListener('pointermove', moverOuRedimensionar);
        container.addEventListener('pointerup', finalizarInteracao);
        container.addEventListener('pointercancel', finalizarInteracao);
    }

    function criarElementoTexto(
        texto,
        left = '20px',
        top = '20px',
        color = '#000000',
        fontSize = '18px',
        ativarMover = true
    ) {

        const container = document.createElement('div');

        container.className = 'item-movel';

        container.style.left = left;
        container.style.top = top;

        const divTexto = document.createElement('div');

        divTexto.className = 'texto-conteudo';

        divTexto.textContent = texto;

        divTexto.style.color = color;
        divTexto.style.fontSize = fontSize;

        container.appendChild(divTexto);

        zonaDrop.appendChild(container);

        configurarItemInterativo(container, 'texto');

        if (ativarMover) {

            selecionarFerramenta('mover', btnMover);

            selecionarItem(container);

            agendarSalvamento();
        }

        return container;
    }

    function criarElementoImagem(
        src,
        left = '20px',
        top = '20px',
        width = '200px',
        height = 'auto',
        ativarMover = true
    ) {

        const container = document.createElement('div');

        container.className = 'item-movel';

        container.style.left = left;
        container.style.top = top;
        container.style.width = width;

        if (height && height !== 'auto') {
            container.style.height = height;
        }

        const imagem = document.createElement('img');

        imagem.src = src;

        imagem.alt = 'Imagem adicionada ao quadro tático';

        imagem.className = 'imagem-conteudo';

        imagem.draggable = false;

        container.appendChild(imagem);

        zonaDrop.appendChild(container);

        configurarItemInterativo(container, 'imagem');

        if (ativarMover) {

            selecionarFerramenta('mover', btnMover);

            selecionarItem(container);

            agendarSalvamento();
        }

        return container;
    }
 return {obterItensMoveis,selecionarItem,limparElementosDoQuadro,criarElementoTexto,criarElementoImagem,obterSelecionado:()=>itemSelecionado};
}
