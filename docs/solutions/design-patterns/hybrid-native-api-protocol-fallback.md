---
title: Hybrid native API with protocol fallback
date: 2026-08-23
last_updated: 2026-08-23
category: design-patterns
module: AVKANS LV20N VISCA
problem_type: design_pattern
component: transport
severity: medium
applies_when:
  - A device exposes convenient authenticated HTTP controls but not its complete protocol
  - Existing actions and arbitrary custom commands require full compatibility
tags:
  - avkans
  - http-api
  - visca
  - companion
---

# Hybrid native API with protocol fallback

## Context

The LV20N web application exposes authenticated endpoints for common PTZ and focus controls. Its `protocol/visca-proxy` endpoint only configures a TCP or UDP VISCA server or client; it does not tunnel arbitrary VISCA commands over HTTP. Replacing VISCA completely would therefore remove documented commands, state inquiries, and the custom-command action.

## Guidance

Keep native and compatibility transports behind the same per-camera target:

1. Store web credentials as separate secrets for each configured camera.
2. Authenticate each web session independently, cache its bearer token, retry once after an expired-token response, and retry failed authentication in the background.
3. Combine HTTP and VISCA health per camera so one failed camera does not block other camera slots.
4. Use native endpoints where their behavior is verified, especially movement, focus, zoom, preset storage, and camera-only settings.
5. Retain VISCA for catalog commands, inquiries, raw custom commands, and operations whose native endpoint changes semantics.

Preset recall is an important exception. The native endpoint includes pan and tilt speeds in the recall request, while the camera also stores separate preset recall speeds. Keeping recall on VISCA allows those stored settings to remain authoritative.

## Verification

Test authentication caching, token renewal, connection-failure isolation, exact native endpoint payloads, and representative action routing. Continue running the complete VISCA catalog and transport tests because the fallback remains part of the supported behavior.
