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
- [ ] **Sistema para Mestres:** ferramentas para organização e gerenciamento das campanhas repositório "http://github.com/MartimianoVittor/Project-Railroad-Master".
- [ ] **Guia de Campanhas:** campanhas pré montadas para todos.


## 🛠️ Tecnologias

O aplicativo é servido diretamente pelo navegador e usa as seguintes tecnologias.

- HTML5
- CSS3
- JavaScript com módulos ES e IndexedDB para fichas locais
- Supabase Auth (Google OAuth) e PostgreSQL (JSONB + RLS; após configuração)

## Executar e testar

Sirva a pasta que contém `index.html` com o Live Server ou execute `python -m http.server 8000` e abra `http://localhost:8000/`. Para usar a ficha no próprio navegador, escolha **Continuar com ficha local**. O acesso com Google habilita os recursos da conta.

Rode `npm test` com Node.js 22 ou superior para executar a suíte de testes. O site dispensa compilação.

Antes de cada publicação no GitHub Pages, altere a versão em `package.json` e execute `npm run preparar:publicacao`. Esse comando remove os arquivos órfãos da plataforma Mestre, atualiza **todas** as referências locais a JS/CSS com a mesma versão e executa os testes. Publique os arquivos resultantes (inclusive as exclusões) pelo Git. Não envie a pasta `.git` em ZIPs de distribuição.

Para localizar os módulos de edição, as regras de inventário, o salvamento e a personalização, consulte o [guia de arquitetura](docs/ARQUITETURA.md).

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



## Integridade das fichas e limites

Importações JSON agora passam por validação de estrutura e tamanho (20 MB), mantendo a leitura de versões antigas. Fichas salvas pelo próprio app continuam preservando os campos desconhecidos. Se um dispositivo modificar uma ficha online enquanto ela estiver aberta em outro, o segundo salvamento detecta o conflito pela coluna `updated_at`, exibe um aviso e preserva o rascunho local. Exporte a ficha JSON antes de recarregar para reconciliar as mudanças; o aplicativo não mescla os dois arquivos automaticamente.

Uma perda de conexão mantém o rascunho no IndexedDB; o envio tenta novamente algumas vezes e ao receber o evento de retorno da rede. Evite fechar a aba imediatamente após editar, pois nenhum navegador garante a conclusão de uma escrita assíncrona no evento `pagehide`.

As políticas de acesso efetivas do Supabase precisam ser conferidas no projeto do banco (consulte `docs/SEGURANCA_SUPABASE.md`). Os testes usam simulações e não substituem uma auditoria de RLS real.
