# Flexible LLM Provider Configuration — Design

Date: 2026-11-03
Status: Approved in principle; pending final spec review
Scope: Minimal useful core

## 1. Problem

AgroLedger's AI integration (`backend/src/ai/`) resolves its LLM target from
environment variables only (`backend/src/ai/llm.config.ts`: `LLM_PROVIDER`,
`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`) and supports exactly two hardcoded
protocols (`openai` via the `openai` SDK, `gemini` via `@google/genai`).

Switching providers, gateways, or models therefore requires editing environment
variables and restarting the application. The application is locked to whichever
single provider the operator wired in at deploy time.

## 2. Goal

Users configure, test, switch, and manage LLM providers and models from the
application Settings interface, without editing source code or environment
variables.

Supported in this iteration:

- Any OpenAI-compatible endpoint (9Router, OpenRouter, OpenAI, DeepSeek, Qwen,
  self-hosted gateways) through a user-supplied Base URL.
- Gemini, through its own protocol adapter.
- Multiple providers; multiple models per provider.
- Provider/model selection as the default, changing live without a restart.
- Connection testing before saving, and for saved providers.
- The existing rubber-note scan feature uses the selected provider.

Explicitly **not** in this iteration (no abstractions built for them):

- Anthropic adapter.
- Task-specific / per-feature model routing.
- Provider presets beyond Base URL prefill.
- Authentication or authorization for these endpoints (see §12).
- Automated tests (see §11).
- Migration of existing environment configuration into the database (see §9).

## 3. Context and constraints

- `docs/clean-architecture.md` is binding project policy. Use cases own
  orchestration; inner layers own the interfaces they need; adapters and
  framework wiring sit at the edge; the composition root wires concrete
  implementations; no god services; no generic `utils` dumping grounds.
- `AGENTS.md` §13 forbids unnecessary abstractions, mock data, faked responses
  and blind refactoring. §11 requires authoritative financial/business logic to
  stay server-side, and DTO validation plus existing module structure to be used.
- AgroLedger is a **local-only, single-user** application in this iteration.
  It is not publicly deployed and has no authentication module (a known,
  documented gap in `AGENTS.md` §12). This design does not introduce
  authentication.
- Local-only status does **not** justify weakening protection of API keys,
  secret redaction, Base URL validation, or SSRF prevention. Those remain.
- The only AI-dependent feature in production use today is the rubber-note scan:
  `POST /ai/scan/rubber-note` (`backend/src/ai/ai.controller.ts`), called from
  `lib/api.ts` (`scanRubberNote`) and rendered by
  `components/settlement/RubberNoteScan.tsx`. `README.md` notes the AI module is
  otherwise not used in the production flow.
- The Settings page already exists (`app/settings/page.tsx`) with one business
  rule field (default Sawit commission), served by
  `backend/src/settings/`. The `Setting` table is a plain key/value store.
- `GET /ai/config` and `GET /ai/test` already exist on `AiController`.
- Prisma 7 with the `prisma-client` generator (output `../src/generated/prisma`)
  and a MariaDB driver adapter (`@prisma/adapter-mariadb`), configured in
  `backend/src/prisma/prisma.service.ts`. MySQL provider, migrations in
  `backend/prisma/migrations`.
- No Prisma `Json` field exists in the schema yet; MySQL supports it.

## 4. Architecture placement

A new feature module, `backend/src/llm/`, structured along the project's
documented layering. No existing module is refactored for style.

```
backend/src/llm/
  domain/
    llm-protocol.ts          protocol union + guard
    llm-provider.ts          provider/model domain shapes, invariant helpers
    base-url.rules.ts        pure syntax validation; pure address classification
  application/
    ports.ts                 LlmProviderRepository, SecretCipher, GuardedTransport, LlmClient
    models.ts                request/output models owned by the application layer
    use-cases/
      list-providers.use-case.ts
      create-provider.use-case.ts
      update-provider.use-case.ts
      delete-provider.use-case.ts
      activate-provider.use-case.ts
      test-provider.use-case.ts        saved provider
      test-unsaved-provider.use-case.ts unsaved form config
      resolve-active-llm.use-case.ts    used by the scan feature
  infrastructure/
    prisma-llm-provider.repository.ts  implements LlmProviderRepository
    aes-gcm-secret.cipher.ts           implements SecretCipher
    guarded-transport.ts               implements GuardedTransport (DNS + IP + redirects + timeout)
    adapters/openai-compatible.adapter.ts
    adapters/gemini.adapter.ts
    adapter-registry.ts                protocol -> LlmClient (exhaustive)
  interface/
    llm-providers.controller.ts
    dto/
    provider.presenter.ts
  llm.module.ts                        composition root
```

