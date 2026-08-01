# AVKANS LV20N VISCA

This module controls the AVKANS LV20N over a TCP connection using the VISCA over IP packet format documented by AVKANS.

## Camera setup

In the LV20N web interface, open **Control Protocol Config** and configure:

- **Visca Transmission:** Enabled
- **Connection Protocol:** TCP
- **Work Mode:** Server
- **Port:** `1259` by default

The port can be changed, but it must match the **VISCA TCP port** configured in Companion. The camera manual requires an unused port between 2 and 65533.

## Complete LV20N command coverage

The built-in **LV20N:** actions cover all 138 set-command variants in the supplied LV20N VISCA workbook:

- Address setting and power
- Standard, variable, direct, and digital zoom
- Standard, variable, direct, automatic, manual, toggle, and one-push focus
- Combined direct zoom/focus positioning
- White-balance modes, color temperature, and manual/automatic RGB gains
- Exposure mode, gain limit, shutter, iris, gain, brightness, compensation, backlight, and aperture
- Preset reset, save, and recall for presets 0 through 64
- IR receiver and every documented video format
- Directional, absolute, relative, home, and reset pan/tilt controls
- Audio volume
- Sharpness, brightness, contrast, saturation, hue, 2D/3D noise reduction, gamma, WDR, mirror, flip, and anti-flicker
- DHCP, IP address, subnet mask, gateway, and apply-network-settings controls
- Factory reset, system menu, and tally-light modes

The original convenience actions and button presets remain available for existing Companion configurations. The comprehensive actions are prefixed **LV20N:** and group related command variants into a searchable action with appropriate choices and value ranges.

## Inquiries, variables, and feedbacks

Every one of the 48 documented inquiries is available as an **LV20N Inquiry:** action. Running one updates:

- A combined variable for that inquiry
- Separate variables for every decoded field
- The last inquiry ID, formatted result, and raw hexadecimal response

This includes power and operating modes, positions and image values, network addresses and combined ASCII network information, camera version, heartbeat, and both block inquiries. The **LV20N inquiry result** feedback displays a cached result, while **LV20N inquiry result equals** can style a button when the cached result matches expected text. Feedback values update after the corresponding inquiry action runs.

Changing network settings can disconnect the current Companion connection. Configure DHCP, address, mask, and gateway first, then run **LV20N: Apply network settings**.

## Custom commands

Custom commands accept a raw VISCA byte sequence beginning with `81` and ending with `FF`, for example:

`81 01 08 01 02 FF`

The module adds the LV20N VISCA over IP header, payload length, and sequence number. Do not include the eight-byte network header in the custom command field.

For the full command table, see the [AVKANS LV20N documentation](https://avkans.com/pages/documents).
