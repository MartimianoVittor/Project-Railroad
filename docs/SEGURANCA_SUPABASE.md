# Verificação de segurança — Supabase

A chave `publishableKey` do navegador é pública. **Nunca** adicione uma `service_role` ao repositório. A autorização real depende das políticas RLS do banco de produção, que não acompanham este ZIP.

Esta atualização não modifica tabelas nem executa SQL no banco. Antes de considerar a produção auditada, confirme no painel do Supabase:

1. RLS ativo em `fichas`, `preferencias_visuais`, convites e tabelas de mesas; usuários só podem ler suas próprias fichas e compartilhamentos explicitamente autorizados.
2. `SELECT`, `INSERT`, `UPDATE` e `DELETE` possuem políticas adequadas a `auth.uid()`; não confie em IDs enviados pelo navegador.
3. `fichas.revisao` é um inteiro positivo gerenciado pelo servidor. As RPCs `salvar_ficha_jogador` e `renomear_ficha_jogador` devem verificar `usuario_id = auth.uid()` e a revisão esperada, incrementando a revisão de forma atômica em cada alteração; `updated_at` serve à ordenação e ao registro de atualização, não é o token principal de concorrência da versão atual.
4. Os mestres só possuem leitura de fichas aprovadas/compartilhadas, nunca escrita.
5. Os índices/constraints necessários para `origem_importacao` e `preferencias_visuais.usuario_id` estão presentes.

**Como testar:** utilize duas contas reais distintas e tente ler, alterar e excluir fichas cruzadas. Tente editar a mesma ficha em dois navegadores após carregá-la nos dois; a segunda gravação deve indicar conflito sem apagar o rascunho. Os testes locais são simulações, não comprovam a política do banco real.

**Pendência de entrega:** a migração SQL `013_integridade_fichas.sql` não acompanha o ZIP de origem. Os testes correspondentes são ignorados, e a presença/execução das RPCs no Supabase remoto não foi verificada. Rode `npm run verificar:sql` após recuperar o SQL oficial e realize os testes reais com duas contas antes da publicação definitiva.
