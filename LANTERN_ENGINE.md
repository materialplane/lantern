# LANTERN ENGINE: API Contract & Data Templates

This document serves as the technical specification for any AI agent interacting with the Lantern GDD Engine. Use these templates and endpoints to maintain a foolproof, modular data structure.

---

## 1. DATA MODELS

### Entry Intent (`intent.json`)
Every Node must follow this exact JSON schema.
```json
{
  "id": "unique_system_id",
  "name": "Display Name",
  "description": "A high-level plain-English summary of the system intent.",
  "status": "IDLE" | "AI_PROCESSING_REQUESTED" | "COMPLETED",
  "x": 0,
  "y": 0,
  "type": "village" | "castle" | "ruin" | "shrine" | "portal",
  "image_url": "String (Optional)",
  "sections": [
    {
      "title": "SECTION HEADER",
      "level": 1 | 2 | 3 | 4 | 5 | 6,
      "parameters": [
        { "name": "Parameter Name", "value": "Detailed behavioral description." }
      ]
    }
  ]
}
```

### Technical Documents (`.md` files)
*   **Definitions (`definitions.md`):** Table of variables, types, and defaults.
*   **Blueprints (`blueprints.md`):** Step-by-step logic flow.
*   **Architecture (`architecture.md`):** System dependencies and game-loop integration.
*   **Schema (`schema.md`):** Data structure or database requirements.

---

## 2. API ENDPOINT REFERENCE

### Automation & Discovery (CRITICAL)
*   **`GET /api/handbook`**: Fetch this manual as plain text. (Onboarding Endpoint)
*   **`GET /api/manifest`**: Returns a complete inventory of all entries across all containers. Use this for full project audits.
*   **`GET /api/work-queue`**: Returns a list of all entries where `status` is `AI_PROCESSING_REQUESTED`.
*   **`GET /api/search?q=keyword1,keyword2`**: Global high-performance search across all files. Returns relevance-sorted matches with snippets.

### Container Management
*   **`GET /api/containers`**: Lists all active containers + metadata.
*   **`POST /api/containers`**: Initialize a new container.
    *   *Payload:* `{ "name": "String", "image_url": "String (Optional)" }`
*   **`POST /api/containers/:id/meta`**: Update metadata (name, image_url).
*   **`DELETE /api/containers/:id`**: Recursive deletion.

### Node (Entry) Management
*   **`GET /api/containers/:containerId/entries`**: Lists all nodes in a container.
*   **`POST /api/containers/:containerId/entries`**: Initialize or deploy a new node.
    *   *Payload:* Supports full `intent.json` structure (name, description, status, sections). 
    *   *Example:* `{ "name": "X", "status": "AI_PROCESSING_REQUESTED", "sections": [...] }`
*   **`DELETE /api/entries/:container/:entry`**: Recursive deletion.
*   **`POST /api/entries/move`**: Move an entry between containers.

### Data Synchronization
*   **`POST /api/entries/:containerId/:entryId/intent`**: Synchronize user intent.
*   **`POST /api/entries/:containerId/:entryId/docs/:docType`**: Update technical pages.
*   **`POST /api/upload`**: Upload hero images (form-data, key: "image").

## 3. AI OPERATIONAL WORKFLOW (FOOLPROOF)

### CRITICAL QUALITY RULE: THE 5-NODE BATCH LIMIT
To prevent "AI Quality Drain" and ensure mathematical precision, any AI agent interacting with this engine **MUST NOT** process more than **5 entries** in a single execution turn. 

1.  **Check the Queue:** Call `GET /api/work-queue`.
2.  **Process Batch:** Select the first 5 items from the queue.
3.  **Process Node:** For each item in the batch:
    *   Fetch intent: `GET /api/entries/:container/:entry`.
    *   Generate logic for Definitions, Blueprints, Architecture, and Schema.
    *   Save logic: `POST /api/entries/:container/:entry/docs/:docType`.
    *   Update Status: `POST /api/entries/:container/:entry/intent` with `status: "COMPLETED"`.
4.  **Handoff:** Report completion of the 5 nodes and wait for the user to verify or request the next batch.
