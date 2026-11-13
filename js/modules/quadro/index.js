import {criarGerenciadorElementos} from './elementos.js';
import {criarFerramentas} from './ferramentas.js';
import {criarCanvas} from './canvas.js';
import {iniciarDesenho} from './desenho.js';
import {iniciarImagens} from './imagens.js';
export function iniciarQuadro({agendarSalvamento,salvarDadosFicha}) {
 const canvas=document.getElementById('quadro-rpg');
 const zonaDrop=document.getElementById('zona-drop');
 const ctx=canvas?.getContext('2d');
 if(!canvas||!ctx||!zonaDrop) {console.warn('Quadro não encontrado.');return null;}
 const byId=id=>document.getElementById(id);
 const btnLapis=byId('btn-lapis'),btnBorracha=byId('btn-borracha'),btnTexto=byId('btn-texto'),btnMover=byId('btn-mover'),btnLimpar=byId('btn-limpar');
 const seletorCor=byId('seletor-cor'),uploadMapa=byId('upload-mapa');
 let ferramentas;
 const obterModo=()=>ferramentas?.obterModo()||'lapis';
 const selecionarFerramenta=(...args)=>ferramentas?.selecionarFerramenta(...args);
 const elementos=criarGerenciadorElementos({zonaDrop,agendarSalvamento,obterModo,selecionarFerramenta,btnMover});
 ferramentas=criarFerramentas({canvas,ctx,zonaDrop,agendarSalvamento,btnLapis,btnBorracha,btnTexto,btnMover,btnLimpar,elementos,salvarDadosFicha});
 const posicao=evento=>{const r=zonaDrop.getBoundingClientRect();return {x:evento.clientX-r.left,y:evento.clientY-r.top};};
 const canvasAPI=criarCanvas({canvas,ctx,zonaDrop,agendarSalvamento});
 iniciarDesenho({canvas,ctx,zonaDrop,obterModo,obterPosicaoNoQuadro:posicao,criarElementoTexto:elementos.criarElementoTexto,seletorCor,agendarSalvamento});
 iniciarImagens({zonaDrop,uploadMapa,criarElementoImagem:elementos.criarElementoImagem,obterPosicaoNoQuadro:posicao});
 canvasAPI.ajustarTamanhoCanvas();
 if(!document.querySelector('.btn-oeste.ativo'))ferramentas.selecionarFerramenta('lapis',btnLapis);
 if('ResizeObserver' in window) new ResizeObserver(canvasAPI.ajustarTamanhoCanvas).observe(zonaDrop);
 else window.addEventListener('resize',canvasAPI.ajustarTamanhoCanvas);
 function coletarQuadro(){
 const itensQuadro=elementos.obterItensMoveis().map(container=>{
 const tipo=container.dataset.tipo;
 const dados={tipo,left:container.style.left||'0px',top:container.style.top||'0px',width:container.style.width||'',height:container.style.height||''};
 if(tipo==='texto') {const t=container.querySelector('.texto-conteudo');if(!t)return null;dados.texto=t.textContent;dados.color=t.style.color||'#000000';dados.fontSize=t.style.fontSize||'18px';}
 else if(tipo==='imagem'){const i=container.querySelector('.imagem-conteudo');if(!i)return null;dados.src=i.getAttribute('src')||i.src;}
 else return null;
 return dados;
 }).filter(Boolean);
 return {desenhoCanvas:canvas.toDataURL('image/png'),itensQuadro};
 }
 function restaurarQuadro(ficha){
 ctx.clearRect(0,0,canvas.width,canvas.height);
 canvasAPI.carregarImagemNoCanvas(ficha.desenhoCanvas);
 elementos.limparElementosDoQuadro();
 for(const item of ficha.itensQuadro||[]){
 if(!item||typeof item!=='object')continue;
 if(item.tipo==='texto'&&typeof item.texto==='string')elementos.criarElementoTexto(item.texto,item.left||'0px',item.top||'0px',item.color||'#000000',item.fontSize||'18px',false);
 else if(item.tipo==='imagem'&&typeof item.src==='string'&&item.src)elementos.criarElementoImagem(item.src,item.left||'0px',item.top||'0px',item.width||'200px',item.height||'auto',false);
 }
 }
 return {coletarQuadro,restaurarQuadro};
}
