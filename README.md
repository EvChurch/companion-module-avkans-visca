# companion-module-avkans-visca

A Bitfocus Companion module for controlling up to four AVKANS LV20N cameras from one connection using the complete documented VISCA command system over TCP.

## Getting started

1. In the LV20N web interface, open **Control Protocol Config**.
2. Enable **Visca Transmission**, select **TCP**, and set **Work Mode** to **Server**.
3. Set the camera port to `1259`, or choose another unused port and use the same value in Companion.
4. Add the **AVKANS VISCA** connection in Companion and enter a name and IP for each camera you want to control. Leave unused slots blank.
5. Enter the shared VISCA TCP port and leave **VISCA transport** set to **Raw VISCA over TCP** for the standard LV20N configuration.

Every camera-facing action starts with a **Camera** dropdown. Choose **Active Camera** for a reusable control surface, or pin the action to a configured camera. Use **Select active camera**, **Select next camera**, and **Select previous camera** to change the active camera. Switching first attempts pan/tilt, zoom, and focus stops on the previous camera, then continues even if that camera is unavailable.

Camera state loads when each camera connects and refreshes every 30 seconds while connected. Controls with known state effects also refresh their related values as soon as the command completes. Active-camera variables use the `camera_active_*` prefix, fixed-camera variables use `camera_1_*` through `camera_4_*`, and feedbacks provide clear conditions such as **Active camera is**, **Camera is connected**, and **Camera: Power is**.

The module includes all 138 supported control commands and all 48 camera-state queries. Raw VISCA over TCP is the default verified against LV20N firmware V1.1.36. An optional **VISCA over IP framing** transport is available for cameras configured to require the eight-byte network header and sequence number. Custom commands should contain only the raw VISCA command bytes, beginning with `81` and ending with `FF`; the module adds framing when that transport is selected.

See [companion/HELP.md](./companion/HELP.md) for supported controls and troubleshooting. The source camera documentation is available from the [AVKANS documents page](https://avkans.com/pages/documents).

## Development

Run `yarn install`, then use:

- `yarn test` for the test suite
- `yarn check-types` for TypeScript validation
- `yarn lint` for linting
- `yarn build` to compile the module

This project was derived from [bitfocus/companion-module-ptzoptics-visca](https://github.com/bitfocus/companion-module-ptzoptics-visca) under the MIT License.
