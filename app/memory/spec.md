# HMV — Hospital Municipal Valparaíso (spec do app)

Sistema hospitalar de gestão e chamada de pacientes. Stack: FastAPI + MongoDB
(backend/, porta 8001) + React 19 / Vite / Tailwind v4 / shadcn base-nova
(frontend/, porta 3000, `/api` via proxy). UI em pt-BR. Paleta: azul petróleo
#155E75 (primária), #E0F2FE (destaques), #FFFFFF (cards), #F1F5F9 (fundo),
#334155 (texto), #16A34A (disponível/sucesso), #DC2626 (erro/alerta). Fontes:
Plus Jakarta Sans (títulos), DM Sans (texto), IBM Plex Mono (senhas).

## Rotas (frontend)
- `/login` — pública; sessão por cookie httpOnly (POST /api/auth/login);
  mostrar/ocultar senha, mensagem de erro, atalhos de credenciais demo.
- `/tv` — pública, TV de chamada: polling 2,5s em `/api/calls/current` e
  `/api/calls/recent?limit=6`; anuncia por voz pt-BR (Web Speech API) + bip
  (Web Audio API) quando a chamada muda (ou é repetida); botão "ATIVAR ÁUDIO"
  no primeiro acesso (política de autoplay dos navegadores); tela cheia; nome
  do paciente ocultável via Configurações (`show_patient_name_on_tv`).
- `/dashboard` — indicadores (polling 5s): aguardando, em atendimento,
  finalizados hoje, consultórios ocupados + fila, últimas chamadas, salas.
- `/pacientes` — CRUD + busca (nome/CPF/cartão/telefone) + filtro por tipo;
  cadastro emite senha automaticamente (checkbox "Emitir senha").
- `/chamada` — Nova chamada: paciente aguardando + consultório livre +
  profissional → CHAMAR PACIENTE; botões chamar próximo / repetir / finalizar.
- `/consultorios` — cards com estado (Disponível / Em atendimento / Manutenção);
  recepção/admin alternam manutenção; admin cria consultório.
- `/profissionais` (admin) — equipe: criar/remover usuários, perfis.
- `/atendimentos` — finalizados: espera, duração, horário.
- `/relatorios` (admin/recepção) — cards + gráficos recharts (7 dias).
- `/configuracoes` (admin) — toggles da TV + contas demo + sobre.

## Papéis (backend aplica via `require()` em routers/auth.py)
- `admin` — tudo (Configurações, Profissionais, criar consultórios).
- `recepcao` — pacientes (CRUD), chamadas, consultórios (manutenção), relatórios.
- `enfermagem` — chamadas, consultórios, atendimentos.
- `medico` — dashboard, consultórios, atendimentos.

## Dados (Mongo, db "app")
Coleções: `users` (senha pbkdf2 em password_hash), `sessions` (TTL 7d, cookie
`hmv_session`), `patients`, `rooms`, `calls`, `settings` (doc key "general").
Senha (ticket): prefixo por tipo (Consulta=A, Retorno=B, Exame=E, Urgência=P) +
sequência diária (A001, A002...). Ciclo: aguardando → chamado (consultório
ocupa) → finalizado (libera consultório, limpa active_ticket do paciente).
Índices em backend/lib/db.py (INDEXES), aplicados no startup.

## Seed
`cd /app/backend && python seed.py` (idempotente): 6 usuários, 6 consultórios,
14 pacientes, chamadas dos últimos 7 dias, 1 chamada ativa (A005 no
Consultório 02) e 5 senhas aguardando. Configurações padrão on.

## Credenciais de teste
Ver memory/test_credentials.md.
