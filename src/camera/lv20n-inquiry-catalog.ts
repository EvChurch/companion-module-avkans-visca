// Generated from “LV20N visca.xlsx”, sheet “01 Visca”, inquiry rows 147–218.
// Do not hand-edit inquiry packets; update the workbook extraction generator instead.

import type { Lv20nInquirySpec } from './lv20n-inquiry.js'

export const lv20nInquiryCatalog = [
	{
		workbookRow: 147,
		id: 'power',
		name: 'Power',
		bytes: [129, 9, 4, 0, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'On',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Off (Standby)',
				},
			],
		},
	},
	{
		workbookRow: 149,
		id: 'zoom_position',
		name: 'Zoom position',
		bytes: [129, 9, 4, 71, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Zoom position',
					nibbles: [5, 7, 9, 11],
				},
			],
		},
	},
	{
		workbookRow: 150,
		id: 'digital_zoom_limit',
		name: 'Digital zoom limit',
		bytes: [129, 9, 4, 38, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'limit',
					label: 'Digital zoom limit',
					nibbles: [5],
				},
			],
		},
	},
	{
		workbookRow: 151,
		id: 'focus_mode',
		name: 'Focus mode',
		bytes: [129, 9, 4, 56, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'Auto Focus',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Manual Focus',
				},
			],
		},
	},
	{
		workbookRow: 153,
		id: 'focus_position',
		name: 'Focus position',
		bytes: [129, 9, 4, 72, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Focus position',
					nibbles: [5, 7, 9, 11],
				},
			],
		},
	},
	{
		workbookRow: 154,
		id: 'white_balance_mode',
		name: 'White balance mode',
		bytes: [129, 9, 4, 53, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 0, 255],
					value: 'Auto',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'One Push WB',
				},
				{
					bytes: [144, 80, 4, 255],
					value: 'ATW',
				},
				{
					bytes: [144, 80, 5, 255],
					value: 'Manual',
				},
				{
					bytes: [144, 80, 11, 255],
					value: 'Color_Temperature mode',
				},
			],
		},
	},
	{
		workbookRow: 159,
		id: 'manual_red_gain',
		name: 'Manual red gain',
		bytes: [129, 9, 4, 67, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Manual red gain',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 160,
		id: 'manual_blue_gain',
		name: 'Manual blue gain',
		bytes: [129, 9, 4, 68, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Manual blue gain',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 161,
		id: 'exposure_mode',
		name: 'Exposure mode',
		bytes: [129, 9, 4, 57, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 0, 255],
					value: 'Full Auto',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Manual',
				},
				{
					bytes: [144, 80, 10, 255],
					value: 'Shutter Priority',
				},
				{
					bytes: [144, 80, 11, 255],
					value: 'Iris Priority',
				},
				{
					bytes: [144, 80, 13, 255],
					value: 'Bright',
				},
			],
		},
	},
	{
		workbookRow: 166,
		id: 'shutter_position',
		name: 'Shutter position',
		bytes: [129, 9, 4, 74, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Shutter position',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 167,
		id: 'iris_position',
		name: 'Iris position',
		bytes: [129, 9, 4, 75, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Iris position',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 168,
		id: 'gain_position',
		name: 'Gain position',
		bytes: [129, 9, 4, 76, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Gain position',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 169,
		id: 'bright_position',
		name: 'Exposure brightness position',
		bytes: [129, 9, 4, 77, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Brightness position',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 170,
		id: 'exposure_compensation_mode',
		name: 'Exposure compensation mode',
		bytes: [129, 9, 4, 62, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'On',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Off',
				},
			],
		},
	},
	{
		workbookRow: 172,
		id: 'exposure_compensation_position',
		name: 'Exposure compensation position',
		bytes: [129, 9, 4, 78, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'position',
					label: 'Exposure compensation position',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 173,
		id: 'digital_zoom_mode',
		name: 'Digital zoom mode',
		bytes: [129, 9, 4, 6, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'On',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Off',
				},
			],
		},
	},
	{
		workbookRow: 175,
		id: 'backlight_mode',
		name: 'Backlight mode',
		bytes: [129, 9, 4, 51, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'On',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'Off',
				},
			],
		},
	},
	{
		workbookRow: 177,
		id: 'aperture',
		name: 'Aperture',
		bytes: [129, 9, 4, 66, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Aperture gain',
					nibbles: [9, 11],
				},
			],
		},
	},
	{
		workbookRow: 178,
		id: 'ir_receive',
		name: 'IR receiver',
		bytes: [129, 9, 6, 8, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 2, 255],
					value: 'ON',
				},
				{
					bytes: [144, 80, 3, 255],
					value: 'OFF',
				},
			],
		},
	},
	{
		workbookRow: 180,
		id: 'video_system',
		name: 'Video format',
		bytes: [129, 9, 6, 35, 255],
		decode: {
			kind: 'enum',
			choices: [
				{
					bytes: [144, 80, 0, 255],
					value: '1920 x1080p/60',
				},
				{
					bytes: [144, 80, 1, 255],
					value: '1920 x1080p/30',
				},
				{
					bytes: [144, 80, 3, 255],
					value: '1280 x720p/60',
				},
				{
					bytes: [144, 80, 8, 255],
					value: '1920 x1080p/50',
				},
				{
					bytes: [144, 80, 9, 255],
					value: '1920 x1080p/25',
				},
				{
					bytes: [144, 80, 11, 255],
					value: '1280 x720p/50',
				},
				{
					bytes: [144, 80, 12, 255],
					value: '1280 x720p/25',
				},
				{
					bytes: [144, 80, 16, 255],
					value: '1920 x1080p/59.94',
				},
				{
					bytes: [144, 80, 17, 255],
					value: '1920 x1080p/29.97',
				},
				{
					bytes: [144, 80, 18, 255],
					value: '1280 x720p/59.94',
				},
			],
		},
	},
	{
		workbookRow: 190,
		id: 'pan_tilt_position',
		name: 'Pan and tilt position',
		bytes: [129, 9, 6, 18, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'pan_position',
					label: 'Pan position',
					nibbles: [5, 7, 9, 11],
				},
				{
					id: 'tilt_position',
					label: 'Tilt position',
					nibbles: [13, 15, 17, 19],
				},
			],
		},
	},
	{
		workbookRow: 191,
		id: 'pan_tilt_max_speed',
		name: 'Pan and tilt maximum speed',
		bytes: [129, 9, 6, 17, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'pan_speed',
					label: 'Maximum pan speed',
					bytes: [2],
				},
				{
					id: 'tilt_speed',
					label: 'Maximum tilt speed',
					bytes: [3],
				},
			],
		},
	},
	{
		workbookRow: 193,
		id: 'audio_volume',
		name: 'Audio volume',
		bytes: [129, 9, 4, 110, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'volume',
					label: 'Audio volume',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 194,
		id: 'noise_reduction_2d',
		name: '2D noise reduction',
		bytes: [129, 9, 4, 83, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: '2D noise reduction',
					nibbles: [5],
				},
			],
		},
	},
	{
		workbookRow: 195,
		id: 'noise_reduction_3d',
		name: '3D noise reduction',
		bytes: [129, 9, 4, 84, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: '3D noise reduction',
					nibbles: [5],
				},
			],
		},
	},
	{
		workbookRow: 196,
		id: 'gamma',
		name: 'Gamma',
		bytes: [129, 9, 4, 91, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Gamma',
					nibbles: [5],
				},
			],
		},
	},
	{
		workbookRow: 197,
		id: 'wdr',
		name: 'Wide dynamic range',
		bytes: [129, 9, 4, 61, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Wide dynamic range',
					nibbles: [5],
				},
			],
		},
	},
	{
		workbookRow: 198,
		id: 'mirror',
		name: 'Mirror',
		bytes: [129, 9, 4, 97, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'state',
					label: 'Mirror',
					nibbles: [5],
					choices: [
						{
							value: 2,
							label: 'On',
						},
						{
							value: 3,
							label: 'Off',
						},
					],
				},
			],
		},
	},
	{
		workbookRow: 199,
		id: 'flip',
		name: 'Flip',
		bytes: [129, 9, 4, 102, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'state',
					label: 'Flip',
					nibbles: [5],
					choices: [
						{
							value: 2,
							label: 'On',
						},
						{
							value: 3,
							label: 'Off',
						},
					],
				},
			],
		},
	},
	{
		workbookRow: 200,
		id: 'anti_flicker',
		name: 'Anti-flicker',
		bytes: [129, 9, 4, 58, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'mode',
					label: 'Anti-flicker',
					nibbles: [5],
					choices: [
						{
							value: 0,
							label: 'Off',
						},
						{
							value: 1,
							label: '50 Hz',
						},
						{
							value: 2,
							label: '60 Hz',
						},
					],
				},
			],
		},
	},
	{
		workbookRow: 201,
		id: 'sharpness',
		name: 'Image sharpness',
		bytes: [129, 9, 14, 36, 64, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Sharpness',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 202,
		id: 'brightness',
		name: 'Image brightness',
		bytes: [129, 9, 14, 36, 65, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Brightness',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 203,
		id: 'contrast',
		name: 'Image contrast',
		bytes: [129, 9, 14, 36, 66, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Contrast',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 204,
		id: 'saturation',
		name: 'Image saturation',
		bytes: [129, 9, 14, 36, 67, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Saturation',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 205,
		id: 'hue',
		name: 'Image hue',
		bytes: [129, 9, 14, 36, 68, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'value',
					label: 'Hue',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 206,
		id: 'automatic_red_gain',
		name: 'Automatic red gain',
		bytes: [129, 9, 14, 36, 70, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Automatic red gain',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 207,
		id: 'automatic_blue_gain',
		name: 'Automatic blue gain',
		bytes: [129, 9, 14, 36, 71, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Automatic blue gain',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 208,
		id: 'automatic_green_gain',
		name: 'Automatic green gain',
		bytes: [129, 9, 14, 36, 72, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'gain',
					label: 'Automatic green gain',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 209,
		id: 'white_balance_color_temperature',
		name: 'White balance color temperature',
		bytes: [129, 9, 14, 36, 73, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'level',
					label: 'Color temperature level',
					nibbles: [5, 7],
				},
			],
		},
	},
	{
		workbookRow: 210,
		id: 'dhcp',
		name: 'Network DHCP',
		bytes: [129, 9, 8, 8, 255],
		decode: {
			kind: 'fields',
			fields: [
				{
					id: 'state',
					label: 'DHCP',
					nibbles: [5],
					choices: [
						{
							value: 2,
							label: 'On',
						},
						{
							value: 3,
							label: 'Off',
						},
					],
				},
			],
		},
	},
	{
		workbookRow: 211,
		id: 'ip_address',
		name: 'Network IP address',
		bytes: [129, 9, 8, 7, 1, 255],
		decode: {
			kind: 'ip-address',
		},
	},
	{
		workbookRow: 212,
		id: 'ip_mask',
		name: 'Network subnet mask',
		bytes: [129, 9, 8, 7, 2, 255],
		decode: {
			kind: 'ip-address',
		},
	},
	{
		workbookRow: 213,
		id: 'ip_gateway',
		name: 'Network gateway',
		bytes: [129, 9, 8, 7, 3, 255],
		decode: {
			kind: 'ip-address',
		},
	},
	{
		workbookRow: 214,
		id: 'ip_info',
		name: 'Combined network information',
		bytes: [129, 9, 8, 7, 255],
		decode: {
			kind: 'ip-info',
		},
	},
	{
		workbookRow: 215,
		id: 'version',
		name: 'Camera version',
		bytes: [129, 9, 0, 2, 255],
		decode: {
			kind: 'version',
		},
	},
	{
		workbookRow: 216,
		id: 'ptzfi_block',
		name: 'PTZ/focus/iris block',
		bytes: [129, 9, 4, 16, 0, 255],
		decode: {
			kind: 'ptzfi-block',
		},
	},
	{
		workbookRow: 217,
		id: 'white_balance_block',
		name: 'White balance/shutter block',
		bytes: [129, 9, 4, 16, 1, 255],
		decode: {
			kind: 'white-balance-block',
		},
	},
	{
		workbookRow: 218,
		id: 'heartbeat',
		name: 'Heartbeat',
		bytes: [136, 9, 1, 1, 255],
		decode: {
			kind: 'heartbeat',
		},
	},
] as const satisfies readonly Lv20nInquirySpec[]
