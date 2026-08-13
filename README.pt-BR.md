# Tiquetly

Plataforma de eventos e ingressos com três papéis: organizador, cliente e
portaria. O organizador monta eventos a partir de um catálogo externo
(shows via Ticketmaster, filmes via TMDb), o cliente navega, reserva e
paga de forma simulada, e a portaria valida o ingresso na entrada.

🇬🇧 [Read in English](README.md)

> Este README acompanha o desenvolvimento do projeto e ainda não descreve
> o produto final. A seção [Estado atual](#estado-atual) diz exatamente o
> que já funciona e o que falta.

## Sumário

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Dados de teste (seed)](#dados-de-teste-seed)
- [Percorrendo o fluxo completo](#percorrendo-o-fluxo-completo)
- [Estado atual](#estado-atual)
- [Decisões de design](#decisões-de-design)

## Stack

- Backend: Python 3.12, FastAPI, SQLModel sobre SQLAlchemy, Alembic para
  migrações. SQLite em desenvolvimento, Postgres em produção.
- Frontend: React com Vite, JavaScript puro (sem TypeScript), React
  Router. CSS próprio, sem UI kit.
- Autenticação: JWT (`python-jose`) e hash de senha com bcrypt
  (`passlib`).
- Ambiente de desenvolvimento: devcontainer (Python 3.12 + Node 20 via
  feature).

## Como rodar

### Com devcontainer (recomendado)

1. Abrir a pasta no VS Code. Se a extensão Dev Containers estiver
   instalada, deve aparecer um aviso oferecendo para abrir no container:
   nesse aviso ou pela paleta de comandos (`Ctrl+Shift+P` /
   `Cmd+Shift+P`), escolher **Dev Containers: Rebuild and Reopen in
   Container** na primeira vez (constrói a imagem do zero). Depois disso,
   **Reopen in Container** já basta. Também dá para usar `devcontainer up`
   pela CLI. As dependências de backend e frontend são instaladas
   automaticamente pelo `postCreateCommand`.
2. Copiar `backend/.env.example` para `backend/.env` e preencher as
   chaves de API (ver [Variáveis de ambiente](#variáveis-de-ambiente)).
3. Rodar as migrações e subir os dois servidores:

   ```
   cd backend
   .venv/bin/alembic upgrade head
   .venv/bin/uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
   ```

   ```
   cd frontend
   npm install
   npm run dev
   ```

   O `--host 0.0.0.0` do backend é necessário para o encaminhamento
   automático de porta do VS Code funcionar de fora do container (o
   frontend já resolve isso sozinho, `vite.config.js` define
   `server.host = true`). Sem essa flag o servidor sobe normalmente, mas
   nada abre no navegador do host.

4. Backend em http://localhost:8000 (docs automáticos em `/docs`),
   frontend em http://localhost:5173.

### Sem devcontainer

Requer Python 3.12+ e Node 20+ instalados na máquina.

```
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # preencher as chaves de API
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
```

```
cd frontend
npm install
npm run dev
```

### Com Docker Compose

Alternativa que não depende do devcontainer nem de instalar Python/Node
na máquina: sobe backend, frontend e um Postgres real (não o SQLite do
dev local, ver [Decisões de design](#decisões-de-design)) em três
containers.

```
cp .env.example .env   # preencher as chaves de API e trocar os segredos
docker compose up --build
```

Frontend em http://localhost:5173, backend em http://localhost:8000. Não
sobe com dados de teste sozinho; rodar o seed manualmente depois que os
três serviços estiverem de pé, se quiser:

```
docker compose exec backend python -m app.seed
```

> Este caminho não pôde ser testado com um `docker compose up` real
> durante o desenvolvimento: o devcontainer usado para construir o
> projeto não tem Docker disponível dentro dele. Os arquivos foram
> revisados à mão e o `docker-compose.yml` validado como YAML, mas não
> executados de ponta a ponta. Ver [Estado atual](#estado-atual).

## Variáveis de ambiente

Backend (`backend/.env`, ver `backend/.env.example`):

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Padrão já usa SQLite local, sem setup nenhum. |
| `FRONTEND_ORIGIN` | Origem liberada no CORS, precisa bater com onde o frontend roda. |
| `JWT_SECRET_KEY` | Segredo dos tokens de autenticação. Gerar um valor próprio. |
| `QR_HMAC_SECRET` | Segredo da assinatura do QR do ingresso. Gerar um valor próprio. |
| `TICKETMASTER_API_KEY` | Gerar em [developer.ticketmaster.com](https://developer.ticketmaster.com). |
| `TMDB_API_KEY` | Gerar em [developer.themoviedb.org](https://developer.themoviedb.org). |

Frontend (`frontend/.env`, ver `frontend/.env.example`):

| Variável | Descrição |
| --- | --- |
| `VITE_API_URL` | URL do backend. O padrão já cobre o setup local. |

Docker Compose (`.env` na raiz, ver [`.env.example`](.env.example), só
usado por [`docker compose up`](#com-docker-compose)): as mesmas seis
variáveis acima, mais as três abaixo que montam o `DATABASE_URL` do
Postgres do compose.

| Variável | Descrição |
| --- | --- |
| `POSTGRES_USER` | Usuário do Postgres do compose. |
| `POSTGRES_PASSWORD` | Senha do Postgres do compose. |
| `POSTGRES_DB` | Nome do banco do Postgres do compose. |

## Dados de teste (seed)

Com as migrações aplicadas e as chaves de API preenchidas, rodar:

```
cd backend
.venv/bin/python -m app.seed
```

Cria (ou reaproveita, se já existirem: seguro rodar mais de uma vez) um
organizador, dois clientes, uma conta de portaria, um evento de show
publicado (Ticketmaster) e um de filme (TMDb) com assentos, sendo que um
dos ingressos do filme já sai validado (para a tela de portaria já ter um
caso de "já utilizado" pra mostrar, não só o caminho feliz). O script usa
a Ticketmaster e a TMDb de verdade, no mesmo caminho que o organizador
usaria pela tela, então as duas chaves de API precisam estar
configuradas antes de rodar.

Credenciais (senha igual pra todo mundo, só pra facilitar o teste):

| Papel | E-mail | Senha |
| --- | --- | --- |
| Organizador | `organizador@tiquetly.com` | `tiquetly123` |
| Cliente 1 | `cliente1@tiquetly.com` | `tiquetly123` |
| Cliente 2 | `cliente2@tiquetly.com` | `tiquetly123` |
| Portaria | `portaria@tiquetly.com` | `tiquetly123` |

## Percorrendo o fluxo completo

Depois do seed, em http://localhost:5173:

1. **Organizador** (`organizador@tiquetly.com`): entrar, ir em "Meus
   eventos", "Criar evento" para publicar outro a partir do catálogo, ou
   editar/despublicar os dois já existentes.
2. **Cliente** (`cliente1@tiquetly.com` ou `cliente2@tiquetly.com`):
   buscar um evento na home, abrir, reservar (quantidade para eventos
   `general`, mapa de assentos para `seatmap`), pagar com o cartão de
   teste que aprova (`4242 4242 4242 4242`) ou o que recusa
   (`4000 0000 0000 0002`, libera o estoque de novo). Reserva pendente
   também pode ser cancelada antes de pagar ("Desistir e cancelar
   reserva"). Depois de aprovado, o ingresso aparece em "Meus
   ingressos", com QR, código para digitar na portaria e um botão para
   copiar o link público de compartilhamento; de lá também dá para
   cancelar uma reserva já paga (libera o ingresso e o lugar/estoque).
3. **Portaria** (`portaria@tiquetly.com`): entrar, ir em "Portaria",
   escolher o evento do dia, validar por câmera ou digitando o código.
   Um ingresso do evento de filme semeado já sai "já utilizado" para
   testar esse retorno sem precisar validar duas vezes na mão.

## Estado atual

O que já funciona de ponta a ponta:

- Autenticação com três papéis (organizador, cliente, portaria), registro
  de cliente, login, JWT.
- Integração com Ticketmaster Discovery e TMDb atrás de um adapter comum
  de catálogo.
- Organizador cria eventos a partir do catálogo pela própria tela,
  edita os já publicados e despublica.
- Cliente navega, busca e filtra eventos publicados.
- Reserva por quantidade (shows) e por mapa de assentos (filmes), as
  duas com garantia de não vender o mesmo lugar duas vezes sob
  concorrência, e as duas com opção de cancelar (antes ou depois de
  pagar) e devolver o lugar ao estoque.
- Pagamento simulado (aprovação e recusa) com cartão de teste, libera o
  estoque de novo em caso de recusa ou cancelamento.
- Ingresso com QR assinado (não forjável) e a área "Meus ingressos".
- Compartilhamento de ingresso por link público, sem exigir login.
- Tela de portaria: escolha do evento do dia, leitura por câmera ou
  digitação manual, os quatro retornos (válido, inválido, já utilizado,
  evento errado).
- Script de seed com os usuários e eventos de teste.

Escrito mas não confirmado rodando de ponta a ponta (ver limites abaixo):

- `docker-compose.yml` (stretch): backend, frontend e Postgres em três
  containers, ver [Com Docker Compose](#com-docker-compose).

O que ainda falta, pela ordem prevista:

- Deploy.

Nenhum bug conhecido nas partes já implementadas. Três limites conhecidos:

- Uma reserva `pending` sem pagamento nem cancelamento explícito fica
  presa nesse estado para sempre, segurando o lugar ou o estoque, já
  que não existe expiração automática. Na prática isso só afeta quem
  abandona o fluxo de pagamento sem clicar em "Desistir e cancelar
  reserva"; o botão existe exatamente para dar essa saída, mas nada
  libera o lugar sozinho se ninguém tomar essa ação.
- O evento de filme criado pelo seed só aparece no dropdown "hoje" da
  tela de portaria no dia em que o seed foi rodado (a data é fixada em
  meio-dia UTC no momento do seed, não recalculada depois), então rodar
  o seed e testar a portaria em dias diferentes exige rodar o seed de
  novo (idempotente para usuários e eventos já existentes, mas não
  reagenda a data de um evento que já existe).
- O `docker-compose.yml` não foi validado com um `docker compose up`
  real: o ambiente usado para desenvolver o projeto não tem Docker
  disponível dentro dele (sem a feature de Docker-in-Docker no
  devcontainer). Os arquivos foram revisados à mão e o YAML parseado
  com sucesso, mas não há uma execução de ponta a ponta confirmando que
  a stack sobe limpa.

Esta seção será revisada por completo antes da entrega final, como o
edital pede.

## Decisões de design

Registradas aqui em resumo, o histórico completo de alternativas
descartadas fica no controle de versão do projeto.

- Duas fontes de catálogo (Ticketmaster para shows, TMDb para filmes)
  atrás de um adapter comum, para o resto do backend nunca precisar saber
  qual das duas originou um evento.
- Dois fluxos de reserva (quantidade e mapa de assentos), porque um show
  de pista e uma sessão de cinema são produtos genuinamente diferentes,
  forçar os dois no mesmo modelo distorceria um lado ou o outro.
- Sem mapa de assentos em tempo real: a tela é otimista (mostra o assento
  livre até alguém tentar reservar) e o servidor é a fonte da verdade no
  momento da reserva, com erro claro se o assento sumiu enquanto o
  cliente escolhia. O ganho de um canal em tempo real não paga a
  complexidade extra para o tamanho deste projeto.
- Identidade visual própria (paleta escura, tipografia Bebas Neue/IBM
  Plex, cartões em forma de canhoto de ingresso), comparada lado a lado
  com outras duas direções antes de escolhida, para fugir do visual
  genérico padrão de ferramenta.
- Pagamento simulado por formulário de cartão fake com números de teste,
  em vez de um botão único de sucesso, para representar de verdade os
  dois caminhos que o edital pede (aprovação e recusa).
- `docker-compose.yml` sobe o backend contra Postgres, não contra o
  SQLite do dev local, para exercitar o mesmo motor de banco que a
  produção usa (mesma escolha da ADR 0002), em vez de só repetir o que o
  setup local já mostra.
- O próprio app tem uma troca de idioma real e dinâmica entre inglês e
  português (inglês por padrão), baseada num dicionário feito à mão e
  Context do React em vez de uma lib como `react-i18next`, no mesmo
  espírito de evitar outras dependências no resto do projeto. Erros de
  domínio do backend carregam um código estável e legível por máquina
  pra o frontend também conseguir traduzi-los, não só o texto estático
  da tela (ADR 0020). Isso é diferente da documentação bilíngue (este
  README incluso), que é markdown estático e não tem esse toggle, veja
  o link de idioma no topo deste arquivo.
