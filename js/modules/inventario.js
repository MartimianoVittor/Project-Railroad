// Inventário único por personagem: rolagem genérica, armas e itens editáveis.
const ARMAS=['primaria','secundaria'];
const DISTANCIAS=['corpo','curta','media','longa'];
const IDS=['rolagem-traco','rolagem-bonus',...ARMAS.flatMap(arma=>[`arma-${arma}`,...DISTANCIAS.map(dist=>`bonus-${arma}-${dist}`)])];
const TIPOS=[4,6,8,12];
let itens=[];
let agendar=()=>{};
const elemento=id=>document.getElementById(id);
function controles(){return Object.fromEntries(IDS.map(id=>[id,elemento(id)?.value ?? '']));}
export function coletarInventario(){return {itens:itens.map(item=>({...item})),rolagens:controles()};}
function criarCelula(item,campo,rotulo,tipo='text'){
 const td=document.createElement('td');
 const input=document.createElement('input');input.type=tipo;input.value=item[campo]??'';
 input.setAttribute('aria-label',rotulo);input.dataset.campoItem=campo;
 if(tipo==='number'){input.min='1';input.step='1';}
 input.addEventListener('input',()=>{item[campo]=input.value;agendar();});
 td.append(input);return td;
}
function renderizarItens(){
 const tbody=elemento('lista-itens');if(!tbody)return;tbody.replaceChildren();
 itens.forEach((item,indice)=>{
  const tr=document.createElement('tr');
  tr.append(criarCelula(item,'nome','Nome do item'),criarCelula(item,'quantidade','Quantidade do item','number'),criarCelula(item,'tamanho','Tamanho do item'),criarCelula(item,'descricao','Descrição do item'));
  const td=document.createElement('td'),botao=document.createElement('button');
  botao.type='button';botao.className='botao-remover-item';botao.textContent='×';botao.title='Remover item';botao.setAttribute('aria-label',`Remover item ${indice+1}`);
  botao.addEventListener('click',()=>{itens.splice(indice,1);renderizarItens();agendar();});
  td.append(botao);tr.append(td);tbody.append(tr);
 });
}
export function restaurarInventario(dados){
 itens=Array.isArray(dados?.itens)?dados.itens.filter(i=>i&&typeof i==='object').map(i=>({...i})):[];
 for(const id of IDS){const campo=elemento(id);if(!campo)continue;
  let valor=dados?.rolagens?.[id];
  if(valor===undefined && id.startsWith('bonus-') && id.split('-').length===3){valor=dados?.rolagens?.[`bonus-${id.split('-')[1]}`];}
  if(typeof valor==='string'||typeof valor==='number')campo.value=String(valor);
  else campo.value=campo.tagName==='SELECT'?(id==='rolagem-bonus'?'0':''):id.startsWith('bonus-')?'0':'';
 }
 renderizarItens();document.querySelectorAll('.resultado-rolagem').forEach(el=>el.textContent='');
}
export function listarItens(){return itens.map(i=>({...i}));}
function dadoDoTraco(grupo){
 const marcadores=[...document.querySelectorAll('#personagem .check-tracos[data-grupo]')].filter(el=>el.dataset.grupo===grupo);
 return Math.max(0,...marcadores.map((el,i)=>el.checked?TIPOS[i]:0));
}
export function iniciarInventario(agendarSalvamento){
 agendar=agendarSalvamento;const area=elemento('inventario');if(!area)return;
 document.addEventListener('input',e=>{if(e.target.matches('.campo-inventario'))agendar();});
 document.addEventListener('change',e=>{if(e.target.matches('.campo-inventario'))agendar();});
 elemento('adicionar-item')?.addEventListener('click',()=>{itens.push({nome:'',quantidade:1,tamanho:'',descricao:'',preco:0});renderizarItens();agendar();elemento('lista-itens')?.lastElementChild?.querySelector('input')?.focus();});
 document.querySelector('[data-rolagem="traco"]')?.addEventListener('click',()=>{
  const saida=elemento('resultado-traco'),grupo=elemento('rolagem-traco')?.value;
  if(!grupo){saida.textContent='Escolha um traço antes de rolar.';return;}
  const faces=dadoDoTraco(grupo);if(!faces){saida.textContent='Este traço não possui dados marcados.';return;}
  const sorteio=new Uint32Array(1);crypto.getRandomValues(sorteio);
  const dado=1+Math.floor((sorteio[0]/4294967296)*faces);
  const bonus=Number(elemento('rolagem-bonus')?.value)||0;
  saida.textContent=`d${faces}: ${dado} ${bonus<0?'−':'+'} ${Math.abs(bonus)} = ${dado+bonus}`;
 });
}
