# Tiquetly

Plataforma de eventos e ingressos com três papéis: organizador, cliente e
portaria. O organizador monta eventos a partir de um catálogo externo
(shows via Ticketmaster, filmes via TMDb), o cliente navega, reserva e
paga de forma simulada, e a portaria valida o ingresso na entrada.

> Este README acompanha o desenvolvimento do projeto e ainda não descreve
> o produto final. A seção [Estado atual](#estado-atual) diz exatamente o
> que já funciona e o que falta.

## Sumário

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Testando o que já funciona](#testando-o-que-já-funciona)
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

## Testando o que já funciona

Ainda não existe um jeito de criar um usuário organizador pela própria
aplicação (isso vem do script de seed, passo pendente), então publicar o
primeiro evento exige passar pela API diretamente.

1. Criar uma conta de cliente pela tela ("Criar conta" em
   http://localhost:5173), com um e-mail e senha à sua escolha.
2. Promover esse usuário para organizador direto no banco:

   ```
   sqlite3 backend/eventos.db "UPDATE user SET role='organizer' WHERE email='seu@email.com'"
   ```

3. Pegar um token para esse usuário e publicar um evento:

   ```
   TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
     -d "username=seu@email.com&password=sua-senha" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

   curl -X POST http://localhost:8000/events \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "source": "ticketmaster", "external_id": "abc123",
       "title": "Legião Urbana - Turnê 40 Anos", "category": "show",
       "date": "2026-09-01T23:00:00Z", "venue": "Allianz Parque",
       "capacity": 300, "price": 180.0, "reservation_mode": "general"
     }'
   ```

4. Voltar para http://localhost:5173, o evento aparece na lista (com
   busca por nome, filtro por categoria e preço máximo). Entrar com uma
   segunda conta de cliente (a mesma conta promovida a organizador também
   funciona, mas em um app real cada papel teria sua própria conta), abrir
   o evento e reservar: quantidade para eventos `general`, mapa de
   assentos para eventos `seatmap`. A reserva fica com status "pendente,
   aguardando pagamento", porque o pagamento simulado ainda não existe.

## Estado atual

O que já funciona de ponta a ponta:

- Autenticação com três papéis (organizador, cliente, portaria), registro
  de cliente, login, JWT.
- Integração com Ticketmaster Discovery e TMDb atrás de um adapter comum
  de catálogo.
- Organizador cria eventos a partir do catálogo (via API por enquanto).
- Cliente navega, busca e filtra eventos publicados.
- Reserva por quantidade (shows) e por mapa de assentos (filmes), as
  duas com garantia de não vender o mesmo lugar duas vezes sob
  concorrência.

O que ainda falta, pela ordem prevista:

- Pagamento simulado (aprovação e recusa) e liberação do estoque em caso
  de recusa.
- Geração de ingresso com QR assinado e a área "Meus ingressos".
- Compartilhamento de ingresso por link público.
- Tela de portaria, leitura de QR e validação.
- Painel do organizador (listagem, edição, despublicação dos próprios
  eventos, hoje só existe criação).
- Script de seed com usuários e eventos de teste.
- Testes automatizados adicionais focados nas regras críticas restantes
  (assinatura do QR, validação dupla na portaria).
- Deploy.

Nenhum bug conhecido nas partes já implementadas. Esta seção será trocada
por uma lista real de limitações antes da entrega final, como o edital
pede.

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
