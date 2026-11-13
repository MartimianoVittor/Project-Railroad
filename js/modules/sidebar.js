export function iniciarSidebar({coletarFicha,carregarFicha,apagarFicha,baixarFicha,interpretarArquivo,gravarFicha,normalizarFicha,mostrarErro}) {
 document.getElementById('btn-exportar')?.addEventListener('click',()=>{
   try{baixarFicha(coletarFicha());}catch(erro){mostrarErro('Não foi possível exportar a ficha.',erro);}
 });
 document.getElementById('input-importar')?.addEventListener('change',async evento=>{
   const arquivo=evento.target.files?.[0];if(!arquivo)return;
   try {const dados=interpretarArquivo(await arquivo.text());
     const ficha = normalizarFicha(dados);
     carregarFicha(ficha);gravarFicha(ficha);alert('Ficha carregada com sucesso, forasteiro!');
   } catch(erro){mostrarErro('Erro ao importar. Escolha um JSON válido do Railroad RPG.',erro);}
   finally {evento.target.value='';}
 });
 document.getElementById('btn-apagar-ficha')?.addEventListener('click',()=>{
   if(!confirm('Tem certeza de que deseja apagar sua ficha? Todos os dados salvos serão perdidos.'))return;
   apagarFicha();location.reload();
 });
}
