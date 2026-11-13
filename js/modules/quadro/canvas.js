export function criarCanvas({canvas,ctx,zonaDrop,agendarSalvamento}) {
let primeiraMedicao = true;
function ajustarTamanhoCanvas() {

        const larguraAnterior = canvas.width;
        const alturaAnterior = canvas.height;

        const novaLargura = Math.max(
            1,
            Math.round(zonaDrop.clientWidth)
        );

        const novaAltura = Math.max(
            1,
            Math.round(zonaDrop.clientHeight)
        );

        if (
            novaLargura === larguraAnterior &&
            novaAltura === alturaAnterior
        ) {
            return;
        }

        const copia = document.createElement('canvas');

        copia.width = larguraAnterior;
        copia.height = alturaAnterior;

        const contextoCopia = copia.getContext('2d');

        contextoCopia.drawImage(canvas, 0, 0);

        canvas.width = novaLargura;
        canvas.height = novaAltura;

        ctx.drawImage(
            copia,
            0,
            0,
            novaLargura,
            novaAltura
        );

        if (primeiraMedicao) primeiraMedicao = false;
        else agendarSalvamento();
    }
 function carregarImagemNoCanvas(dataURL) {
   if(!dataURL || typeof dataURL!=='string')return;
   const imagem=new Image();
   imagem.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(imagem,0,0,canvas.width,canvas.height);};
   imagem.onerror=()=>console.warn('Não foi possível restaurar o desenho.');
   imagem.src=dataURL;
 }
 return {ajustarTamanhoCanvas,carregarImagemNoCanvas};
}
