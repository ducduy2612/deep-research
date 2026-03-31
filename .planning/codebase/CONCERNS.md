# Codebase Concerns

**Analysis Date:** 2026-03-31

## Tech Debt

**Large Component Files:**
- Issue: Several components exceed 500-3000 lines, indicating high complexity and potential maintainability issues
- Files: `src/components/Setting.tsx` (3000 lines), `src/libs/mcp-server/mcp.ts` (1551 lines), `src/libs/mcp-server/types.ts` (1465 lines), `src/libs/mcp-server/streamableHttp.ts` (1210 lines), `src/hooks/useDeepResearch.ts` (857 lines), `src/middleware.ts` (814 lines)
- Impact: Difficult to navigate, test, and maintain; higher risk of bugs; slower load times
- Fix approach: Break down into smaller components/modules following single responsibility principle

**Code Duplication in AI Provider Setup:**
- Issue: Repeated switch-case logic across multiple files for provider configuration
- Files: `src/hooks/useAiProvider.ts`, `src/middleware.ts`, `next.config.ts`
- Impact: Configuration changes require updates in multiple places; inconsistent behavior possible
- Fix approach: Extract provider configuration into centralized factory or configuration module

**Inline Third-Party Code:**
- Issue: `src/utils/parser/officeParser.ts` is a modified version of external library (harshankur/officeParser)
- Files: `src/utils/parser/officeParser.ts` (754 lines)
- Impact: Cannot receive updates from upstream; maintenance burden; security patches missed
- Fix approach: Either contribute changes back to upstream or extract as separate package with clear attribution

**Environment Variable Configuration:**
- Issue: Over 30 environment variables scattered across multiple files without centralized validation
- Files: `next.config.ts`, `src/middleware.ts`, `src/components/Setting.tsx`, `src/app/api/*/route.ts`
- Impact: Easy to miss required variables; no validation at startup; potential runtime errors
- Fix approach: Create centralized environment configuration with Zod schema validation

## Known Bugs

**Error Handling Inconsistencies:**
- Symptoms: Mixed error handling patterns - some functions throw, some return empty values, some use toast notifications
- Files: `src/utils/error.ts`, `src/hooks/useDeepResearch.ts`, `src/hooks/useKnowledge.ts`
- Trigger: Various API failures, parsing errors
- Workaround: None documented - users may see inconsistent error messages

**TODO Comment in Office Parser:**
- Symptoms: Unhandled edge case in Excel parsing
- Files: `src/utils/parser/officeParser.ts:494`
- Trigger: "TODO: Add debug asserts for if we reach here which would mean we are filtering more items than we are processing."
- Workaround: Returns empty string which may cause silent data loss

**JSON.parse Without Try-Catch:**
- Symptoms: Potential uncaught exceptions when parsing malformed JSON
- Files: `src/utils/error.ts:18`, `src/utils/deep-research/index.ts:177`, `src/components/History.tsx:95`
- Trigger: Malformed API responses or corrupted localStorage data
- Workaround: None - will cause runtime crashes

## Security Considerations

**API Key Storage in Client Storage:**
- Risk: API keys stored in browser localStorage/sessionStorage via zustand persist middleware
- Files: `src/store/setting.ts`, `src/store/task.ts`, `src/store/knowledge.ts`, `src/store/history.ts`
- Current mitigation: None evident from code review
- Recommendations: Implement server-side key management; never store keys in client storage; use short-lived tokens

**Signature Verification Weakness:**
- Risk: Simple signature verification using `Date.now()` timestamp is vulnerable to replay attacks
- Files: `src/utils/signature.ts`, `src/middleware.ts:94-102`
- Current mitigation: Timestamp-based signature without apparent nonce or expiration validation
- Recommendations: Implement proper JWT or HMAC with nonce and short expiration

**Direct API Calls from Browser:**
- Risk: CORS proxy mode exposes API keys and makes requests directly from browser
- Files: `src/hooks/useAiProvider.ts`, `src/components/Setting.tsx`
- Current mitigation: API key still required, but exposed in browser
- Recommendations: Enforce server-side proxy mode for production; remove local mode option

**Missing Input Validation:**
- Risk: User inputs passed directly to external APIs without sanitization
- Files: `src/utils/deep-research/search.ts:200-242` (query passed directly), `src/utils/crawler.ts:22-46`
- Current mitigation: None evident
- Recommendations: Implement input sanitization; validate URLs; limit query length

