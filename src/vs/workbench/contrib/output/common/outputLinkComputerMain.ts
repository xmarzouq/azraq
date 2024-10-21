/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Azraq. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { create } from './outputLinkComputer.js';
import { bootstrapSimpleWorker } from '../../../../base/common/worker/simpleWorkerBootstrap.js';

bootstrapSimpleWorker(create);
