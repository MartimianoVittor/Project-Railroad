/** Comprova a presença local da migração de segurança, sem alterar o banco. */
import { existsSync } from 'node:fs';
const migracao = new URL('../supabase/013_integridade_fichas.sql', import.meta.url);
if (!existsSync(migracao)) {
    console.error('Validação SQL pendente: supabase/013_integridade_fichas.sql não foi incluído no ZIP.');
    console.error('Recupere a migração oficial; não crie uma substituta apenas para os testes passarem.');
    process.exitCode = 1;
} else console.log('Migração SQL 013 presente. Use npm test para verificar suas cláusulas esperadas.');
