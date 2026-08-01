# companion-module-avkans-visca

A Bitfocus Companion module for controlling an AVKANS LV20N camera using its complete documented VISCA command system over TCP.

## Getting started

1. In the LV20N web interface, open **Control Protocol Config**.
2. Enable **Visca Transmission**, select **TCP**, and set **Work Mode** to **Server**.
3. Set the camera port to `1259`, or choose another unused port and use the same value in Companion.
4. Add the **AVKANS VISCA** connection in Companion, enter the camera IP and VISCA TCP port, and leave **VISCA transport** set to **Raw VISCA over TCP** for the standard LV20N configuration.

The module includes all 138 set-command variants and all 48 inquiries from the supplied LV20N command workbook. Raw VISCA over TCP is the default verified against LV20N firmware V1.1.36. An optional **VISCA over IP framing** transport is available for cameras configured to require the eight-byte network header and sequence number. Custom commands should contain only the raw VISCA command bytes, beginning with `81` and ending with `FF`; the module adds framing when that transport is selected.

See [companion/HELP.md](./companion/HELP.md) for supported controls and troubleshooting. The source camera documentation is available from the [AVKANS documents page](https://avkans.com/pages/documents).

## Development

Run `yarn install`, then use:

- `yarn test` for the test suite
- `yarn check-types` for TypeScript validation
- `yarn lint` for linting
- `yarn build` to compile the module

This project was derived from [bitfocus/companion-module-ptzoptics-visca](https://github.com/bitfocus/companion-module-ptzoptics-visca) under the MIT License.
