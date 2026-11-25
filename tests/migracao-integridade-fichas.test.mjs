import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Verificação estática. As políticas/RPCs ainda exigem testes reais no Supabase.
const sql = readFileSync(new URL('../supabase/013_integridade_fichas.sql', import.meta.url), 'utf8');

test('migração incrementa revisões no servidor e não substitui o JSON original', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS revisao bigint NOT NULL DEFAULT 1/i);
    assert.match(sql, /NEW\.revisao\s*:=\s*OLD\.revisao\s*\+\s*1/i);
    assert.doesNotMatch(sql, /TRUNCATE|DROP TABLE|DELETE FROM public\.fichas|UPDATE public\.fichas\s+SET\s+dados\s*=/i);
});

test('RPCs são condicionadas a proprietário e revisão e não são públicas', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.salvar_ficha_jogador/i);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.renomear_ficha_jogador/i);
    assert.match(sql, /f\.usuario_id\s*=\s*v_usuario/i);
    assert.match(sql, /f\.revisao\s*=\s*p_revisao/i);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.salvar_ficha_jogador\(uuid,jsonb,bigint\) FROM PUBLIC, anon/i);
});