**Middleware Authorization Bypass:**
- Risk: Complex middleware logic with multiple conditionals could have edge cases allowing unauthorized access
- Files: `src/middleware.ts:90-200+`
- Current mitigation: Signature verification and provider disable checks
- Recommendations: Implement comprehensive authorization testing; simplify logic; add audit logging

## Performance Bottlenecks

**Large File Parsing Without Streaming:**
- Problem: Office document parsing loads entire files into memory
- Files: `src/utils/parser/officeParser.ts`
- Cause: Synchronous processing of ZIP contents and XML parsing
- Improvement path: Implement streaming parsing for large files; add file size limits

**Sequential Search API Calls:**
- Problem: Search providers called sequentially even when parallelization is possible
- Files: `src/utils/deep-research/search.ts:194-458`
- Cause: Sequential if-else blocks instead of Promise.all
- Improvement path: Use Promise.all() for independent API calls; implement request batching

**Client-Side State Management Bloat:**
- Problem: Large state objects stored in localStorage without size limits or cleanup
- Files: `src/store/task.ts`, `src/store/history.ts`, `src/store/knowledge.ts`
- Cause: No pagination or size limits on stored arrays
- Improvement path: Implement pagination; add cleanup policies; compress stored data

**React Compiler Experimental:**
- Problem: Using experimental React Compiler which may have performance regressions
- Files: `next.config.ts:50`, `package.json:101`
- Cause: Enabled in production without fallback
- Improvement path: Monitor performance metrics; add rollback option; test without compiler

**No Request Caching:**
- Problem: Repeated API calls for same queries without caching
- Files: Throughout `src/hooks/useDeepResearch.ts`, `src/utils/deep-research/`
- Cause: No caching layer implemented
- Improvement path: Implement request deduplication; add response caching with TTL

## Fragile Areas

**Setting Component:**
- Files: `src/components/Setting.tsx` (3000 lines)
- Why fragile: Monolithic component handles all settings UI; tightly coupled with multiple stores; complex form validation
- Safe modification: Break into smaller sub-components per tab; extract validation logic; use React Query for API calls
- Test coverage: No unit tests evident; high risk of regression

**Deep Research Hook:**
- Files: `src/hooks/useDeepResearch.ts` (857 lines)
- Why fragile: Complex async flow with multiple AI calls; error handling inconsistent; tightly coupled to multiple providers
- Safe modification: Extract to class/module with clear interfaces; add comprehensive error handling; implement state machine
- Test coverage: No tests; critical path for app functionality

**Middleware Routing:**
- Files: `src/middleware.ts` (814 lines)
- Why fragile: Long chain of if-else statements; duplicated logic; signature verification scattered throughout
- Safe modification: Extract to route handlers; use middleware composition; add integration tests
- Test coverage: No tests; security-sensitive code

**MCP Server Implementation:**
- Files: `src/libs/mcp-server/` (multiple large files)
- Why fragile: Complex protocol implementation; timeout handling; stream management
- Safe modification: Add comprehensive protocol tests; implement proper error recovery; document edge cases
- Test coverage: No protocol-level tests evident

**Knowledge Store Operations:**
- Files: `src/hooks/useKnowledge.ts`, `src/store/knowledge.ts`
- Why fragile: Async operations without proper error handling; ID generation uses Date.now() (potential collisions)
- Safe modification: Add error boundaries; implement proper ID generation; add transaction support
- Test coverage: No tests; data loss possible

## Scaling Limits

**Browser Storage Limits:**
- Current capacity: ~5-10MB per origin (localStorage/IndexedDB)
- Limit: Will fail when research history grows large; no quota management
- Scaling path: Implement server-side storage with pagination; add storage quota monitoring; migrate to IndexedDB with proper limits

**API Rate Limits:**
- Current capacity: No rate limiting implementation
- Limit: Will hit provider rate limits under concurrent usage
- Scaling path: Implement client-side rate limiting; add request queuing; use exponential backoff

**Single-User State Management:**
- Current capacity: Zustand stores designed for single user
- Limit: No multi-user collaboration features
- Scaling path: Implement backend with user-specific data; add real-time sync; consider migration to Supabase/Firebase

**Search Provider Latency:**
- Current capacity: Sequential search calls add latency
- Limit: User experience degrades with multiple search providers
- Scaling path: Implement parallel search; add caching; use search aggregator services

## Dependencies at Risk

**React 19.2.4:**
- Risk: Using latest React version with potential breaking changes
- Impact: May have compatibility issues with some libraries
- Migration plan: Monitor for issues; pin minor version; test thoroughly before upgrades

