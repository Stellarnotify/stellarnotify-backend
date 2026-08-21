# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-08-20

### Added
- Initial project scaffold (package.json, tsconfig, folder structure)
- Zod-validated config module with typed env schema
- Winston JSON logger with colourised development output
- Shared TypeScript types: Subscription, NotificationRecord, SorobanEvent, WebhookPayload
- PostgreSQL client with singleton pool, connectDb(), closeDb()
- DB migration 001: subscriptions, notifications, ingest_cursor, endpoint_registry tables
- DB migration 002: index on notifications.created_at
- subscriptionRepo: upsertSubscription, deactivate, getActiveByContract, getByOwner, getById
- notificationRepo: createNotification, getPending, markDelivered, markFailed, markRetrying
- eventIngester: Stellar RPC getEvents polling and event parsing
- Ingest cursor persistence: read/write last_ledger to DB, resume on restart
- Topic filter matching: skip notifications when event topics don't match subscription filters
- webhookClient: isolated HTTP POST delivery via axios
- webhookDispatcher: delivery with exponential back-off retry and permanent failure handling
- Redis publisher client with singleton, publish(), closePublisher()
- inAppBroadcaster: Redis pub/sub publish for InApp channel notifications
- onChain re-emit worker: submit Stellar transaction for OnChain channel
- Express app factory with global error handler, 404 handler, request logger
- requireApiKey middleware: Bearer token auth for protected routes
- Request logging middleware: method, path, status, duration
- GET /health: DB connectivity check and status response
- POST /api/subscriptions/endpoints: register webhook URL with Zod validation
- GET /api/subscriptions/by-owner/:owner
- GET /api/subscriptions/by-contract/:contractId
- GET /api/subscriptions/:id
- DELETE /api/subscriptions/:id
- GET /api/notifications/by-subscription/:id (paginated)
- GET /api/notifications/failed
- GET /api/notifications/:id
- GET /sse/:subscriptionId: EventSource endpoint with Redis subscriber per connection
- SSE keep-alive ping every 20s
- Graceful shutdown: drain workers, close DB/Redis before process exit
- src/index.ts entry point wiring all services
- Unit tests: subscriptionRepo, notificationRepo, webhookDispatcher, eventIngester (topic filter)
- Integration tests: GET /health, POST /api/subscriptions/endpoints, GET /api/subscriptions/by-owner
- Multi-stage Dockerfile for production builds
- MIT License

### Fixed
- SSE cleanup on client disconnect (unsubscribe error handling)
- Content-Type: application/json enforced on all error responses
- Bumped axios to 1.19.0 and express to 4.22.2 to resolve security advisories
