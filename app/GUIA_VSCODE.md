# Abrir o Projeto Sentinela/HMV no VS Code

1. Extraia o arquivo ZIP.
2. No VS Code, use **Arquivo > Abrir Pasta** e selecione `app`.
3. Instale Python, Node.js, Yarn e MongoDB, caso ainda não tenha.
4. Copie `backend/.env.example` para `backend/.env` e ajuste a conexão com o MongoDB.

Abra dois terminais no VS Code.

## Backend (Python/FastAPI)

```powershell
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

## Frontend (React/TypeScript)

```powershell
cd frontend
corepack enable
yarn install
yarn dev
```

Abra `http://localhost:3000`.

**Importante:** este pacote não traz banco de dados nem credenciais reais. O MongoDB deve estar ativo localmente ou você deve configurar uma conexão própria em `backend/.env`. O frontend usa `/api` por meio do proxy do Vite.
