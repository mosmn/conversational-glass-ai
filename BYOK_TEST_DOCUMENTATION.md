# BYOK (Bring Your Own Keys) - Test Documentation

## Overview

This document outlines the comprehensive test suite for the BYOK implementation in the Conversational Glass AI application. The tests ensure that users can securely manage their own API keys while maintaining graceful fallback to environment variables.

## Test Structure

### 1. **Encryption Utilities Tests** (`test/lib/utils/encryption.test.ts`)

**Coverage**: API key encryption, decryption, validation, and masking

**Key Tests**:

- ✅ **Key Encryption**: AES-256-GCM encryption with user-specific keys
- ✅ **Key Decryption**: Secure decryption with proper error handling
- ✅ **Key Hashing**: SHA-256 consistent hashing for duplicate detection
- ✅ **Format Validation**: Provider-specific API key format validation
  - OpenAI: `sk-*` format
  - Claude: `sk-ant-*` format
  - Gemini: 30-50 character length
  - OpenRouter: `sk-or-*` format
  - Groq: `gsk_*` format
- ✅ **Key Masking**: Safe display with `sk-****cdef` format

### 2. **BYOK Manager Tests** (`test/lib/ai/providers/byok-manager.test.ts`)

**Coverage**: Core BYOK functionality and caching

**Key Tests**:

- ✅ **User Key Retrieval**: Database queries with proper filtering
- ✅ **Environment Fallback**: Graceful fallback to environment variables
- ✅ **Caching System**: 5-minute TTL cache for performance
- ✅ **Authentication Handling**: Proper user ID resolution
- ✅ **Status Management**: Key status prioritization (valid > pending > invalid)
- ✅ **Cache Management**: Selective cache clearing by user/provider

### 3. **Provider Integration Tests** (`test/lib/ai/providers/openai.test.ts`)

**Coverage**: AI provider integration with BYOK

**Key Tests**:

- ✅ **Provider Configuration**: Always enabled for BYOK flexibility
- ✅ **Key Resolution Priority**: User keys → Environment variables → Error
- ✅ **Client Caching**: Separate clients per user/key combination
- ✅ **Streaming Completion**: Proper user context passing
- ✅ **Error Handling**: Helpful error messages pointing to Settings > API Keys
- ✅ **Connection Testing**: Validation with user-specific keys

### 4. **API Endpoint Tests** (`test/app/api/user/api-keys.test.ts`)

**Coverage**: REST API endpoints for key management

**Key Tests**:

- ✅ **GET /api/user/api-keys**: List user's encrypted keys with masking
- ✅ **POST /api/user/api-keys**: Create new keys with validation
- ✅ **DELETE /api/user/api-keys/[id]**: Secure key deletion
- ✅ **POST /api/user/api-keys/test**: Key functionality testing
- ✅ **Authentication**: Clerk-based access control
- ✅ **Validation**: Zod schema validation and error handling
- ✅ **Duplicate Prevention**: Hash-based duplicate detection

### 5. **Chat Integration Tests** (`test/app/api/chat/send.test.ts`)

**Coverage**: End-to-end chat functionality with BYOK

**Key Tests**:

- ✅ **User Context Passing**: Proper user ID forwarding to providers
- ✅ **Error Propagation**: BYOK-aware error messages in chat
- ✅ **Streaming Integration**: Real-time responses with user keys
- ✅ **Conversation Security**: User can only access own conversations
- ✅ **Model Validation**: Ensure selected models work with user keys

### 6. **Integration Tests** (`test/integration/byok-flow.test.ts`)

**Coverage**: Complete end-to-end BYOK workflows

**Key Tests**:

- ✅ **Full User Key Flow**: Database → Decryption → Provider → API
- ✅ **Environment Fallback Flow**: No user key → Environment variable
- ✅ **Failure Handling**: No keys available → Helpful error
- ✅ **Client Caching**: Multi-user scenarios with proper isolation
- ✅ **Error Recovery**: Decryption failures and API errors

## Test Commands

### Run All Tests

```bash
npm run test
```

### Run BYOK-Specific Tests

```bash
npm run test:byok
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Quick Validation

```bash
npm run test:validate
```

### Run with Coverage

```bash
npm run test:coverage
```

## Test Environment Setup

The test suite uses **Vitest** with the following configuration:

- **Environment**: jsdom for React component testing
- **Mocking**: Comprehensive mocks for Clerk, database, and crypto APIs
- **Isolation**: Each test runs in isolation with fresh mocks

**Key Mocks**:

- Clerk authentication (`@clerk/nextjs/server`)
- Database connection (`@/lib/db/connection`)
- Crypto APIs (encryption/decryption)
- OpenAI SDK and other AI providers
- Fetch API for external calls

## Validation Results

Our validation script (`npm run test:validate`) confirms:

✅ **Encryption Utilities**: All format validations working  
✅ **API Routes**: All endpoint files present  
✅ **Database Schema**: userApiKeys table properly defined  
✅ **Provider Structure**: Models and configurations loaded

## Security Testing

**Encryption Security**:

- ✅ User-specific encryption keys (PBKDF2 from Clerk ID)
- ✅ AES-256-GCM authenticated encryption
- ✅ Secure key derivation and storage
- ✅ No plaintext keys in logs or errors

**Access Control**:

- ✅ Users can only access their own keys
- ✅ Proper UUID validation for key IDs
- ✅ Clerk authentication required for all operations
- ✅ Database queries filtered by user ID

## Performance Testing

**Caching Efficiency**:

- ✅ 5-minute TTL reduces database queries
- ✅ Separate cache keys per user/provider
- ✅ Memory management with cache size limits
- ✅ Cache clearing for security

**Database Optimization**:

- ✅ Indexed queries on userId + provider
- ✅ Efficient duplicate detection via hashing
- ✅ Minimal data transfer with selective fields

## Error Scenario Testing

**Comprehensive Error Handling**:

- ✅ Invalid API key formats
- ✅ Decryption failures
- ✅ Network timeouts
- ✅ Authentication failures
- ✅ Provider API errors
- ✅ Database connection issues

**User-Friendly Messages**:

- ✅ Clear guidance to Settings > API Keys
- ✅ Environment variable fallback instructions
- ✅ Provider-specific error contexts

## Continuous Integration

The test suite is designed for CI/CD integration:

- **Fast Execution**: Vitest's speed for quick feedback
- **Parallel Testing**: Independent test isolation
- **Mock Reliability**: Consistent mock behaviors
- **Coverage Reporting**: Detailed coverage metrics

## Future Test Enhancements

1. **Load Testing**: Multi-user concurrent scenarios
2. **Security Audits**: Automated vulnerability scanning
3. **Integration Testing**: Real API provider testing (optional)
4. **Performance Benchmarks**: Response time measurements
5. **Browser Testing**: UI component testing with Playwright

---

## Summary

The BYOK test suite provides **comprehensive coverage** of:

- ✅ **Security**: Encryption, authentication, access control
- ✅ **Functionality**: Key management, provider integration, chat flow
- ✅ **Reliability**: Error handling, fallbacks, edge cases
- ✅ **Performance**: Caching, optimization, scalability
- ✅ **Usability**: Clear errors, helpful guidance, smooth UX

This ensures the BYOK system is **production-ready** and provides a **secure, reliable foundation** for the T3 ChatCloneathon competition! 🏆
