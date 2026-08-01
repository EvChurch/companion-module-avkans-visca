---
title: Declarative VISCA command catalogs
date: 2026-08-01
last_updated: 2026-08-02
category: design-patterns
module: AVKANS LV20N VISCA
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - A hardware protocol contains many related commands and state queries
  - Complete protocol coverage must remain auditable against vendor documentation
tags:
  - visca
  - hardware-protocol
  - command-catalog
  - companion
---

# Declarative VISCA command catalogs

## Context

Camera protocols combine command packets, state-query packets, parameter ranges, response layouts, transport framing, and lookup tables. Implementing each command as bespoke action code makes omissions difficult to detect and duplicates validation logic.

The LV20N implementation uses declarative catalogs as its protocol manifest. Shared builders, decoders, transport code, and Companion adapters each own one layer of behavior.

## Guidance

Separate the implementation into four layers:

1. **Catalog:** Preserve stable identifiers, base bytes, parameters, ranges, and response layouts.
2. **Protocol:** Build parameterized packets and decode responses independently of the UI. Validate integer ranges, packet envelopes, terminators, and response lengths here.
3. **Transport:** Add or remove VISCA-over-IP framing in one place. Keep raw VISCA bytes distinct from the IP header, sequence number, and payload length. Model exceptional response shapes explicitly. Time out unanswered state queries and reconnect a raw stream before sending another query, because a late reply could otherwise be assigned to the wrong request.
4. **Companion surface:** Generate grouped actions, variables, and feedbacks from the catalogs. Use concise operator-facing labels and keep protocol-source terminology out of the UI.

When one module instance manages multiple devices, keep protocol state keyed by device and capture the resolved target before awaiting a response. A mutable global target can misattribute overlapping actions or late responses. Generate action and feedback target choices from the same ordered roster, and project each device's state into both stable per-device variables and active-device aliases.

Use two complementary coverage checks:

- **Catalog completeness:** Assert exact command and state-query counts with unique stable IDs. This detects missing or duplicated entries.
- **Behavioral representatives:** Assert exact bytes for multi-parameter commands, boundary validation, variable-length responses, block decoders, broadcast replies, and sequence-correlated VISCA-over-IP responses.

## Why This Matters

Counts prove presence, not correctness. Representative packet tests prove selected behavior, not completeness. Combining them makes omissions and shared encoding mistakes fail for different reasons.

The layer boundary also limits blast radius. Protocol data changes stay in catalog data; transport corrections stay in the VISCA port; and Companion presentation changes do not rewrite packet logic.

## When to Apply

- The device has many related variants with repeated packet shapes.
- The module needs an auditable claim of complete documented coverage.
- Existing user configurations require stable action identifiers during expansion.

Do not use this pattern for a tiny protocol with only a few stable commands; direct typed command definitions may be easier to maintain.

## Examples

The LV20N catalogs use parameter nibble positions rather than embedding UI-specific callbacks in packet definitions. Live verification against firmware V1.1.36 found raw VISCA on TCP port 1259 while framed VISCA-over-IP packets timed out, so the module exposes both modes and defaults to raw TCP. See `src/camera/lv20n-command-catalog.test.ts`, `src/camera/lv20n-inquiry.test.ts`, `src/visca/__tests__/inquiry-timeout.test.ts`, and `src/visca/__tests__/port-basics.test.ts`.

## Related

- PR #1 added the complete LV20N command and state-query catalog.
