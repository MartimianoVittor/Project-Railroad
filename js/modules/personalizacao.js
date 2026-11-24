import { comProcessamento } from '../utils/processamento.js?v=1.4.18';
import { obterSupabase } from '../services/supabaseClient.js?v=1.4.18';
import { criarRepositorioPreferencias } from '../services/preferenciasRepository.js?v=1.4.18';

import { guardarPreferencias, OPCOES_VISUAIS, PADRAO, recuperarPreferencias, validarPreferencias } from './aparencia/preferencias.js?v=1.4.18';
import { atualizarVisual, criarOpcao, personalizarCartoes } from './aparencia/visual.js?v=1.4.18';

export { OPCOES_VISUAIS, validarPreferencias, migrarPreferenciasAnteriores } from './aparencia/preferencias.js?v=1.4.18';

export function iniciarPersonalizacao(armazenamento = null) {
    if (!armazenamento) {
        try { armazenamento = window.localStorage; }
        catch { /* Sem armazenamento, a interface permanece utilizável. */ }
    }
    let preferencias = armazenamento ? recuperarPreferencias(armazenamento) : { ...PADRAO };
    const painel = document.getElementById('personalizacao');
    if (!painel) return;
    for (const [categoria, opcoes] of Object.entries(OPCOES_VISUAIS)) {
        const grade = painel.querySelector(`[data-opcoes="${categoria}"]`);
        if (grade) grade.replaceChildren(...opcoes.map(([valor, titulo]) => criarOpcao(categoria, valor, titulo)));
    }
    atualizarVisual(preferencias);

    window.addEventListener('railroad:pagina-alterada', () => personalizarCartoes(preferencias));
    const status = document.getElementById('rr-status-aparencia');
    const botaoSalvar = document.getElementById('rr-salvar-aparencia');
    const botaoRestaurar = document.getElementById('rr-restaurar-aparencia');
    const botaoFechar = document.getElementById('rr-fechar-aparencia');
    let confirmadas = { ...preferencias };
    let usuarioId = null;
    let geracao = 0;
    let ocupado = false;
    let carregando = false;
    let falhaCarga = false;
    function atualizarControles() {
        botaoSalvar.disabled = ocupado || carregando || falhaCarga;
        botaoRestaurar.disabled = ocupado || carregando;
        botaoFechar.disabled = ocupado;
        painel.querySelectorAll('input[data-rr-categoria]').forEach(input => {
            input.disabled = ocupado || carregando;
        });
    }
    async function repositorio() {
        const cliente = await obterSupabase();
        if (!cliente) throw new Error('Supabase não configurado');
        return criarRepositorioPreferencias(cliente);
    }
    async function sincronizar(id, forcar = false) {
        if (id === usuarioId && !forcar) return;
        const atual = ++geracao;
        usuarioId = id;
        ocupado = false;
        falhaCarga = false;
        carregando = Boolean(id);
        // Nunca exibir preferências da conta anterior durante a troca.
        confirmadas = id ? { ...PADRAO } : (armazenamento ? recuperarPreferencias(armazenamento) : { ...PADRAO });
        preferencias = { ...confirmadas };
        atualizarVisual(preferencias);
        atualizarControles();
        status.textContent = id ? 'Carregando preferências da conta…' : '';
        if (!id) return;
        try {
            const remoto = await comProcessamento('Carregando preferências…', async () => (await repositorio()).carregar(id));
            if (atual !== geracao) return;
            confirmadas = remoto ? validarPreferencias(remoto) : { ...PADRAO };
            preferencias = { ...confirmadas };
            atualizarVisual(preferencias);
            status.textContent = '';
        } catch (erro) {
            if (atual !== geracao) return;
            falhaCarga = true;
            status.textContent = 'Não foi possível carregar as preferências. Feche e abra novamente para tentar.';
            console.warn('Railroad: falha ao carregar aparência.', erro);
        } finally {
            if (atual === geracao) { carregando = false; atualizarControles(); }
        }
    }
    document.addEventListener('railroad:auth', evento => {
        void sincronizar(evento.detail.usuarioId ?? null);
    });
    document.querySelectorAll('[data-abrir-personalizacao]').forEach(botao => botao.addEventListener('click', () => {
        if (painel.open) return;
        preferencias = { ...confirmadas };
        atualizarVisual(preferencias);
        if (falhaCarga) void sincronizar(usuarioId, true);
        else if (!carregando) status.textContent = '';
        painel.showModal();
    }));
    botaoFechar.addEventListener('click', () => painel.close());
    painel.addEventListener('cancel', evento => { if (ocupado) evento.preventDefault(); });
    painel.addEventListener('close', () => {
        preferencias = { ...confirmadas };
        atualizarVisual(preferencias);
    });
    botaoSalvar.addEventListener('click', async () => {
        if (ocupado || carregando || falhaCarga) return;
        const atual = geracao;
        const id = usuarioId;
        const escolhas = { ...preferencias };
        ocupado = true;
        atualizarControles();
        status.textContent = 'Salvando…';
        try {
            if (id) await comProcessamento('Salvando preferências…', async () => (await repositorio()).salvar(id, escolhas));
            else guardarPreferencias(armazenamento, escolhas);
            if (atual !== geracao) return;
            confirmadas = escolhas;
            status.textContent = id ? 'Preferências salvas na conta.' : 'Preferências salvas neste navegador.';
            painel.close();
        } catch (erro) {
            if (atual !== geracao) return;
            status.textContent = 'Não foi possível salvar. Suas escolhas continuam na prévia; tente novamente.';
            console.warn('Railroad: falha ao salvar aparência.', erro);
        } finally {
            if (atual === geracao) { ocupado = false; atualizarControles(); }
        }
    });
    painel.addEventListener('change', evento => {
        if (ocupado || carregando) return;
        const input = evento.target.closest('input[data-rr-categoria]');
        if (!input?.checked) return;
        const categoria = input.dataset.rrCategoria;
        if (!OPCOES_VISUAIS[categoria]?.some(([valor]) => valor === input.value)) return;
        preferencias[categoria] = input.value;
        atualizarVisual(preferencias);
    });
    botaoRestaurar.addEventListener('click', () => {
        preferencias = { ...PADRAO };
        atualizarVisual(preferencias);
    });
}
