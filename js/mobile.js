/* Navegação móvel; ações reutilizam os controles existentes da sidebar. */
(() => {
 const abas = [...document.querySelectorAll('.aba-mobile[data-aba]')];
 const abrir = document.getElementById('abrir-acoes-mobile');
 const fechar = document.getElementById('fechar-acoes-mobile');
 const painel = document.getElementById('acoes-mobile');
 const fundo = document.getElementById('fundo-acoes-mobile');
 let focoAnterior = null;
 function exibir(ativo) {
   painel.hidden = !ativo; fundo.hidden = !ativo;
   abrir.setAttribute('aria-expanded', String(ativo));
   if (ativo) { focoAnterior = document.activeElement; fechar.focus(); }
   else if (painel.contains(document.activeElement)) focoAnterior?.focus();
 }
 abrir.addEventListener('click', () => exibir(painel.hidden));
 fechar.addEventListener('click', () => exibir(false));
 fundo.addEventListener('click', () => exibir(false));
 document.addEventListener('keydown', e => {
   if (e.key === 'Escape' && !painel.hidden) exibir(false);
   if (e.key === 'Tab' && !painel.hidden) {
     const controles = [...painel.querySelectorAll('button')];
     const primeiro = controles[0], ultimo = controles[controles.length - 1];
     if (e.shiftKey && document.activeElement === primeiro) {e.preventDefault();ultimo.focus();}
     else if (!e.shiftKey && document.activeElement === ultimo) {e.preventDefault();primeiro.focus();}
   }
 });
 [['exportar-mobile','btn-exportar'],['importar-mobile','input-importar'],['apagar-mobile','btn-apagar-ficha']].forEach(([origem,alvo]) => {
   document.getElementById(origem).addEventListener('click', () => {
     exibir(false);
     document.getElementById(alvo)?.click();
   });
 });
 function ativar(id) {abas.forEach(aba => {const ativa=aba.dataset.aba===id;aba.classList.toggle('ativa',ativa);if(ativa)aba.setAttribute('aria-current','location');else aba.removeAttribute('aria-current');});}
 // Preserva o mesmo quadro e todos os listeners; não cria um segundo canvas.
 const jogador = document.getElementById('jogador');
 const quadroMobile = document.getElementById('quadro-mobile');
 const origemQuadro = document.querySelector('.fragmento-quadro');
 const mq = window.matchMedia('(max-width: 768px)');
 function organizarQuadro() {
   if (!origemQuadro) return;
   const quadro = origemQuadro.querySelector('.col.triple') || quadroMobile.querySelector('.col.triple');
   if (!quadro) return;
   const destino = mq.matches ? quadroMobile : origemQuadro;
   if (quadro.parentElement !== destino) destino.appendChild(quadro);
 }
 // Mover o mesmo painel de rolagens, sem duplicar campos ou IDs.
 const origemRolagens = document.querySelector('#inventario .inventario-rolagens');
 const destinoPersonagem = document.getElementById('personagem');
 function organizarRolagens() {
   if (!origemRolagens || !destinoPersonagem) return;
   if (mq.matches) {
     origemRolagens.classList.add('rolagens-no-personagem');
     if (origemRolagens.parentElement !== destinoPersonagem) destinoPersonagem.append(origemRolagens);
   } else {
     origemRolagens.classList.remove('rolagens-no-personagem');
     const itens = document.querySelector('#inventario .inventario-itens');
     if (itens && origemRolagens.parentElement !== itens.parentElement) itens.before(origemRolagens);
   }
 }
 function exibirTela(id, atualizarHash = false) {
   const ids = ['jogador','personagem','quadro-mobile','inventario'];
   if (!ids.includes(id)) id = 'jogador';
   document.querySelectorAll('#jogador, #personagem, #quadro-mobile, #inventario').forEach(el => {
     el.classList.toggle('tela-mobile-ativa', el.id === id);
   });
   ativar(id);
   if (atualizarHash) history.replaceState(null, '', '#' + id);
   window.scrollTo({top:0,behavior:'instant'});
 }
 abas.forEach(aba => aba.addEventListener('click', e => {
   if (!mq.matches) return;
   e.preventDefault();
   exibirTela(aba.dataset.aba, true);
   exibir(false);
 }));
 window.addEventListener('railroad:fragmentos-carregados', () => {
   organizarQuadro();
   organizarRolagens();
   exibirTela(location.hash.slice(1));
 });
 window.addEventListener('hashchange', () => {
   if (mq.matches) exibirTela(location.hash.slice(1));
 });
 mq.addEventListener('change', () => {
   organizarQuadro();
   organizarRolagens();
   if (mq.matches) exibirTela(location.hash.slice(1));
   else document.querySelectorAll('.tela-mobile-ativa').forEach(el => el.classList.remove('tela-mobile-ativa'));
 });

})();
