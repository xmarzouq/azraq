/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Azraq. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import 'mocha';
import { join, normalize } from 'path';
import { commands, Uri, workspace, ConfigurationTarget } from 'vscode';

async function assertUnchangedTokens(fixturesPath: string, resultsPath: string, treeSitterResultsPath: string, fixture: string, done: any) {
	const testFixurePath = join(fixturesPath, fixture);
	const tokenizers = [{ command: '_workbench.captureSyntaxTokens', resultsPath }, { command: '_workbench.captureTreeSitterSyntaxTokens', resultsPath: treeSitterResultsPath }];

	try {
		await Promise.all(tokenizers.map(async (tokenizer) => {
			const data = await commands.executeCommand(tokenizer.command, Uri.file(testFixurePath));

			if (!fs.existsSync(tokenizer.resultsPath)) {
				fs.mkdirSync(tokenizer.resultsPath);
			}
			const resultPath = join(tokenizer.resultsPath, fixture.replace('.', '_') + '.json');
			if (fs.existsSync(resultPath)) {
				const previousData = JSON.parse(fs.readFileSync(resultPath).toString());
				try {
					assert.deepStrictEqual(data, previousData);
				} catch (e) {
					fs.writeFileSync(resultPath, JSON.stringify(data, null, '\t'), { flag: 'w' });
					if (Array.isArray(data) && Array.isArray(previousData) && data.length === previousData.length) {
						for (let i = 0; i < data.length; i++) {
							const d = data[i];
							const p = previousData[i];
							if (d.c !== p.c || hasThemeChange(d.r, p.r)) {
								throw e;
							}
						}
						// different but no tokenization ot color change: no failure
					} else {
						throw e;
					}
				}
			} else {
				fs.writeFileSync(resultPath, JSON.stringify(data, null, '\t'));
			}
		}));
		done();
	} catch (e) {
		done(e);
	}
}

function hasThemeChange(d: any, p: any): boolean {
	const keys = Object.keys(d);
	for (const key of keys) {
		if (d[key] !== p[key]) {
			return true;
		}
	}
	return false;
}

suite('colorization', () => {
	const testPath = normalize(join(__dirname, '../test'));
	const fixturesPath = join(testPath, 'colorize-fixtures');
	const resultsPath = join(testPath, 'colorize-results');
	const treeSitterResultsPath = join(testPath, 'colorize-tree-sitter-results');
	let originalSettingValue: any;

	suiteSetup(async function () {
		originalSettingValue = workspace.getConfiguration('editor').get('experimental.preferTreeSitter');
		await workspace.getConfiguration('editor').update('experimental.preferTreeSitter', ["typescript"], ConfigurationTarget.Global);
	});
	suiteTeardown(async function () {
		await workspace.getConfiguration('editor').update('experimental.preferTreeSitter', originalSettingValue, ConfigurationTarget.Global);
	});

	for (const fixture of fs.readdirSync(fixturesPath)) {
		test(`colorize: ${fixture}`, function (done) {
			commands.executeCommand('workbench.action.closeAllEditors').then(() => {
				assertUnchangedTokens(fixturesPath, resultsPath, treeSitterResultsPath, fixture, done);
			});
		});
	}
});
