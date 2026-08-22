---
title: Schema-driven camera settings in Companion
date: 2026-08-23
last_updated: 2026-08-23
category: design-patterns
module: AVKANS LV20N VISCA
problem_type: design_pattern
component: camera-web-api
severity: medium
applies_when:
  - Device firmware reports setting types, choices, and numeric ranges at runtime
  - Multiple configured devices may expose different capabilities
tags:
  - avkans
  - companion
  - capabilities
  - variables
  - feedbacks
---

# Schema-driven camera settings in Companion

## Context

The LV20N tracking page is generated from `/panel-ability` responses. Firmware decides whether each field is a switch, choice, or slider and supplies the valid choices or numeric range. Hard-coding these details would make the module drift from the camera and could send invalid values.

## Guidance

Discover capabilities independently for every configured camera after authentication, normalize them into stable field IDs, then build actions, variables, and direct feedbacks from the merged schema. Keep values scoped per camera and expose separate active-camera aliases. Rebuild definitions when a camera is added, removed, or reconfigured, and re-evaluate active-camera feedbacks whenever selection changes.

When an API saves a complete settings object rather than accepting one key, read all currently supported values, merge the requested change, stringify values in the same form as the camera UI, and submit the complete object. Never fill unknown sibling values with defaults.

Do not turn coordinate-based video editors into ordinary button actions. Region drawing and subject selection require a video frame and coordinate system, so leave them in the camera UI unless Companion gains an explicit coordinate-aware interface.

## Verification

Test schema normalization, switch/choice/slider option generation, complete-object merge payloads, per-camera state, active aliases, feedback subscription refresh, schema removal during reconfiguration, and definition updates after authentication. Use a reversible live setting change and restore its original value when camera credentials are available.
