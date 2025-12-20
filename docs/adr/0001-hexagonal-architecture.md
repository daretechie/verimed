# 1. Adoption of Hexagonal Architecture (Ports and Adapters)

Date: 2025-12-20

## Status

Accepted

## Context

We are building a global verification engine that needs to support an indefinite number of country-specific medical registries. Each registry has a unique API (REST, SOAP, FHIR, CKAN) and response format. Tightly coupling our business logic to these external APIs would lead to a fragile, unmaintainable codebase.

## Decision

We have decided to adopt the **Hexagonal Architecture (Ports and Adapters)** pattern.

### Structure
- **Domain Layer**: Contains the core business logic (`VerificationRequest`, `VerificationResult`) and defines the **Ports** (interfaces) that the outside world must implement. it has ZERO dependencies on frameworks or external libraries.
- **Application Layer**: orchestrates Use Cases (e.g., `VerifyProviderUseCase`) using the Domain objects.
- **Infrastructure Layer / Adapters**: Implements the Ports. This is where the specific logic for generic REST APIs, SOAP services, or specific country integrations (e.g., `UsNpiRegistryAdapter`) lives. NestJS controllers also sit here as "Driving Adapters".

## Consequences

### Positive
- **Testability**: We can easily mock entire country registries by implementing the `IRegistryAdapter` interface in tests.
- **Maintainability**: Adding a new country (e.g., Japan) only requires adding a new Adapter file without touching the core verification logic.
- **Isolation**: Changes in external APIs (e.g., usage of a new specific HTTP client) do not ripple through the business logic.

### Negative
- **Complexity**: Requires more boilerplate (interfaces, DTOs, mappers) than a traditional layered MVC architecture.
- **Learning Curve**: developers must understand where to place logic (Domain vs Application vs Infrastructure).
