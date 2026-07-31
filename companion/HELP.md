# AVKANS LV20N VISCA

This module controls the AVKANS LV20N over a TCP connection using the VISCA over IP packet format documented by AVKANS.

## Camera setup

In the LV20N web interface, open **Control Protocol Config** and configure:

- **Visca Transmission:** Enabled
- **Connection Protocol:** TCP
- **Work Mode:** Server
- **Port:** `1259` by default

The port can be changed, but it must match the **VISCA TCP port** configured in Companion. The camera manual requires an unused port between 2 and 65533.

## Supported controls

The built-in actions follow the LV20N VISCA command listing:

- Power
- Pan, tilt, home, speed, and absolute position
- Zoom and focus
- Preset save and recall for presets 0 through 64
- Exposure mode, iris, and shutter values
- Automatic, one-push, ATW, manual, and color-temperature white balance modes
- OSD open, close, toggle, enter, and return

PTZOptics-specific auto-tracking, focus-lock, preset-drive-speed, and OSD navigation commands are not exposed because they are not part of the supplied LV20N VISCA listing.

## Custom commands

Custom commands accept a raw VISCA byte sequence beginning with `81` and ending with `FF`, for example:

`81 01 08 01 02 FF`

The module adds the LV20N VISCA over IP header, payload length, and sequence number. Do not include the eight-byte network header in the custom command field.

For the full command table, see the [AVKANS LV20N documentation](https://avkans.com/pages/documents).
