---
title: Workbook-driven VISCA command catalogs
date: 2026-08-01
category: design-patterns
module: AVKANS LV20N VISCA
problem_type: design_pattern
component: tooling
severity: medium
applies_when:
  - A hardware protocol is supplied as a spreadsheet or command table
  - Complete command coverage must remain auditable against vendor documentation
tags:
  - visca
  - hardware-protocol
  - command-catalog
  - workbook
  - companion
---

# Workbook-driven VISCA command catalogs

## Context

Vendor camera workbooks mix several concerns: command packets, inquiry packets, parameter ranges, response layouts, transport framing, and lookup tables. Implementing each row as bespoke action code makes omissions hard to detect and duplicates validation logic.

The LV20N implementation in PR #1 uses the workbook as a manifest. Declarative catalogs describe the packets, while shared builders, decoders, transport code, and Companion adapters each own one layer of behavior.

## Guidance

Separate the implementation into four layers:

1. **Catalog:** Preserve the workbook row number, stable identifier, base bytes, parameters, ranges, and response layout. Generated catalog files should identify their source sheet and row range.
2. **Protocol:** Build parameterized packets and decode inquiry responses independently of the UI. Validate integer ranges, packet envelopes, terminators, and response lengths here.
3. **Transport:** Add or remove VISCA-over-IP framing in one place. Keep raw VISCA bytes distinct from the IP header, sequence number, and payload length. Model exceptional response shapes such as broadcast address setting and addressed heartbeat replies explicitly.
4. **Companion surface:** Generate grouped actions, inquiry variables, and feedbacks from the catalogs. Preserve existing action IDs when extending an established module so saved Companion configurations keep working.

Use two complementary coverage checks:

- **Manifest completeness:** Assert the exact command-row sequence and the explicit inquiry-row list from the workbook. This detects missing or duplicated entries.
- **Behavioral representatives:** Assert exact bytes for multi-parameter commands, boundary validation, variable-length inquiries, block decoders, broadcast replies, and sequence-correlated VISCA-over-IP responses. This prevents a complete-looking catalog from encoding every row incorrectly in the same way.

## Why This Matters

Row counts alone prove presence, not correctness. Representative packet tests alone prove selected behavior, not completeness. Combining them makes omissions and shared encoding mistakes fail for different reasons.

The layer boundary also limits blast radius. A workbook correction usually changes catalog data; a transport correction stays in the VISCA port; and Companion presentation changes do not rewrite packet logic.

## When to Apply

- A manufacturer publishes protocol definitions as a spreadsheet, PDF table, or CSV.
- The device has many related variants with repeated packet shapes.
- The module needs an auditable claim of complete documented coverage.
- Existing user configurations require stable action identifiers during expansion.

Do not use this pattern for a tiny protocol with only a few stable commands; direct typed command definitions may be easier to maintain.

## Examples

The LV20N catalogs record each source row and use parameter nibble positions rather than embedding UI-specific callbacks in the packet definitions. The test suite then checks the full manifest and exact representative encodings. See `src/camera/lv20n-command-catalog.test.ts`, `src/camera/lv20n-inquiry.test.ts`, and `src/visca/__tests__/port-basics.test.ts`.

## Related

- PR #1 adds the complete LV20N command and inquiry catalog. It was open and green when this learning was captured.
