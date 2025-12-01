# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed with `pnpm`; workspace roots defined in `pnpm-workspace.yaml`.
- Core code lives under `packages/`: `core` (DDD primitives), `runtime` (builder/lifecycle), `cli` (scaffolding), `plugins` (db/http/messaging/observability/security), `providers` (AI/DI/config), `libraries`, and `testing`.
- Source files live in each package’s `src/`; unit tests sit beside code in `src/__tests__` with `*.test.ts`. Docs are in `docs/website`, shared assets in `public/`.

## Build, Test, and Development Commands
- `pnpm install` — install workspace dependencies.
- `pnpm build` / `pnpm build:fast` — build all packages (fast skips serialized concurrency).
- `pnpm typecheck` — strict TypeScript checks across the workspace.
- `pnpm lint` — run ESLint.
- `pnpm test` — run Vitest suites for every package; scope with `--filter <package>` if needed.
- `pnpm docs:serve` — serve generated API docs locally on :8080.

## Coding Style & Naming Conventions
- TypeScript (ESM) targeting Node 18+; strict typing on.
- Formatting: 2-space indent, semicolons off, single quotes; enforced by ESLint/Prettier.
- Naming: classes PascalCase; functions/vars camelCase; constants UPPER_SNAKE_CASE. Domain patterns use `Entity`, `AggregateRoot`, `ValueObject`, `Repository`, and CQRS handlers.
- Keep packages publishable: avoid cross-package relative imports; prefer workspace package names.

## Testing Guidelines
- Framework: Vitest with V8 coverage available. Tests belong in `src/__tests__`, named `*.test.ts`.
- Prefer deterministic, in-memory fakes (no live network/services). Use helpers under `testing` or `runtime`.
- Add coverage for domain rules, plugin lifecycle edges, and error paths; follow Given/When/Then names in test blocks when helpful.
- Run `pnpm test --filter <package>` for scoped checks; `pnpm test -- --coverage` for coverage.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), imperative mood, optional scopes (`fix(runtime): handle lifecycle errors`).
- PRs should short description of changes.
- Keep diffs small and focused; include tests or justify missing coverage when behavior changes.
