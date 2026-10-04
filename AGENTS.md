AGENTS.md --- AgroLedger

1. Project Context

AgroLedger is a financial and operational management application for
agricultural businesses, focused on palm oil (sawit) and rubber (karet).

The primary purpose of the application is to make the flow of money
clear: - where money comes from, - which farm generated the
transaction, - who owns the farm, - what money belongs to the user's own
farm/cash, - what money belongs to another farm owner, - what commission
becomes income for the user's own farm, - and where money is
subsequently spent.

The existing application uses a Next.js frontend and NestJS + Prisma
backend. The existing core workflows include Sales, Manual Input,
Settlement, Credit/Kasbon, Rubber Workers, Money Transactions,
Dashboard, and Reports.

Do not redesign the business model based on assumptions. Preserve
existing behavior unless the task explicitly changes it.

2. Critical Operating Rules

2.0 Mandatory Architecture Reading Before Coding

Before making ANY code change, the agent MUST read and understand:

clean-architecture.md

This document is part of the project's architectural contract.

The agent must:

Locate the actual clean-architecture.md file in the repository.

Read it completely before implementing code.

Follow its terminology, layer boundaries, dependency rules, naming conventions, and architectural constraints.

Compare the requested change against the architecture described in the document.

Identify where the change belongs before editing any file.

Avoid introducing code that conflicts with the documented architecture.

If the requested implementation conflicts with clean-architecture.md, stop before coding and explain the conflict.

Do not silently replace the project's documented architecture with generic Clean Architecture assumptions.

Reading clean-architecture.md is mandatory even when the requested change appears small.

Only after this architectural review may implementation begin.

2.1 Read Before Changing

Before modifying code:

Inspect the relevant frontend page/component.

Inspect the API client/helper used by that feature.

Trace the request to the backend controller.

Inspect the DTO/validation.

Inspect the service/business logic.

Inspect the Prisma schema and related models.

Identify all affected workflows.

Only then propose or implement changes.

Never modify code merely because a structure "looks better".

2.2 Audit First, Implementation Second

When asked to audit or analyze: - READ ONLY. - Do not edit, create,
delete, migrate, or refactor application files. - Verify findings
against source code. - Do not claim a feature is complete without
tracing the relevant frontend → API → backend → database flow. - Mark
uncertain findings as UNVERIFIED.

When asked to implement: - Make the smallest coherent change. - Preserve
existing working workflows. - Re-check affected frontend/backend
contracts after changes.

3. Farm and Ownership Model

The dashboard is not limited to one farm.

AgroLedger must support multiple farms and aggregate their financial
activity.

A farm can be associated with: - commodity: Sawit or Karet, - owner, -
ownership type.

For the current business rule, ownership only needs to distinguish: -
OWN / milik sendiri - RELATIVE / milik saudara

When a farm belongs to a relative, only the owner's name is required. Do
not introduce family relationship graphs or detailed kinship structures
unless explicitly requested.

The application exists to clarify money flow, not to model family
relationships.

4. Palm Oil (Sawit) Sales Commission

Commission is a business income mechanism, NOT a deduction from the farm
owner's sale.

4.1 Commission Applicability

Commission applies ONLY to: - commodity = Sawit - farm ownership = milik
saudara

Commission does NOT apply to: - Sawit owned by the user - any Karet
transaction

Do not show or calculate commission for Karet.

4.2 Default Commission

Default commission:

Rp200 per kg

The default rate must be configurable.

4.3 Commission Override

The commission rate can be overridden on an individual sale transaction.

Example:

default: Rp200/kg

transaction override: Rp250/kg

The transaction uses Rp250/kg.

An override affects only that transaction. It must NOT silently change
the global/default commission rate.

4.4 Commission Calculation

Commission is calculated directly from the actual sale weight:

commissionAmount = actualWeightKg × appliedCommissionRatePerKg

Example:

weight = 2,000 kg

rate = Rp200/kg

commission = Rp400,000

No additional condition, percentage, or alternative weight calculation
should be introduced unless explicitly requested.

4.5 Cash Destination

Commission goes into the user's own farm cash.

It must NOT be modeled as: - a discount, - a deduction from the owner's
accounting concept, - a worker settlement, - or a generic expense.

The system should make the cash flow explicit.

Conceptually:

Relative Farm Sale → Commission → Own Farm Cash

The remaining sale value belongs to the relative's farm/owner according
to the existing business workflow.

4.6 Historical Accuracy

When a sale is recorded, the effective commission rate and calculated
commission amount should be preserved for that transaction.

Changing the default commission later must not rewrite historical sales.

Recommended conceptual fields:

default commission rate

optional transaction commission override

applied commission rate

commission amount

Do not introduce database fields blindly. Inspect the current schema
first and adapt the existing model appropriately.

5. Rubber (Karet) Rules

Karet does NOT use the palm-oil commission system.

Do not: - calculate Rp200/kg commission for Karet, - display commission
controls for Karet, - add commission income to Karet transactions, -
reuse palm-oil commission logic without an explicit business
requirement.

Existing Rubber-specific business logic must remain separate,
especially: - worker input, - piece count, - weight, - worker
settlement, - kasbon, - credit/payment, - rubber sale calculations.

6. Dashboard and Financial Summary

Dashboard summary must aggregate across multiple farms.

