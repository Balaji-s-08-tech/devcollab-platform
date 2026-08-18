# RBAC, Search, and AI Implementation Map

## RBAC

Roles are ranked as `owner > admin > member > viewer > guest`.

Permission inheritance:

- Organization membership or direct grant
- Workspace membership or direct grant, optionally inheriting organization role
- Project owner/member role or direct grant
- Document/issue/board direct grants

Core files:

- `server/constants/roles.js`
- `server/models/Organization.js`
- `server/models/Workspace.js`
- `server/models/PermissionGrant.js`
- `server/models/Invite.js`
- `server/models/ShareLink.js`
- `server/permissions/ability.js`
- `server/permissions/rbacService.js`
- `server/middleware/permissions.js`
- `server/routes/permissions.js`
- `server/routes/share.js`

APIs:

- `GET /api/permissions/effective?resourceType=document&resourceId=...`
- `POST /api/permissions/grants`
- `PATCH /api/permissions/grants`
- `DELETE /api/permissions/grants`
- `POST /api/permissions/invites`
- `POST /api/permissions/invites/accept`
- `POST /api/permissions/share-links`
- `GET /api/share/:token`

## Search

Meilisearch stores one combined index, default `devcollab`, with a `type` facet for `document`, `issue`, `board`, `user`, and `comment`.

Run:

```bash
cd server
npm run search:reindex
```

Core files:

- `server/config/meilisearch.js`
- `server/services/searchIndexService.js`
- `server/controllers/searchController.js`
- `server/scripts/reindex-search.js`
- `client/src/components/common/SearchModal.jsx`

## AI

The AI layer uses OpenAI by default with `AI_MODEL=gpt-4o` and `AI_EMBEDDING_MODEL=text-embedding-3-small`. Non-streaming jobs run through BullMQ. Document Q&A streams over SSE.

Run the worker:

```bash
cd server
npm run worker:ai
```

Core files:

- `server/models/AIDocumentChunk.js`
- `server/models/AIJob.js`
- `server/config/aiQueue.js`
- `server/services/ai/openaiProvider.js`
- `server/services/ai/ragService.js`
- `server/services/ai/aiService.js`
- `server/workers/aiWorker.js`
- `server/routes/ai.js`
- `client/src/components/AI/AIAssistantSidebar.jsx`

Required secrets:

- `OPENAI_API_KEY`
- `MEILI_HOST`
- `MEILI_MASTER_KEY`
- `REDIS_URL`
