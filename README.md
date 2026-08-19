# stellarnotify-backend

> Event ingester, webhook dispatcher, in-app broadcaster, and REST API for StellarNotify.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-20-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)

## Overview

The StellarNotify backend bridges the on-chain subscription registry
(Soroban contract) with the real world. It:

1. **Ingests** Soroban events from the Stellar RPC continuously,
   past the 7-day `getEvents` window using a persistent ledger cursor.
2. **Routes** events to the correct subscribers using the on-chain watcher index.
3. **Dispatches** notifications via three channels:
   - **Webhook** — HTTP POST with retry and exponential back-off.
   - **In-App** — Redis pub/sub → Server-Sent Events stream.
   - **On-Chain** — Submits a Stellar transaction re-emitting the event.
4. **Exposes** a REST API for subscription management and notification history.

## Quick start

```bash
cp .env.example .env      # fill in your values
npm install
psql $DATABASE_URL < src/db/migrations/001_initial.sql
npm run build
npm start
```

For development with hot reload:

```bash
npm run dev
```

## License

[MIT](LICENSE) © 2026 StellarNotify Contributors
