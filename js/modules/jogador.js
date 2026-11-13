import { arquivoParaDataURL, mostrarErro } from '../utils/arquivos.js';
export function iniciarJogador(agendarSalvamento) {
 const inputFoto = document.getElementById('escolher-foto-jogador');
 const fotoJogador = document.getElementById('foto-jogador');
 const campos = ['nome-jogador','apelido-jogador','bio-jogador'].map(id=>document.getElementById(id));
 inputFoto?.addEventListener('change', async evento => {
   const arquivo = evento.target.files?.[0]; if (!arquivo) return;
   if (!arquivo.type.startsWith('image/')) { alert('Selecione uma imagem válida.'); inputFoto.value=''; return; }
   try { if(fotoJogador) fotoJogador.src=await arquivoParaDataURL(arquivo); agendarSalvamento(); }
   catch(erro) { mostrarErro('Não foi possível carregar a foto.', erro); }
 });
 campos.forEach(c=>c?.addEventListener('input',agendarSalvamento));
}
export function coletarJogador() {
 return {nome:document.getElementById('nome-jogador')?.value||'',apelido:document.getElementById('apelido-jogador')?.value||'',
 bio:document.getElementById('bio-jogador')?.value||'',fotoPerfil:document.getElementById('foto-jogador')?.getAttribute('src')||''};
}
export function restaurarJogador(ficha) {
 for(const [id,chave] of [['nome-jogador','nome'],['apelido-jogador','apelido'],['bio-jogador','bio']]) {
 const el=document.getElementById(id);if(el)el.value=typeof ficha[chave]==='string'?ficha[chave]:'';
 }
 const foto=document.getElementById('foto-jogador');
 if(foto) foto.src = (typeof ficha.fotoPerfil === 'string' && ficha.fotoPerfil && !ficha.fotoPerfil.startsWith('blob:')) ? ficha.fotoPerfil : 'assets/imgs/fundoCinza.jpg';
}
