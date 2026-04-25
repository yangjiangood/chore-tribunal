FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend
COPY packages ./packages

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN pnpm --dir apps/backend db:generate
RUN pnpm --dir apps/backend build

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "pnpm db:migrate:deploy && node dist/main"]
