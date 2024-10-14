/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { addDisposableListener, getActiveWindow } from '../../../base/browser/dom.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import type { INativeHostService } from '../../native/common/native.js';

interface IBoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;

	left: number;
	top: number;
	right: number;
	bottom: number;
}

class BoundingBox implements IBoundingBox {
	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly width: number,
		public readonly height: number,
	) { }

	get left() { return this.x; }
	get top() { return this.y; }
	get right() { return this.x + this.width; }
	get bottom() { return this.y + this.height; }
}

export async function getScreenshotAsVariable(nativeHostService: INativeHostService, windowId?: number): Promise<IScreenshotVariableEntry | undefined> {
	const screenshot = await generateWindowScreenshot(nativeHostService, windowId);
	if (!screenshot) {
		return;
	}

	return {
		id: 'screenshot-focused-window',
		name: localize('screenshot', 'Screenshot'),
		value: new Uint8Array(screenshot),
		isImage: true,
		isDynamic: true
	};
}

export async function generateWindowScreenshot(nativeHostService: INativeHostService, windowId?: number): Promise<ArrayBuffer | undefined> {
	try {
		return takeScreenshot(nativeHostService, windowId);
	} catch (err) {
		console.error('Error taking screenshot:', err);
		return undefined;
	}
}

async function takeScreenshot(nativeHostService: INativeHostService, windowId?: number): Promise<ArrayBuffer | undefined> {
	const windowBounds = getActiveWindowBounds();
	if (!windowBounds) {
		return undefined;
	}
	const store = new DisposableStore();

	// Create a video element to play the captured screen source
	const video = document.createElement('video');
	store.add(toDisposable(() => video.remove()));
	let stream: MediaStream | undefined;
	try {
		// TODO: This needs to get the stream for the actual window when strictly taking a
		//       screenshot of the window, so as to not leak windows in the foreground (eg. a always
		//       on top video)
		if (windowId !== undefined) {
			await nativeHostService.setDisplayMediaSelection({ activeWindow: true });
		}

		// Create a stream from the screen source (capture screen without audio)
		stream = await navigator.mediaDevices.getDisplayMedia({
			audio: false,
			video: true
		});

		// Set the stream as the source of the video element
		video.srcObject = stream;
		video.play();

		// Wait for the video to load properly before capturing the screenshot
		await Promise.all([
			new Promise<void>(r => store.add(addDisposableListener(video, 'loadedmetadata', () => r()))),
			new Promise<void>(r => store.add(addDisposableListener(video, 'canplaythrough', () => r())))
		]);

		// Create a canvas element with the size of the cropped region
		// if (!cropDimensions) {
		// 	cropDimensions = new BoundingBox(0, 0, video.videoWidth, video.videoHeight);
		// }
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return undefined;
		}

		// Draw the portion of the video (x, y) with the specified width and height
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

		// Convert the canvas to a Blob (JPEG format), use .95 for quality
		const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95));
		if (!blob) {
			throw new Error('Failed to create blob from canvas');
		}

		// Convert the Blob to an ArrayBuffer
		return blob.arrayBuffer();

	} catch (error) {
		console.error('Error taking screenshot:', error);
		return undefined;
	} finally {
		store.dispose();
		if (stream) {
			for (const track of stream.getTracks()) {
				track.stop();
			}
		}
	}
}


function getActiveWindowBounds(): IBoundingBox | undefined {
	const window = getActiveWindow();
	if (!window) {
		return;
	}
	const displayOffsetX = 'availLeft' in window.screen && typeof window.screen.availLeft === 'number' ? window.screen.availLeft : 0;
	const displayOffsetY = 'availTop' in window.screen && typeof window.screen.availTop === 'number' ? window.screen.availTop : 0;
	// This handling of dimensions is flaky, if the the active windoow is on the first monitor and
	// DPRs differ this may not work properly.
	return new BoundingBox(
		Math.round((window.screenX - displayOffsetX) * window.devicePixelRatio),
		Math.round((window.screenY - displayOffsetY) * window.devicePixelRatio),
		Math.round(window.innerWidth * window.devicePixelRatio),
		Math.round(window.innerHeight * window.devicePixelRatio),
	);
}

interface IScreenshotVariableEntry {
	id: string;
	name: string;
	value: Uint8Array;
	isDynamic?: boolean;
	isImage?: boolean;
}
