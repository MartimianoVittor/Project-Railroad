export function validarFicha(dados) {
 if (!dados || typeof dados!=='object' || Array.isArray(dados)) throw new Error('Ficha inválida.');
 if(dados.versao!==undefined && ![1,2,3].includes(dados.versao)) throw new Error('Versão de ficha não suportada.');
 if(dados.itensQuadro!==undefined && !Array.isArray(dados.itensQuadro)) throw new Error('Itens do quadro inválidos.');
 return dados;
}
export function normalizarFicha(dados) {
 validarFicha(dados);
 const personagem=dados.personagem && typeof dados.personagem==='object' && !Array.isArray(dados.personagem)?dados.personagem:{};
 return {...dados, versao:3, itensQuadro:dados.itensQuadro||[], personagem:{...personagem}, inventario:normalizarInventario(dados.inventario)};
}
function normalizarInventario(valor) {
 const itens=Array.isArray(valor)?valor:Array.isArray(valor?.itens)?valor.itens:[];
 return {rolagens: valor?.rolagens && typeof valor.rolagens==='object' && !Array.isArray(valor.rolagens) ? {...valor.rolagens} : {}, itens:itens.filter(item=>item && typeof item==='object').map(item=>({
 nome:String(item.nome||''), quantidade:Math.max(1,Number(item.quantidade)||1), descricao:String(item.descricao||''),
 tamanho:String(item.tamanho||''), preco:Number(item.preco)||0
 }))};
}
