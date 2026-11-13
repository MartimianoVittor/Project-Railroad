import {lerFicha,gravarFicha,apagarFicha} from './core/storage.js';
import {normalizarFicha} from './core/validacao.js';
import {baixarFicha,interpretarArquivo} from './core/importExport.js';
import {coletarPersonagem,restaurarPersonagem,observarPersonagem} from './modules/personagem.js';
import {coletarJogador,restaurarJogador,iniciarJogador} from './modules/jogador.js';
import {iniciarQuadro} from './modules/quadro/index.js';
import {coletarInventario,restaurarInventario,iniciarInventario} from './modules/inventario.js';
import {iniciarSidebar} from './modules/sidebar.js';
import {mostrarErro} from './utils/arquivos.js';
let quadro=null,temporizador=null;
function coletarFicha(){return normalizarFicha({...coletarJogador(),...(quadro?.coletarQuadro()||{desenhoCanvas:'',itensQuadro:[]}),personagem:coletarPersonagem(),inventario:coletarInventario()});}
function salvarFicha(){try{gravarFicha(coletarFicha());return true;}catch(erro){console.warn('Não foi possível salvar a ficha.',erro);return false;}}
function agendarSalvamento(){clearTimeout(temporizador);temporizador=setTimeout(salvarFicha,250);}
function carregarFicha(dados){const ficha=normalizarFicha(dados);restaurarJogador(ficha);restaurarPersonagem(ficha);restaurarInventario(ficha.inventario);quadro?.restaurarQuadro(ficha);}
function iniciar(){
 quadro=iniciarQuadro({agendarSalvamento,salvarDadosFicha:salvarFicha});
 iniciarJogador(agendarSalvamento);observarPersonagem(agendarSalvamento);iniciarInventario(agendarSalvamento);
 iniciarSidebar({coletarFicha,carregarFicha,apagarFicha,baixarFicha,interpretarArquivo,gravarFicha,normalizarFicha,mostrarErro});
 try{const ficha=lerFicha();if(ficha)carregarFicha(ficha);}catch(erro){mostrarErro('Não foi possível carregar a ficha.',erro);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
