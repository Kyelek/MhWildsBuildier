# Monster Hunter Wilds Builder — Instructions for Claude Code

<project_info>
- Name: Monster Hunter Wilds Builder
- Stack: Angular (TypeScript strict mode), SCSS / CSS Variables
- Purpose: Web application for building and optimizing armor sets, weapons, and skills using Monster Hunter API data.
- Language: Primary language for conversation, comments, and code naming (where appropriate) is Spanish.
</project_info>

<commands>
- Dev Server: `ng serve` (runs on http://localhost:4200)
- Build: `ng build`
- Production Build: `ng build --configuration production`
- Tests: `ng test`
- Lint: `ng lint`
</commands>

<architecture_and_framework>
- Component Architecture: Use Angular Standalone Components. Avoid legacy NgModules unless necessary.
- Control Flow: Use modern Angular control flow syntax (`@if`, `@for`, `@switch`) instead of structural directives (`*ngIf`, `*ngFor`).
- Reactive State: Prefer Angular Signals or RxJS (`BehaviorSubject`, `Observable`) for state management and async data streams.
- Models & Typing:
  - TypeScript strict mode enabled. Do NOT use `any`.
  - All API data structures (Armor, ArmorSets, Skills, Weapons, Decorations) must be strictly typed under `src/app/models/` or `src/app/core/models/`.
  - Ensure clear separation between API responses and internal app models if transformation is needed.
- Services & HTTP:
  - Keep business logic and API HTTP calls inside dedicated services (`Injectable({ providedIn: 'root' })`).
  - Use `HttpClient` with RxJS operators (`map`, `catchError`, `switchMap`, `forkJoin`) for handling API relationships.
</architecture_and_framework>

<ui_and_design_system>
- Style System: Maintain absolute visual consistency with the existing application theme (dark/game-inspired UI).
- Theme Variables: Respect and reuse CSS/SCSS variables defined in `src/styles.scss` or global assets.
- No Unapproved UI Libraries: Do NOT introduce external UI frameworks (e.g., Angular Material, Bootstrap, Tailwind) unless explicitly requested. Reutilize existing custom components in `src/app/shared/`.
- Responsive Design: Ensure layouts are fully responsive across desktop, tablet, and mobile breakpoints.
</ui_and_design_system>

<agent_guidelines>
- Language & Communication:
  - Responde, explica y comunícate siempre en español castellano.
  - Escribe en español los comentarios de código, descripciones de funciones, mensajes de commit y la interfaz de usuario.
  - Manten las variables, métodos e interfaces en castellano (o en inglés si el proyecto existente ya sigue ese convenio), garantizando consistencia total con el código existente.
- Code Inspections First: Inspect existing components, models, and services before creating new ones to maintain consistent naming and folder structure.
- Explanations Before Edits: Provide a brief summary of planned architectural or file changes before making extensive code modifications.
</agent_guidelines>

<git_workflow>
- Vivimos en `desarrollo`: es la rama base de la que sale todo el trabajo nuevo y a la que vuelve.
- Para cualquier tarea nueva, crea una rama a partir de `desarrollo` (`git checkout -b <nombre-rama> desarrollo`). No trabajes con commits directamente en `desarrollo` salvo que el usuario pida explícitamente lo contrario para un cambio puntual.
- Cuando el trabajo de esa rama funcione, fusiónala de vuelta en `desarrollo` y súbela a origin.
- `master` es producción. Nunca fusiones ni subas nada a `master` sin que el usuario lo pruebe primero en `desarrollo` y dé la orden explícita de subirlo.
- No dejes cabos sueltos: cuando una rama de feature quede fusionada, borra la rama local (y ofrece borrar la remota) y elimina cualquier worktree que se haya usado para ella.
</git_workflow>