# Workspace Rules

## Backend Architecture & Organization
For the backend (`apps/server`), we adhere to a clean separation of concerns. Whenever adding new files or features, place them in their respective categorized folders rather than dumping them in the root directory.

The standard folder structure includes:
- `db/`: Database configuration, schemas, migrations, and connections.
- `handlers/`: Request handlers, controllers, and API endpoint logic.
- `middleware/`: Custom Express/server middleware functions.
- `services/`: Business logic, orchestrations, and complex operations independent of handlers.
- `sdks/`: Third-party SDK initializations and wrappers.
- `utils/`: Reusable helper functions and generic utilities.
- `validators/`: Input validation schemas and logic (e.g., Zod, Joi).

Ensure that any new modules created in the future follow this organizational structure.

## Frontend Architecture & Organization
For the frontend (`apps/web`), we follow a clear separation of concerns within the `src/` directory.

The standard folder structure includes:
- `assets/`: Static assets like images, SVGs, and fonts used in the source code.
- `components/`: Reusable React components (UI elements, layout components).
- `constants/`: Global constant values and configuration variables.
- `hooks/`: Custom React hooks (composables) for reusable logic.
- `lib/`: Third-party library initializations, configurations, and wrappers.
- `services/`: API client calls and external service integrations.
- `store/`: Global state management setups.
- `types/`: Shared TypeScript type definitions and interfaces.
- `utils/`: Reusable pure helper functions.

Ensure that new frontend code follows this organizational structure.
