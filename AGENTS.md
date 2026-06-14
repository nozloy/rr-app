# Project instructions for Codex

## Validation policy

Do not run production builds automatically.

By default, avoid running:

- `npm run build`
- `pnpm build`
- `yarn build`
- `next build`
- `docker build`
- `docker compose build`
- any command that performs a full production build

A full build is expensive and should only be executed when the user explicitly asks for it.

## Preferred checks

For ordinary code changes, prefer lightweight validation:

- TypeScript/type checks if available:
  - `npm run typecheck`
  - `pnpm typecheck`
  - `tsc --noEmit`

- Linting if available:
  - `npm run lint`
  - `pnpm lint`

- Targeted tests if they exist:
  - run only the relevant test file or package

- Static review of changed files

## UI Guidelines

- Prefer shadcn/ui components for visible UI patterns instead of building custom equivalents from scratch.
- If a list, panel, sidebar, dropdown, or any other container is expected to scroll, wrap it in shadcn `ScrollArea`.
- Prefer Tailwind utility classes in `className` for styling.
- Use `src/app/globals.css` only when Tailwind cannot express the style cleanly or when a rule is repeated widely enough to justify a shared global definition.
- Keep each UI module in its own `.tsx` file. A module is a distinct UI section, panel, or feature block, such as "Event Preview" or "Paid Slots". Modules may compose shared reusable components for common controls, layout primitives, and repeated UI pieces.

Before running any expensive command, explain why it is needed and ask for confirmation.

## When build is allowed

Run a full build only if one of these conditions is true:

1. The user explicitly says: "run build", "сделай билд", "проверь билдом", or similar.
2. The task directly concerns build configuration, Dockerfile, deployment, Next.js production output, Prisma generation during build, or CI/CD.
3. A lightweight check cannot reasonably validate the change, and the user confirms the build.

## Final response

In the final answer, always mention:

- what files were changed;
- what checks were run;
- if build was skipped, explicitly say: "Full build was skipped according to project instructions."