`backend/src/ai/ai.service.ts` stops constructing SDK clients. It keeps its
rubber-note prompt and its extraction validation/worker-matching behaviour, and
obtains its LLM call through `ResolveActiveLlmUseCase` (an `LlmClient` plus the
resolved model).

## 5. Data model

New migration `add_llm_providers`:

```prisma
model LlmProvider {
  id              Int       @id @default(autoincrement())
  name            String
  protocol        String                     // member of LLM_PROTOCOLS
  baseUrl         String
  apiKeyEnc       String?                    // AES-256-GCM payload; null = no credential
  customHeaders   Json?
  timeoutMs       Int       @default(60000)
  enabled         Boolean   @default(true)
  isActive        Boolean   @default(false)
  lastTestStatus  String?                    // "OK" | "FAILED"; null = never tested
  lastTestAt      DateTime?
  lastTestMessage String?                    // redacted, length-capped
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  models LlmModel[]
}

model LlmModel {
  id          Int     @id @default(autoincrement())
  providerId  Int
  modelId     String                        // exact upstream model identifier
  displayName String?
  params      Json?                         // temperature, maxTokens, topP, ...
  isDefault   Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  provider LlmProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@unique([providerId, modelId])
}
```

Models are edited only as part of a provider payload (nested create/update).
There are no separate model endpoints.

## 6. Invariants

Enforced inside a Prisma transaction by the owning use case:

1. At most one provider has `isActive = true`. It is impossible to have two.
2. The active provider must have `enabled = true`. Activating a disabled
   provider either enables it first (rejected) — the use case refuses and the
   caller must enable it explicitly.
3. Exactly one model under the active provider has `isDefault = true`, and it
   belongs to the active provider.
4. Activating provider B sets B's chosen (or first) model as default and clears
   A's `isActive` and default-model flags in the same transaction.
5. Disabling or deleting the active provider requires the request to name a
   replacement enabled provider, or explicitly clear active. The system never
   silently leaves a dangling active flag pointing at a disabled provider.
6. Zero active providers is legal and means "no database configuration"
   (see §9).
7. `LlmModel` rows are unique per `(providerId, modelId)`.
8. A provider with `apiKeyEnc = null` is legal.

## 7. Protocol typing

```ts
export const LLM_PROTOCOLS = ['openai', 'gemini'] as const;
export type LlmProtocol = (typeof LLM_PROTOCOLS)[number];
export function isLlmProtocol(value: string): value is LlmProtocol;
```

- DTO validation: `@IsIn(LLM_PROTOCOLS)`.
- The database column is `String` (Prisma enums would require a migration for
  every future protocol), but values are read back through `isLlmProtocol`.
  A row with an unrecognised protocol is treated as a configuration error at
  resolution time, reported loudly, never cast.
- Adapter lookup is an exhaustive `Record<LlmProtocol, LlmClient>`, so adding a
  protocol later is one union member plus one registry entry, and the compiler
  names every site that must change.

## 8. Credential handling

### 8.1 How a key enters and leaves

- **Inbound:** plaintext API key arrives in the create/update request DTO. This
  is the only accepted way to supply a key.
- **In the application layer:** the key is an opaque `string | null`. It is
  never parsed, compared, transformed for display, or logged.
- **At rest:** encrypted with AES-256-GCM before reaching the repository. No
  plaintext key is ever persisted.
- **Outbound to client:** never returned. Not in a provider payload, not in a
  test result, not in an error message. Responses expose `hasApiKey: boolean`
  only — no preview, no length, no last-4, no ciphertext.
- **Logs:** a redaction step removes `apiKey`, `authorization`, `x-api-key` from
  anything logged about outbound requests or provider payloads.
- **Update semantics:** field omitted = unchanged; explicit `null` = clear the
  key; a string = replace and re-encrypt.

### 8.2 Encryption

`AesGcmSecretCipher` using `node:crypto` only (no new dependency):

- Master secret from `LLM_ENCRYPTION_KEY` (32 bytes, hex or base64).
- Random 12-byte IV per encryption; stored payload carries version, IV, auth
  tag, and ciphertext.
- Tampering or a wrong master key fails the auth tag and surfaces as a
  configuration error — never as a silently empty key.
- If `LLM_ENCRYPTION_KEY` is absent, saving a provider **with** a key is
  refused with a clear message. Providers without keys remain saveable, since
  keyless endpoints are supported (§8.3).

### 8.3 Keyless providers

Providers whose endpoint requires no authentication are supported: `apiKeyEnc`
is nullable and no `Authorization` header is sent. Test Connection
distinguishes "no credential configured" from "credential rejected"
(401/403), so the two situations never share a message.

## 9. Resolution order

`ResolveActiveLlmUseCase` decides the LLM target for a call:

1. If an active, enabled provider exists in the database, it is used — full stop.
2. Otherwise, the legacy environment configuration is used, exactly as
   `llm.config.ts` does today.

