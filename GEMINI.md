# LANTERN: Project Mandates & Documentation

## 1. VISION & CORE PURPOSE
**Lantern** is a modular Game Design Engine built to act as the single source of truth for the project wiki (900+ pages). It is designed to scale to hundreds of categories (Containers) and thousands of entries (Nodes) while maintaining a strict separation between **User Intent** (Plain English) and **Technical Implementation** (AI-Generated Markdown).

## 2. ARCHITECTURAL MANDATES

### The "Intent-First" Hierarchy
1.  **Containers:** High-level buckets for systems (e.g., "Combat Mechanics").
2.  **Nodes (Entries):** Specific systems within a container (e.g., "Damage Types").
3.  **World Engine (Spatial):** A visual coordinate-based layer for mapping nodes to the physical world.

### The Document Stack
Every Node MUST have the following structure:
*   `intent.json`: **USER DOMAIN.** Plain-English design goals and settings.
*   `definitions.md`: **AI DOMAIN.** Extracted code logic, variables, and constants.
*   `blueprints.md`: **AI DOMAIN.** Step-by-step logic and rules.
*   `architecture.md`: **AI DOMAIN.** System integration overview.
*   `schema.md`: **AI DOMAIN.** Database and data structures.

### UI Standards (STRICT)
*   **NO BROWSER PROMPTS:** Never use `window.prompt()` or `window.confirm()`. All user input, confirmations, and destructive actions MUST be handled via integrated, styled React modals or inline fields.
*   **Hero-Card Dashboard:** The dashboard must remain a visual, card-based interface with high-quality aesthetics (Navy/Slate palette).
*   **Drill-Down Workflow:** Navigate from Dashboard (Global) -> Container (Context) -> Node (Technical).

## 3. SYSTEMS-FIRST DOCUMENTATION (MANDATORY)
The documentation in Lantern must adhere to a **Modular Subsystem Architecture**. The GDD is not just a collection of pages, but a registry of autonomous design modules.

### Core Principles:
- **Design Encapsulation:** All game systems must be partitioned into dedicated, autonomous Containers (Subsystems). Each Container acts as the definitive design module for its domain (e.g., Navigation, Combat, Transportation).
- **API-Driven Registry:** Interaction with the GDD registry MUST occur exclusively through the Lantern API. AI agents and external tools treat these documentation modules as "black boxes" that serve specific design data.
- **Documentation Sovereignty:** A Container is the sole, absolute authority over its design domain. Cross-system duplication is forbidden. For example, if the *Transportation* container defines travel math, the *Combat* container must reference that math via documentation links or API calls rather than redefining it.
- **Implementation-Agnostic Logic:** Documentation must focus on pure mathematical rules, behavioral logic, and data structures. It must remain agnostic of the specific visual representation or the final game engine (e.g., Unity, Unreal) that will eventually consume the design.

## 4. TECHNICAL SPECIFICATIONS

### Project Structure
*   **Client (UI):** `/gdd-studio/client/src/App.jsx` (React + Vite)
*   **Server (API):** `/gdd-studio/server/server.js` (Node/Express)
*   **Data Store:** `/gdd-studio/data/` (Pure JSON/Markdown file system)
*   **World Engine:** `/gdd-studio/client/public/tiles/` (Spatial tile-map assets)
*   **Logs:** `/logs/` (API and UI logs)

### Server Management
All server lifecycle actions MUST go through the `manager.sh` wrapper.
*   `./manager.sh start`: Starts API (3001) and UI (3000) using `setsid` and `nohup` for persistence.
*   `./manager.sh stop`: Surgically kills processes on ports 3000 and 3001.
*   `./manager.sh status`: Checks the health of both services.

### API Endpoints
*   `GET /api/containers`: List all containers + metadata.
*   `GET /api/containers/:id/entries`: List nodes in a container.
*   `GET /api/entries/:container/:entry`: Fetch intent + all markdown docs.
*   `POST /api/entries/:container/:entry/intent`: Update the user intent.
*   `POST /api/entries/:container/:entry/docs/:type`: Update AI-generated tech docs.
*   **Spatial Support:** Registry nodes can include `x`, `y`, and `type` fields for World Engine integration.

## 5. AI OPERATIONAL PROTOCOL
*   **NEVER "Vibe Code":** Do not add features or modify UI elements without confirming they align with the Hero-Card/Intent-First architecture.
*   **Audit Before Implementing:** Check existing `data/` structures before proposing changes.
*   **Protect the Wiki:** Lantern is a local staging environment. No data should be pushed to the external Wiki API until a specific "Sync" directive is given.