The summary should be capable of distinguishing: - total sales
activity, - own-farm sales, - relative-farm sales, - commission
income, - expenses, - settlement-related cash movement, - and actual
cash position.

Do not treat the gross value of another person's/family member's farm
sale as automatically equivalent to the user's own income.

The dashboard's purpose is clarity of cash flow.

Any financial metric must have a clearly defined source and meaning.

7. Sales Workflow

The existing core sales workflow uses statuses:

PENDING → CONFIRMED → COMPLETED

Existing audit findings indicate: - PENDING is the draft stage. -
confirmed sales have price/money-entry implications. - completed sales
follow settlement completion. - draft sales can be deleted. -
confirmed/completed sales are restricted from arbitrary modification.

Do not break these state transitions.

Before changing Sales: - inspect SalesController, - SalesService, -
related DTOs, - Sale model, - frontend sales pages/components, -
settlement integration, - money transaction integration.

8. Settlement and Credit/Kasbon

Settlement, Credit/Kasbon, and Rubber Worker workflows are separate
business domains even when they interact.

Do not mix: - commission, - worker settlement, - kasbon, - owner
deductions, - expenses.

Each movement must have a clear accounting meaning.

The existing system contains CreditAccount/CreditTransaction concepts
and worker settlement workflows. Preserve those semantics unless
explicitly changed.

9. Money Transactions

Every financial movement should have an explicit reason/source.

When implementing a new money movement: 1. identify its source, 2.
identify its destination, 3. identify which farm/account owns the money,
4. determine whether it is income, expense, settlement, transfer, or
another existing transaction type, 5. reuse existing transaction
infrastructure where appropriate.

Do not create duplicate financial ledgers when an existing
MoneyTransaction model can represent the movement correctly.

For commission, the destination is the user's own farm cash.

10. Frontend Rules

Prefer the existing centralized API helper (lib/api.ts) and
environment configuration rather than hardcoded API URLs.

Existing audit findings identified direct http://localhost:3001/...
fetch usage and window.location.reload() patterns. New code must not
introduce additional instances of these patterns.

Prefer: - centralized API calls, - reactive state updates, - explicit
loading/error/success states, - reusable components, - server/client
boundaries consistent with the existing Next.js architecture.

Do not redesign the UI unless the task requires it.

11. Backend Rules

Backend business rules belong in services/domain logic, not scattered
across controllers or UI.

Use: - DTO validation, - existing NestJS module structure, - Prisma
transactions where atomicity is required, - existing status guards, -
existing database relations.

Do not duplicate business calculations between frontend and backend when
the backend is the authoritative source.

Frontend may display calculated values, but critical financial
calculations must be validated/recalculated server-side.

12. Security

The audit identified that the current backend controllers do not
consistently enforce JWT authentication/authorization.

Do not treat the current lack of guards as an intended permanent
architecture.

When implementing authentication/security work: - inspect the current
auth architecture first, - apply guards consistently, - avoid exposing
sensitive financial operations publicly, - do not weaken existing
security controls.

Do not invent a new authentication architecture if one already exists in
the repository.

13. No AI Slop / No Blind Refactoring

Do not: - create unnecessary abstractions, - add generic "enterprise"
layers without need, - rename working structures merely for style, -
introduce excessive hooks/components/services, - add mock data to hide
missing backend functionality, - fake API responses, - use setTimeout
to simulate backend behavior, - silently remove existing features, -
rewrite large portions of the project for a small requirement.

Prefer boring, explicit, maintainable code.

Every change should have a concrete reason tied to a requirement or
verified defect.

14. Verification Requirements

After implementation, verify at least:

Frontend

TypeScript

ESLint

affected route/page

affected component

API request/response contract

Backend

TypeScript/build

DTO validation

controller/service behavior

Prisma compatibility

affected business workflow

Financial logic

For commission changes, test at minimum:

Sawit + own farm → commission = 0

Sawit + relative farm → default commission = weight × default rate

Sawit + relative farm + override → weight × override rate

Karet + own farm → no commission

Karet + relative farm → no commission

Changing default rate does not alter historical transaction
commission

Commission enters own farm cash correctly

Gross sale and commission are not confused in dashboard totals

15. Agent Behavior

When exploring a large repository:

Start with repository structure.

Divide exploration into logical domains.

Use subagents when useful.

Keep track of files already reviewed.

Do not repeatedly reread the same files without reason.

Follow dependencies from UI to backend and database.

Report evidence using file paths and relevant code locations.

Separate:

verified facts,

inferred behavior,

recommendations.

Never claim "all files reviewed" unless the repository coverage
actually supports that claim.

For long-running audits, maintain a progress/checkpoint document when
requested.

16. Current Priority Business Direction

The current product direction is:

AgroLedger should make money movement across multiple farms
understandable and traceable.

The immediate financial model being established is:

Farm → Sale → Gross Value → Applicable Commission → Cash Destination

For Sawit relative-farm sales:

Gross Sale → Commission (Rp/kg) → Own Farm Cash

For Sawit own-farm sales:

Gross Sale → Own Farm Cash

For Karet:

Karet-specific existing workflow

No palm-oil commission is applied to Karet.

Before adding further financial rules, discuss and verify the business
process rather than assuming conventional accounting behavior.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