There is **no silent environment fallback** when an active provider exists but is
unusable. If decryption fails, the protocol is unrecognised, the model is
missing, or a key is required but absent, the call fails loudly with a
configuration error naming the provider. Falling back would make a broken
provider look healthy and send traffic to an endpoint the user did not choose.

`GET /ai/config` reports which source is in effect, the provider name, the base
URL, the model, and `hasApiKey`.

Existing environment configuration is not auto-migrated into the database. The
operator configures a provider through the UI when they want one.

## 10. Outbound network enforcement

`GuardedTransport` is the only path by which adapters reach the network. It is
declared as an interface in `application/ports.ts` and implemented in
`infrastructure/guarded-transport.ts`.

Responsibilities:

- Resolve the Base URL hostname, then validate the **resolved IP** against the
  domain address classifier — defeating DNS rebinding toward a blocked address.
- Send with **redirects disabled**. A 3xx response is returned as a failure and
  never followed. This is enforcement, not a documented limitation.
- Pin the connection to the validated IP so a second resolution cannot swap the
  target.
- Apply `timeoutMs` as an abort signal.
- Reject non-`http(s)` schemes and blocked addresses, with redacted errors.

### 10.1 Domain-pure validation rules

`domain/base-url.rules.ts` contains pure functions only — no DNS lookups, no
sockets, no `fetch`:

- `validateBaseUrlSyntax(url, { allowInsecure })` — scheme must be `https`;
  `http` allowed only for loopback/private-LAN hosts when
  `LLM_ALLOW_INSECURE_URLS=true`; rejects `0.0.0.0`, non-http(s) schemes,
  malformed URLs, and embedded credentials.
- `isBlockedAddress(ip)` — pure classification of an address string: link-local
  `169.254.0.0/16` (cloud metadata), unspecified, multicast, and other
  non-routable ranges that must never be a request target.

DNS resolution and connection enforcement live in `guarded-transport.ts` in the
infrastructure layer, not in the domain.

### 10.2 Adapter constraint

Adapters receive the transport through the execution context and do not
construct their own HTTP clients. The OpenAI SDK accepts an injected fetch
implementation, so the OpenAI-compatible adapter routes through
`GuardedTransport`. For `@google/genai`, the supported injection point must be
confirmed at implementation time; if the Gemini SDK cannot be pinned to the
guarded transport, the Gemini adapter is not shipped in this iteration rather
than being left on an unguarded path.

## 11. Verification approach

Per the operator's instruction for this iteration, **no automated tests, test
suites, or test infrastructure are created**, and no existing test suites are
run as part of this work. Verification is manual, performed by the operator,
against the checklist in §13.

Consequently the following are review obligations rather than test-enforced
guarantees, and the implementation must keep them visible in code review:

- The address classifier and URL validation rules.
- Cipher round-trip and tamper behaviour.
- Absence of key material in every response shape and log path.

## 12. Security posture for provider-management endpoints

AgroLedger is local-only and single-user in this iteration. No authentication
or authorization mechanism is introduced for these endpoints, and none is
implied.

- Existing CORS configuration in `backend/src/main.ts` already restricts browser
  origins to `http://localhost:3000`; it is not modified.
- No deployment configuration, bind-address change, reverse-proxy guidance, or
  deployment-specific security setting is added by this work.
- The retained protections are those that protect the operator's own
  credentials and network position, and they are unrelated to multi-user access
  control: API key encryption at rest, response-side omission of key material,
  log redaction, Base URL syntax validation, and SSRF prevention on outbound
  connections.
- `AGENTS.md` §12 records the missing JWT/authorization layer as known,
  unresolved debt. This feature neither fixes nor worsens it. When real
  authentication is later introduced, these routes are expected to be covered by
  it.

## 13. Manual testing checklist

Performed by the operator after implementation.

### Provider configuration

- [ ] Settings shows an "AI / LLM Providers" section alongside the existing
      commission rule, and the commission rule still works.
- [ ] Add a provider (name, protocol, Base URL, API key, model id) and it
      appears in the list.
- [ ] Add a provider with no API key; it saves and reports `hasApiKey: false`.
- [ ] Add a second model under an existing provider.
- [ ] Edit a provider's name, Base URL, and model id; changes appear after save.
- [ ] Disable a provider; it is visibly disabled.
- [ ] Delete a provider; it disappears and its models go with it.
- [ ] Invalid input is rejected with a readable message: malformed Base URL,
      `http://` to a public host without `LLM_ALLOW_INSECURE_URLS`, unknown
      protocol value, empty model id.

### Connection testing

