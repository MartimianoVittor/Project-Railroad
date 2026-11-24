# Verificação de segurança — Supabase

A chave `publishableKey` do navegador é pública. **Nunca** adicione uma `service_role` ao repositório. A autorização real depende das políticas RLS do banco de produção, que não acompanham este ZIP.

Esta atualização não modifica tabelas nem executa SQL no banco. Antes de considerar a produção auditada, confirme no painel do Supabase:

1. RLS ativo em `fichas`, `preferencias_visuais`, convites e tabelas de mesas; usuários só podem ler suas próprias fichas e compartilhamentos explicitamente autorizados.
2. `SELECT`, `INSERT`, `UPDATE` e `DELETE` possuem políticas adequadas a `auth.uid()`; não confie em IDs enviados pelo navegador.
3. `updated_at` em `fichas` é `timestamptz`, legível e atualizável pelo dono da ficha. O salvamento agora exige coincidência dessa revisão (`UPDATE ... WHERE updated_at = ?`); verifique a atualização automática em triggers, se houver.
4. Os mestres só possuem leitura de fichas aprovadas/compartilhadas, nunca escrita.
5. Os índices/constraints necessários para `origem_importacao` e `preferencias_visuais.usuario_id` estão presentes.

**Como testar:** utilize duas contas reais distintas e tente ler, alterar e excluir fichas cruzadas. Tente editar a mesma ficha em dois navegadores após carregá-la nos dois; a segunda gravação deve indicar conflito sem apagar o rascunho. Os testes locais são simulações, não comprovam a política do banco real.
