# companion-module-avkans-visca

A Bitfocus Companion module for controlling up to four AVKANS LV20N cameras from one connection. It uses the camera's authenticated web API for native controls and VISCA over TCP for commands and inquiries that have no equivalent web endpoint.

## Getting started

1. In the LV20N web interface, open **Control Protocol Config**.
2. Enable **Visca Transmission**, select **TCP**, and set **Work Mode** to **Server**.
3. Set the camera port to `1259`, or choose another unused port and use the same value in Companion.
4. Add the **AVKANS VISCA** connection in Companion and enter a name, IP, web username, and web password for each camera you want to control. Credentials are stored separately for every camera. Leave unused slots blank.
5. Enter the shared VISCA TCP port and leave **VISCA transport** set to **Raw VISCA over TCP** for the standard LV20N configuration. VISCA remains the compatibility path for controls without a native HTTP equivalent.

Every camera-facing action starts with a **Camera** dropdown. Choose **Active Camera** for a reusable control surface, or pin the action to a configured camera. Use **Select active camera**, **Select next camera**, and **Select previous camera** to change the active camera. Switching first attempts pan/tilt, zoom, and focus stops on the previous camera, then continues even if that camera is unavailable.

Camera state loads when each camera's web authentication and VISCA connection are both ready, and refreshes every 30 seconds while connected. Authentication failures are isolated per camera and retried automatically. Controls with known state effects also refresh their related values as soon as the command completes. Active-camera variables use the `camera_active_*` prefix, fixed-camera variables use `camera_1_*` through `camera_4_*`, and feedbacks provide clear conditions such as **Active camera is**, **Camera is connected**, and **Camera: Power is**.

Auto-tracking controls are discovered from each camera after authentication, so Companion uses the exact choices and ranges supported by its firmware. Tracking actions can follow the active camera or target a named camera. Tracking variables and direct feedbacks refresh every 10 seconds and immediately after a change.

Manual and preset-recall zoom speeds are available as active-camera and fixed-camera variables with matching numeric feedbacks. They refresh every 10 seconds and immediately after preset speeds are changed.

The **Set Zoom Speed** action changes manual zoom speed from 1 (slow) through 8 (fast) and refreshes the related variables and feedbacks immediately.

The module includes 127 supported control commands and all 48 documented camera-state queries. Of those commands, 106 non-destructive commands completed live against firmware V1.1.36; the remaining 21 power-off, factory-reset, network, preset-overwrite, and video-format commands retain their workbook-validated packets but were not executed on the production camera. Pan/tilt movement, zoom, focus, preset storage, and preset-speed configuration use native AVKANS HTTP endpoints. Preset recall and controls without an equivalent endpoint retain VISCA so behavior and custom-command support are not lost. The AVKANS workbook also lists Bright exposure and tally-light packets, but V1.1.36 rejects or ignores all 11 of those commands, so the module does not expose non-working actions. An optional **VISCA over IP framing** transport is available for cameras configured to require the eight-byte network header and sequence number.

See [companion/HELP.md](./companion/HELP.md) for supported controls and troubleshooting. The source camera documentation is available from the [AVKANS documents page](https://avkans.com/pages/documents).

## Development

Run `yarn install`, then use:

- `yarn test` for the test suite
- `yarn check-types` for TypeScript validation
- `yarn lint` for linting
- `yarn build` to compile the module

This project was derived from [bitfocus/companion-module-ptzoptics-visca](https://github.com/bitfocus/companion-module-ptzoptics-visca) under the MIT License.

# CI check naming

The `module-ci` check requires every job in the native test matrix to succeed,
including type checking, lint, unused-code checks, compilation, tests and package
creation. It fails if the matrix fails, is cancelled or is skipped. Its name does
not include a Node version, so it can remain a required check as the matrix changes.
The existing test and Companion package checks remain in place.
