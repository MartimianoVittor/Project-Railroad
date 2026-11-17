import assert from 'node:assert/strict';
import { normalizarFicha } from '../js/core/validacao.js';
import { criarRepositorioFichas } from '../js/services/fichasRepository.js';
import { supabaseConfigurado } from '../js/config/supabase.js';

assert.equal(supabaseConfigurado(), false, 'sem configuração deve permanecer no modo local');

for (const local of ['jogador', 'montaria', '']) {
    const ficha = normalizarFicha({
        versao: 3,
        personagem: { 'nome-personagem': 'Teste' },
        inventario: { itens: [{ nome: 'Corda', quantidade: 1, tamanho: 2, local }] },
    });
    assert.equal(ficha.inventario.itens[0].local, local, `local ${local} preservado`);
}
assert.equal(normalizarFicha({ inventario: { itens: [{ nome: 'Antigo' }] } }).inventario.itens[0].local, 'jogador');

// Repositório isolado da UI: simula o contrato do cliente Supabase.
const linhas = [];
let id = 0;
class Consulta {
    constructor() { this.op = 'list'; this.filtro = null; }
    select() { return this; }
    order() { return this; }
    eq(_campo, valor) { this.filtro = valor; return this; }
    single() { this.unico = true; return this; }
    insert(dados) { this.op = 'insert'; this.dados = dados; return this; }
    update(dados) { this.op = 'update'; this.dados = dados; return this; }
    delete() { this.op = 'delete'; return this; }
    then(resolver, rejeitar) {
        try {
            let data;
            if (this.op === 'insert') {
                data = { ...this.dados, id: String(++id), updated_at: new Date().toISOString() };
                linhas.push(data);
            } else if (this.op === 'update') {
                data = linhas.find((r) => r.id === this.filtro);
                if (data) Object.assign(data, this.dados);
            } else if (this.op === 'delete') {
                const indice = linhas.findIndex((r) => r.id === this.filtro);
                data = indice >= 0 ? linhas.splice(indice, 1)[0] : null;
            } else {
                data = this.filtro ? linhas.find((r) => r.id === this.filtro) : [...linhas];
            }
            return Promise.resolve(resolver({ data, error: data ? null : { message: 'Não encontrada' } }));
        } catch (erro) {
            return Promise.reject(erro).catch(rejeitar);
        }
    }
}
const repo = criarRepositorioFichas({ from: (tabela) => { assert.equal(tabela, 'fichas'); return new Consulta(); } });
const primeira = await repo.criar('usuario-A', 'Personagem 1', { personagem: { nome: 'Um' } });
const segunda = await repo.criar('usuario-A', 'Personagem 2', { personagem: { nome: 'Dois' } });
assert.equal((await repo.listar()).length, 2);
await repo.salvar(primeira.id, { inventario: { itens: [{ local: 'montaria' }] } });
assert.equal((await repo.obter(primeira.id)).dados.inventario.itens[0].local, 'montaria');
assert.equal((await repo.obter(segunda.id)).dados.personagem.nome, 'Dois');
await repo.renomear(segunda.id, 'Outro título');
assert.equal((await repo.obter(segunda.id)).titulo, 'Outro título');
await repo.excluir(primeira.id);
assert.equal((await repo.listar()).length, 1);
console.log('OK: normalização, compatibilidade JSON e operações CRUD de múltiplas fichas.');
