/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler } from 'vs/base/common/async';
import { Disposable, IDisposable } from 'vs/base/common/lifecycle';
import { AccessibilitySignal, IAccessibilitySignalService } from 'vs/platform/accessibilitySignal/browser/accessibilitySignalService';

/**
 * Schedules a signal to play while progress is happening.
 */
export class AccessibilityProgressSignalScheduler extends Disposable {
	private _scheduler: RunOnceScheduler;
	private _signalLoop: IDisposable | undefined;
	constructor(msLoopTime: number, msDelayTime: number, @IAccessibilitySignalService private readonly _accessibilitySignalService: IAccessibilitySignalService) {
		super();
		this._scheduler = new RunOnceScheduler(() => {
			this._signalLoop = this._accessibilitySignalService.playSignalLoop(AccessibilitySignal.chatResponsePending, msLoopTime);
		}, msDelayTime);
		this._scheduler.schedule();
	}
	override dispose(): void {
		super.dispose();
		this._signalLoop?.dispose();
		this._scheduler.cancel();
		this._scheduler.dispose();
	}
}