**Next.js 15.5.12:**
- Risk: Recent major version with potential bugs
- Impact: Build/runtime issues possible
- Migration plan: Watch for patch releases; test build process; have rollback plan

**AI SDK 4.3.12:**
- Risk: Core dependency for all AI functionality; rapid version changes
- Impact: All AI features depend on this; breaking changes would be catastrophic
- Migration plan: Pin to specific version; create abstraction layer; test migration path before updates

**Babel Plugin React Compiler (19.1.0-rc.1):**
- Risk: Experimental plugin used in production
- Impact: May cause unexpected behavior or performance issues
- Migration plan: Have build configuration ready to disable; monitor for stable release

**Multiple AI Provider SDKs:**
- Risk: Dependencies on many provider-specific SDKs (@ai-sdk/*)
- Impact: Updates from any provider could break integration
- Migration plan: Implement version pinning; test each provider independently; consider standardizing on OpenAI-compatible interface

## Missing Critical Features

**Test Coverage:**
- Problem: No test files found in codebase (*.test.ts, *.spec.ts)
- Blocks: Confidence in refactoring; preventing regressions; CI/CD quality gates
- Impact: High risk of breaking changes; difficult to onboard new developers

**Error Monitoring:**
- Problem: No integration with error tracking services (Sentry, etc.)
- Blocks: Production error visibility; user issue diagnosis
- Impact: Silent failures; poor user experience; difficult debugging

**Logging Infrastructure:**
- Problem: Console.log/error statements scattered throughout; no structured logging
- Blocks: Production debugging; audit trails; analytics
- Impact: Difficult to troubleshoot production issues

**API Rate Limiting:**
- Problem: No client or server-side rate limiting
- Blocks: Production deployment; multi-user scenarios
- Impact: API quota exhaustion; unexpected costs

**Request Cancellation:**
- Problem: Limited abort controller usage; no request timeout enforcement
- Blocks: Proper cleanup; preventing resource leaks
- Impact: Stale requests consuming resources; poor UX

**Data Validation Layer:**
- Problem: Input validation scattered; no centralized schema validation
- Blocks: Type safety; data integrity; security
- Impact: Runtime errors; potential security vulnerabilities

**Internationalization Completeness:**
- Problem: Some hardcoded strings; incomplete translation coverage
- Blocks: Full localization; accessibility
- Impact: Partial language support; inconsistent UX

## Test Coverage Gaps

**Untested Area: Critical business logic**
- What's not tested: Deep research workflow (`src/hooks/useDeepResearch.ts`), search providers (`src/utils/deep-research/search.ts`), AI provider creation (`src/utils/deep-research/provider.ts`)
- Files: All core research logic files
- Risk: High - core functionality could break without detection
- Priority: High - implement integration tests first

**Untested Area: State management**
- What's not tested: Zustand stores (`src/store/*`), persistence logic, state migrations
- Files: `src/store/task.ts`, `src/store/knowledge.ts`, `src/store/history.ts`, `src/store/setting.ts`
- Risk: High - data loss or corruption possible
- Priority: High - test store operations and persistence

**Untested Area: Middleware authentication**
- What's not tested: API signature verification, provider authorization, request routing
- Files: `src/middleware.ts`
- Risk: Critical - security vulnerabilities
- Priority: High - comprehensive security testing needed

**Untested Area: File parsing**
- What's not tested: Office document parsers, PDF parser
- Files: `src/utils/parser/officeParser.ts`, `src/utils/parser/pdfParser.ts`
- Risk: Medium - parsing failures could crash app
- Priority: Medium - add unit tests with sample files

**Untested Area: MCP protocol**
- What's not tested: MCP server implementation, SSE transport, protocol compliance
- Files: `src/libs/mcp-server/*`
- Risk: Medium - integration issues with MCP clients
- Priority: Medium - add protocol compliance tests

**Untested Area: UI components**
- What's not tested: All React components
- Files: All files in `src/components/`
- Risk: Low-Medium - visual regressions possible
- Priority: Low - add E2E tests with Playwright

**Untested Area: Error handling**
- What's not tested: Error parsing, error boundaries, toast notifications
- Files: `src/utils/error.ts`, error handling throughout codebase
- Risk: Medium - poor error UX
- Priority: Medium - test error scenarios

**Untested Area: Storage layer**
- What's not tested: localforage integration, IndexedDB operations
- Files: `src/utils/storage.ts`, store persistence
- Risk: Medium - data loss in private browsing or storage full scenarios
- Priority: Medium - test storage edge cases

---

*Concerns audit: 2026-03-31*
