# companion-module-avkans-visca

A Bitfocus Companion module for controlling an AVKANS LV20N camera using its complete documented VISCA over IP command system.

## Getting started

1. In the LV20N web interface, open **Control Protocol Config**.
2. Enable **Visca Transmission**, select **TCP**, and set **Work Mode** to **Server**.
3. Set the camera port to `1259`, or choose another unused port and use the same value in Companion.
4. Add the **AVKANS VISCA** connection in Companion and enter the camera IP and VISCA TCP port.

The module adds the LV20N VISCA over IP header and sequence number automatically. It includes all 138 set-command variants and all 48 inquiries from the supplied LV20N command workbook. Custom commands should contain only the raw VISCA command bytes, beginning with `81` and ending with `FF`.

See [companion/HELP.md](./companion/HELP.md) for supported controls and troubleshooting. The source camera documentation is available from the [AVKANS documents page](https://avkans.com/pages/documents).

## Development

Run `yarn install`, then use:

- `yarn test` for the test suite
- `yarn check-types` for TypeScript validation
- `yarn lint` for linting
- `yarn build` to compile the module

This project was derived from [bitfocus/companion-module-ptzoptics-visca](https://github.com/bitfocus/companion-module-ptzoptics-visca) under the MIT License.
