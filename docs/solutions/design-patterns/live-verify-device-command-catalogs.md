---
title: Live-verify device command catalogs
date: 2026-08-23
last_updated: 2026-08-23
category: design-patterns
module: AVKANS LV20N VISCA
problem_type: verification
component: command-catalog
severity: high
applies_when:
  - A vendor workbook claims commands that may differ from shipping firmware
  - Commands depend on operating modes or can change persistent device state
tags:
  - avkans
  - visca
  - companion
  - live-testing
---

# Live-verify device command catalogs

## Context

The LV20N workbook documents 138 VISCA commands, but documentation parity does not guarantee firmware support. Firmware V1.1.36 rejects Bright exposure mode and its four controls with VISCA `Not Executable`, and does not acknowledge any of the six documented tally commands.

## Guidance

Keep the complete documented packet catalog for traceability, then derive the user-facing catalog by excluding commands proven not to work on the supported firmware. Do not advertise workbook rows as supported merely because their packets encode correctly.

Test state-changing commands in serialized groups on the camera's single VISCA socket. Read a baseline through inquiries, establish required operating modes, send the command, wait for ACK and completion, and restore the baseline. Movement and preset commands need longer completion windows than ordinary setting commands. A short audit timeout can incorrectly classify an acknowledged movement as failed and can interrupt restoration.

Describe mode requirements in the Companion action itself. Examples include Manual Focus for direct focus control, One Push WB before its trigger, Digital Zoom On before changing its limit, and automatic or priority exposure mode for exposure-compensation amounts.

## Safety boundary

Do not live-execute power-off, factory reset, network application, preset overwrite/reset, or video-format changes on a production camera merely to claim exhaustive coverage. Verify their workbook packets structurally and report them as documented but disruptive. Never hide that distinction in test totals.

## Verification

Record the number of unique live-tested commands separately from precondition and restoration commands. Confirm final pan, tilt, zoom, focus, white balance, exposure, compensation, IR, and audio state against the initial inquiry baseline.