- [ ] Test Connection on an unsaved form configuration works without saving.
- [ ] Test Connection on a saved provider works.
- [ ] Testing a specific model within a provider works.
- [ ] A good configuration reports success; a wrong API key reports an
      authentication error; a wrong Base URL reports a connectivity error;
      an unknown model id reports a model error. The three are distinguishable.
- [ ] A provider that was never tested does not display as connected.
- [ ] After a successful and after a failed test, the last-test status and
      timestamp persist and are visible after reloading the page.

### Provider switching

- [ ] Setting a provider as default makes it the active one, and the previous
      one is no longer marked active.
- [ ] Switching providers does not require restarting the backend or editing
      environment variables.
- [ ] The active provider's default model is shown, and switching to a
      different model in that provider takes effect.
- [ ] Activating a provider that is disabled is refused with a clear message.
- [ ] Deleting or disabling the active provider without naming a replacement is
      refused with a clear message.
- [ ] With no provider configured, `GET /ai/config` reports environment
      configuration and the system behaves as it did before this change.
- [ ] An active provider with a broken configuration fails loudly with a
      provider-naming error, and does **not** silently fall back to
      environment configuration.

### API key handling

- [ ] After saving a provider, no response body anywhere (provider list,
      provider detail, test result, `/ai/config`) contains the API key or any
      fragment of it — only `hasApiKey: true`.
- [ ] The key is not present in browser storage, application logs, or backend
      console output.
- [ ] The database row stores a ciphertext payload for `apiKeyEnc`, not the key.
- [ ] Omitting the key field when editing leaves the stored key unchanged
      (the provider still works).
- [ ] Saving a provider with a key while `LLM_ENCRYPTION_KEY` is unset is
      refused with a clear message.
- [ ] A keyless provider sends no `Authorization` header (verified against a
      local endpoint that rejects unexpected auth).

### Base URL and SSRF protections

- [ ] A Base URL pointing at `169.254.169.254` is rejected.
- [ ] A Base URL whose hostname resolves to a blocked address is rejected at
      request time.
- [ ] A Base URL that responds with a redirect is not followed, and reports a
      failure instead.
- [ ] A non-`http(s)` scheme is rejected.
- [ ] A self-hosted LAN endpoint (e.g. `http://192.168.x.x:port/v1`) works when
      `LLM_ALLOW_INSECURE_URLS=true` and is rejected when it is not.

### Rubber-note scanning

- [ ] `POST /ai/scan/rubber-note` still returns the same response shape
      (`workers[]` with `name`, `pieces`, `weightKg`, and fuzzy `matches`).
- [ ] Scanning works through a configured OpenAI-compatible provider.
- [ ] Scanning works through a configured Gemini provider.
- [ ] Scanning works through the legacy environment configuration when no
      provider is active.
- [ ] Extraction validation behaviour is unchanged: invalid JSON, malformed
      `workers`, and all-null worker rows still fail with the same kinds of
      messages as before.
- [ ] Sawit/Karet business rules elsewhere in the application are unaffected.

## 14. Compatibility

Behavioural compatibility, not byte-for-byte compatibility:

- `POST /ai/scan/rubber-note` keeps its request and response contract: same
  `workers[]` shape, same worker fuzzy-match attachment, same validation
  messages, same file-type and size limits.
- `GET /ai/config` and `GET /ai/test` keep working; `/ai/config` additionally
  reports the active source.
- With no active database provider, the system behaves as it does today.
- Internal SDK request payloads are not claimed to be identical: the guard layer
  and request-parameter plumbing change how requests are issued, so the exact
  outbound payload is not guaranteed to match the previous implementation
  byte for byte.
- No existing endpoint, response shape, or business rule (Sales, Settlement,
  Credit/Kasbon, Rubber Workers, Money Transactions, Dashboard, Reports,
  commission rules) is modified by this work.

## 15. Implementation order

1. `domain/` — protocol union, provider shapes, invariant helpers, Base URL
   rules, address classifier.
2. `application/` — ports, models, use cases.
3. Prisma schema change and migration `add_llm_providers`; regenerate client.
4. `infrastructure/` — repository, cipher, guarded transport.
5. Adapters and exhaustive registry.
6. `interface/` — DTOs, presenter, controller.
7. `llm.module.ts` composition root; register in `app.module.ts`.
8. Rewire `ai.service.ts` through `ResolveActiveLlmUseCase`, keeping prompt and
   validation behaviour.
9. Frontend: `lib/api.ts` functions, then the Settings UI section, following the
   existing page's styling and loading/error/success conventions.
10. Documentation update in `README.md` for the new configuration surface.

## 16. Out of scope, recorded

- Anthropic adapter.
- Per-feature or task-specific model routing.
- Provider presets beyond Base URL prefill.
- Authentication and authorization for these endpoints (§12).
- Automated tests (§11).
- Migration of existing environment configuration into the database.
- Multi-user or multi-tenant credential separation.
