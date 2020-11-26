"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const path = require("path");
const os = require("os");
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let defaultClient;
let clients = new Map();
let _sortedWorkspaceFolders;
function sortedWorkspaceFolders() {
    if (_sortedWorkspaceFolders === void 0) {
        _sortedWorkspaceFolders = vscode_1.workspace.workspaceFolders ? vscode_1.workspace.workspaceFolders.map(folder => {
            let result = folder.uri.toString();
            if (result.charAt(result.length - 1) !== '/') {
                result = result + '/';
            }
            return result;
        }).sort((a, b) => {
            return a.length - b.length;
        }) : [];
    }
    return _sortedWorkspaceFolders;
}
vscode_1.workspace.onDidChangeWorkspaceFolders(() => _sortedWorkspaceFolders = undefined);
function getOuterMostWorkspaceFolder(folder) {
    let sorted = sortedWorkspaceFolders();
    for (let element of sorted) {
        let uri = folder.uri.toString();
        if (uri.charAt(uri.length - 1) !== '/') {
            uri = uri + '/';
        }
        if (uri.startsWith(element)) {
            return vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.parse(element));
        }
    }
    return folder;
}
function start(context, documentSelector, folder) {
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: documentSelector,
        workspaceFolder: folder,
        progressOnInitialization: true,
        markdown: {
            isTrusted: true,
        },
    };
    let config = vscode_1.workspace.getConfiguration(undefined, folder);
    let command;
    let platform = os.platform();
    switch (platform) {
        case "win32":
            command = context.asAbsolutePath(path.join('server', 'bin', 'Windows', 'w3-asset-server.exe'));
            break;
    }
    let serverOptions = {
        command: command,
        args: [
            '-E',
            context.asAbsolutePath(path.join('server', 'main.lua'))
        ]
    };
    let client = new node_1.LanguageClient('W3-asset', 'W3-asset', serverOptions, clientOptions);
    client.registerProposedFeatures();
    client.start();
    return client;
}
function activate(context) {
    function didOpenTextDocument(document) {
        // We are only interested in language mode text
        if (document.languageId !== 'asset' || (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled')) {
            return;
        }
        let uri = document.uri;
        let folder = vscode_1.workspace.getWorkspaceFolder(uri);
        // Untitled files go to a default client.
        if (!defaultClient) {
            defaultClient = start(context, [
                { scheme: 'file', language: 'asset' }
            ], null);
            return;
        }
    }
    function didCloseTextDocument(document) {
        let uri = document.uri;
        if (clients.has(uri.toString())) {
            let client = clients.get(uri.toString());
            if (client) {
                clients.delete(uri.toString());
                client.stop();
            }
        }
    }
    vscode_1.workspace.onDidOpenTextDocument(didOpenTextDocument);
    //Workspace.onDidCloseTextDocument(didCloseTextDocument);
    vscode_1.workspace.textDocuments.forEach(didOpenTextDocument);
    vscode_1.workspace.onDidChangeWorkspaceFolders((event) => {
        for (let folder of event.removed) {
            let client = clients.get(folder.uri.toString());
            if (client) {
                clients.delete(folder.uri.toString());
                client.stop();
            }
        }
    });
}
exports.activate = activate;
function deactivate() {
    let promises = [];
    if (defaultClient) {
        promises.push(defaultClient.stop());
    }
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
exports.deactivate = deactivate;
//# sourceMappingURL=languageserver.js.map