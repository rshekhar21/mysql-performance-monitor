# ADR 0001: Monorepo With Separate API And Collector Processes

## Status

Accepted.

## Context

The product needs shared types and database code, but routine metric collection must not run inside the API process.

## Decision

Use an npm workspace monorepo with separate `apps/api`, `apps/collector`, and `apps/web` packages plus shared packages under `packages`.

## Consequences

The API and collector can share code while keeping independent process lifecycles, scaling, deployments, and failure modes.
