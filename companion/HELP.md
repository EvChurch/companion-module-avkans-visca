# AVKANS LV20N VISCA

This module controls up to four AVKANS LV20N cameras from one Companion connection. Native camera operations use the authenticated AVKANS web API, while commands and inquiries without an equivalent web endpoint retain VISCA for complete compatibility.

## Camera setup

In the LV20N web interface, open **Control Protocol Config** and configure:

- **Visca Transmission:** Enabled
- **Connection Protocol:** TCP
- **Work Mode:** Server
- **Port:** `1259` by default

The port can be changed, but it must match the **VISCA TCP port** configured in Companion. The camera manual requires an unused port between 2 and 65533.

Set **VISCA transport** to **Raw VISCA over TCP** for the standard LV20N configuration. This is the default and was verified against firmware V1.1.36. Select **VISCA over IP framing** only when the camera has been configured to expect the eight-byte VISCA-over-IP header and sequence number.

## Multi-camera control

Configure a name, IP address, web username, and web password for each camera slot you use. Passwords are stored as separate Companion secrets. Empty or invalid IP slots are hidden from action and feedback choices. All cameras share the configured VISCA TCP port and transport mode, but web authentication and VISCA connections are independent per camera, so one unavailable camera does not block the others. Failed web authentication is retried automatically.

Every camera-facing action has a leading **Camera** choice:

- **Active Camera** resolves to the selected camera when the action runs.
- A named camera always routes the action to that camera without changing the active selection.

Use **Select active camera**, **Select next camera**, or **Select previous camera** to change the active camera. Next and Previous skip empty slots and wrap around. Before a switch, the module attempts to stop pan/tilt, zoom, and focus on the old camera; a failed or unavailable old camera is logged but does not block the selection.

Version 1.2 replaces the prior single-camera configuration. Existing single-camera settings are not migrated. Custom IP addresses and Companion variable-derived camera targets are not supported in this version.

## Complete LV20N command coverage

The built-in **Camera control:** actions cover all 138 supported camera-control commands:

- Address setting and power
- Standard, variable, direct, and digital zoom
- Standard, variable, direct, automatic, manual, toggle, and one-push focus
- Combined direct zoom/focus positioning
- White-balance modes, color temperature, and manual/automatic RGB gains
- Exposure mode (including Full Auto/Manual toggle), gain limit, shutter, iris, gain, brightness, compensation, backlight, and aperture
- Preset reset, save, and recall for presets 0 through 64
- IR receiver and every documented video format
- Directional, absolute, relative, home, and reset pan/tilt controls
- Audio volume
- Sharpness, brightness, contrast, saturation, hue, 2D/3D noise reduction, gamma, WDR, mirror, flip, and anti-flicker
- DHCP, IP address, subnet mask, gateway, and apply-network-settings controls
- Factory reset, system menu, and tally-light modes

The original convenience actions and button presets remain available. The comprehensive actions are prefixed **Camera control:** and group related command variants into searchable actions with clear choices and value ranges. Pan/tilt movement, zoom, focus, preset storage, and **Set Preset Recall Speeds** use native camera endpoints. Preset recall stays on VISCA because the native recall endpoint supplies movement speeds directly and can bypass the camera's stored preset-speed values.

## Camera state, variables, and feedbacks

When a camera connects, the module automatically reads the 45 state values verified on LV20N firmware V1.1.36. Connected cameras are refreshed every 30 seconds, with each camera's queries kept sequential so polling cycles cannot overlap or overload its VISCA socket. Controls with known state effects also refresh their related values as soon as the command completes. This keeps power, operating modes, positions, image settings, network information, and firmware details current whether a change comes from Companion or another controller.

Variable names are designed for button text and expressions:

- Active-camera values use `camera_active_*`, such as `camera_active_name`, `camera_active_power`, and `camera_active_zoom_position`.
- Fixed-camera values use `camera_1_*` through `camera_4_*`, such as `camera_2_power`.
- A state value is exposed once. Single-value responses do not create duplicate combined and field variables.

Feedbacks use direct operator-facing conditions instead of a generic result comparison. Available conditions include **Active camera is**, **Camera is connected**, **Camera: Power is**, **Camera: Focus mode is**, **Camera: White balance mode is**, and the other supported camera modes. Every condition can follow **Active Camera** or target a named camera.

All 48 state queries remain available as **Get camera state:** actions for manual refresh and diagnostics. Three optional aggregate queries—PTZ/focus/iris block, white-balance block, and heartbeat—are not loaded automatically because the tested LV20N firmware does not answer them.

If a camera does not answer a state query, the module times it out and reconnects. Reconnecting prevents a late raw-TCP reply from being mistaken for a later response.

Changing network settings can disconnect the current Companion connection. Configure DHCP, address, mask, and gateway first, then run **Camera control: Apply network settings**.

## Custom commands

Custom commands accept a raw VISCA byte sequence beginning with `81` and ending with `FF`, for example:

`81 01 08 01 02 FF`

Do not include an eight-byte network header in the custom command field. The module sends these bytes directly in **Raw VISCA over TCP** mode and adds the payload length, sequence number, and VISCA-over-IP header when that transport is selected.

For the full command table, see the [AVKANS LV20N documentation](https://avkans.com/pages/documents).
