# 🤠 RAILROAD

### Seu destino no Velho Oeste.

> **"Toda lenda começa com uma jornada."**

Railroad é um projeto em desenvolvimento de uma plataforma web dedicada a RPGs de mesa na temática Western.

A proposta é oferecer um ambiente onde jogadores e mestres possam vivenciar suas histórias, utilizando um **sistema próprio de RPG**, fichas de personagens dinâmicas e ferramentas interativas que tornam a experiência de jogo mais prática, organizada e imersiva.

---

## 🌵 Sobre o Projeto

O Railroad busca unir tecnologia e interpretação de papéis em uma plataforma que permita aos jogadores criar, personalizar e acompanhar seus personagens, enquanto oferece suporte às mecânicas de um sistema próprio de jogo.

O projeto está em desenvolvimento e pretende expandir suas funcionalidades gradualmente.

## 🔫 Funcionalidades

- [X] **Sistema Próprio de RPG V1.0:** mecânicas, atributos, características e regras desenvolvidas especialmente para o Railroad.
- [x] **Interface Temática:** identidade visual inspirada no Velho Oeste.
- [x] **Personalização:** modifique os estilos de molduras bordas e planos de fundo.
- [x] **Perfil do Jogador com Campo de Colagens:** perfil completo para o jogador que permita a colagem de inspirações anotações e temas.
- [x] **Fichas Dinâmicas:** criação e edição de fichas de personagens diretamente pelo site.
- [x] **Atualização em Tempo Real:** informações das fichas atualizadas dinamicamente conforme as alterações realizadas.
- [x] **Gerenciamento de Personagens e Inventário:** criação, personalização e acompanhamento da evolução dos personagens além de inventário dinâmico que permite adicionar e retirar itens bem como criar novos.
- [x] **Ferramentas de Jogo:** recursos interativos para auxiliar jogadores durante as sessões.
- [x] **Integração com Banco de Dados:** fichas privadas usando Supabase Auth e PostgreSQL com RLS.
- [x] **Sistema para Mestres:** ferramentas para organização e gerenciamento das campanhas repositório "http://github.com/MartimianoVittor/Project-Railroad-Master".
- [ ] **Guia de Campanhas:** campanhas pré montadas para todos.


## 🛠️ Tecnologias

O aplicativo é servido diretamente pelo navegador e usa as seguintes tecnologias.

- HTML5
- CSS3
- JavaScript com módulos ES e IndexedDB para fichas locais
- Supabase Auth (Google OAuth) e PostgreSQL (JSONB + RLS; após configuração)

## 🎯 Objetivos

- Desenvolver um sistema de RPG original e funcional.
- Criar fichas interativas e personalizáveis.
- Facilitar o gerenciamento de personagens e campanhas.
- Desenvolver uma experiência de navegação intuitiva e temática.
- Integrar as regras do sistema às funcionalidades da plataforma.

## 🚧 Status do Projeto 

**finalizado, em expansão.**

Você ja pode criar suas fichas e personagens em salva-las local e online

versão do mestre e campanhas em desenvolvimento confira o repositório "http://github.com/MartimianoVittor/Project-Railroad-Master".

---

### 🌄 RAILROAD

**Prepare seu cavalo, carregue seu revólver.**

## Desenvolvimento e validação

**Aplicativo:** Railroad Jogador v1.4.26. Abra a pasta com Live Server ou execute `python -m http.server 8000` na raiz.

- `npm run validar` — verifica referências locais, sintaxe dos módulos e testes de regressão. No PowerShell restrito: `npm.cmd run validar`.
- `npm run preparar:publicacao` — atualiza versões de cache dos arquivos locais e executa a validação, sem fazer exclusões.
- `npm run limpar:legado` — apenas lista arquivos conhecidos que sobraram após extrair um ZIP sobre uma versão antiga. Para remover **somente** resíduos com hashes idênticos aos originais, use `npm run limpar:legado -- --aplicar`.
- `npm run verificar:sql` — exige a migração SQL 013 oficial; avisa se ela não foi fornecida.

A migração Supabase 013 não está no arquivo recebido. A versão local permanece testável, mas as garantias de segurança das operações de nuvem exigem verificar as migrações e políticas reais do banco. Consulte `docs/ARQUITETURA.md` e `docs/SEGURANCA_SUPABASE.md`.
