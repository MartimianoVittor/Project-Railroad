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
- [x] **Perfil do Jogador com Campo de Colagens:** perfil completo para o jogador que permita a colagem de inspirações anotações e temas.
- [x] **Fichas Dinâmicas:** criação e edição de fichas de personagens diretamente pelo site.
- [x] **Atualização em Tempo Real:** informações das fichas atualizadas dinamicamente conforme as alterações realizadas.
- [x] **Gerenciamento de Personagens e Inventário:** criação, personalização e acompanhamento da evolução dos personagens além de inventário dinâmico que permite adicionar e retirar itens bem como criar novos.
- [x] **Ferramentas de Jogo:** recursos interativos para auxiliar jogadores durante as sessões.
- [x] **Integração com Banco de Dados:** fichas privadas usando Supabase Auth e PostgreSQL com RLS.
- [ ] **Sistema para Mestres:** ferramentas para organização e gerenciamento das campanhas repositório "".
- [ ] **Guia de Campanhas:** campanhas pré montadas para todos.


## 🛠️ Tecnologias

As tecnologias utilizadas no desenvolvimento do projeto serão apresentadas conforme sua implementação.

- HTML5
- CSS3
- JavaScript
- Supabase Auth (Google OAuth) e PostgreSQL (JSONB + RLS; após configuração)

## 🎯 Objetivos

- Desenvolver um sistema de RPG original e funcional.
- Criar fichas interativas e personalizáveis.
- Facilitar o gerenciamento de personagens e campanhas.
- Desenvolver uma experiência de navegação intuitiva e temática.
- Integrar as regras do sistema às funcionalidades da plataforma.

## 🚧 Status do Projeto

<sub>Versão 1.2.4 — correção de inicialização e diagnóstico dos componentes HTML</sub>

Você ja pode criar suas fichas e personagens em salva-las local e online

versão do mestre e campanhas em desenvolvimento confira o repositório "".

---

### 🌄 RAILROAD

**Prepare seu cavalo, carregue seu revólver.**

## Interface v1.2.0

- **Jogador, Personagem, Inventário e Quadro:** páginas independentes, com rolagem dentro da área de trabalho.
- **Fichas:** gerenciamento de personagens online (criar, abrir, renomear, duplicar e excluir).
- **Conta:** Google OAuth, convites, mesas e envio de fichas para o mestre.
- **Local:** fichas no dispositivo, importação e exportação de arquivos JSON.

O formato das fichas e o banco Supabase não foram alterados. Veja `ATUALIZAR_DE_V1.1.0.md`.


## Ajustes de interface v1.2.1

- Barra lateral de 160 px, com ações na ordem **Conta → Fichas → Local**.
- No computador, **Jogador e Quadro** dividem a mesma página; o Quadro
  continua independente apenas na navegação do celular.
- As fichas preservam os IDs, dados e funcionalidades. Os espaçamentos externos
  foram compactados para caber melhor em monitores comuns.
- Campos com textos longos ou janelas muito pequenas ainda podem exigir
  rolagem **interna**: não ocultamos informações nem desabilitamos a rolagem.
- O mesmo canvas é deslocado entre desktop e celular, sem criar um segundo quadro.


## Ajustes de interface v1.2.2

- Na tabela de itens, **Local** reúne os ícones do personagem e da montaria em uma única coluna.
- Removidos os textos redundantes "Teste de traço" e "Nome" dos cartões do Inventário.
- Ações inferiores da barra lateral: **Conta → Ficha → Local**.
- Os painéis de gerenciamento têm fechamento nativo pelo botão **×**.
- As molduras dos retratos do Jogador e do Personagem utilizam toda a largura da primeira coluna no desktop.

Consulte `ATUALIZAR_DE_V1.2.1.md` para instalar a atualização.


## Correção de inicialização v1.2.4

- Os fragmentos HTML são carregados sem usar cópias antigas do cache.
- Controles ausentes são identificados pelo nome, evitando erros genéricos de `addEventListener`.
- A falta de um botão secundário não bloqueia o acesso à conta Google.
- Nenhuma mudança no formato das fichas ou no banco de dados.

Veja `ATUALIZAR_DE_V1.2.3.md` para instalar a atualização.

## Correção v1.2.5 — Inicialização e botões

Os controles **Conta**, **Ficha** e **Local** agora fazem parte do `index.html`,
sem depender do carregamento de um fragmento para aparecer. O carregamento
modular das fichas e dos diálogos foi preservado, com isolamento de falhas.
A versão remove referências a botões obsoletos e mantém o formato de dados.

Para atualizar a partir da v1.2.4, consulte `ATUALIZAR_DE_V1.2.4.md`.
