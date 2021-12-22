import * as vscode from 'vscode'
import * as languageserver from './languageserver';
import * as debuggerPatch from './debuggerPatch'

export function activate(context: vscode.ExtensionContext) {
    languageserver.activate(context);
    debuggerPatch.applyPatch(context);
}

export function deactivate() {
    languageserver.deactivate();
}
