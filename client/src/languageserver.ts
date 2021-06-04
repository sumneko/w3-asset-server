import * as path from 'path';
import * as os from 'os';
import {
    workspace as Workspace,
    ExtensionContext,
    env as Env,
    commands as Commands,
    TextDocument,
    WorkspaceFolder,
    Uri,
    FileDecoration,
    window,
    workspace,
} from 'vscode';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    DocumentSelector,
} from 'vscode-languageclient/node';

let defaultClient: LanguageClient;
let clients: Map<string, LanguageClient> = new Map();

let _sortedWorkspaceFolders: string[] | undefined;
function sortedWorkspaceFolders(): string[] {
    if (_sortedWorkspaceFolders === void 0) {
        _sortedWorkspaceFolders = Workspace.workspaceFolders ? Workspace.workspaceFolders.map(folder => {
            let result = folder.uri.toString();
            if (result.charAt(result.length - 1) !== '/') {
                result = result + '/';
            }
            return result;
        }).sort(
            (a, b) => {
                return a.length - b.length;
            }
        ) : [];
    }
    return _sortedWorkspaceFolders;
}
Workspace.onDidChangeWorkspaceFolders(() => _sortedWorkspaceFolders = undefined);

function getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
    let sorted = sortedWorkspaceFolders();
    for (let element of sorted) {
        let uri = folder.uri.toString();
        if (uri.charAt(uri.length - 1) !== '/') {
            uri = uri + '/';
        }
        if (uri.startsWith(element)) {
            return Workspace.getWorkspaceFolder(Uri.parse(element))!;
        }
    }
    return folder;
}

function start(context: ExtensionContext, documentSelector: DocumentSelector, folder: WorkspaceFolder): LanguageClient {
    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: documentSelector,
        workspaceFolder: folder,
        progressOnInitialization: true,
        markdown: {
            isTrusted: true,
        },
    };

    let config = Workspace.getConfiguration(undefined, folder);
    let command: string;
    let platform: string = os.platform();
    switch (platform) {
        case "win32":
            command = context.asAbsolutePath(
                path.join(
                    'server',
                    'bin',
                    'Windows',
                    'w3-asset-server.exe'
                )
            );
            break;
    }

    let serverOptions: ServerOptions = {
        command: command,
        args: [
            '-E',
            context.asAbsolutePath(path.join(
                'server',
                'main.lua',
            ))
        ]
    };

    let client = new LanguageClient(
        'W3-asset',
        'W3-asset',
        serverOptions,
        clientOptions
    );

    client.registerProposedFeatures();
    client.start();

    return client;
}

function showAssetID() {
    let badgeMap = new Map<string, string|boolean>();
    window.registerFileDecorationProvider({
        provideFileDecoration: async (uri: Uri): Promise<FileDecoration> => {
            badgeMap.set(uri.toString(), true);
            if (!uri.path.toLowerCase().endsWith('.asset')) {
                badgeMap.set(uri.toString(), false);
                return;
            }
            let text = (await workspace.fs.readFile(uri)).toString();
            let results = text.match(/ID:\s*(".*")/);
            if (!results) {
                badgeMap.set(uri.toString(), false);
                return;
            }
            let id: string = '《' + eval(results[1]) + '》';
            let fd = new FileDecoration();
            fd.badge   = id.substr(0, 2);
            fd.tooltip = id;
            badgeMap.set(uri.toString(), id);
            return fd
        }
    })

    function sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    for (let index = 1; index < 10; index++) {
        window.registerFileDecorationProvider({
            provideFileDecoration: async (uri: Uri): Promise<FileDecoration> => {
                while (true) {
                    let badge = badgeMap.get(uri.toString());
                    if (badge === false) {
                        return;
                    }
                    if (typeof (badge) == 'string') {
                        let piece = badge.substr(index * 2, 2);
                        if (piece === '') {
                            return;
                        }
                        let fd = new FileDecoration();
                        fd.badge = piece;
                        return fd
                    }
                    await sleep(0.1);
                }
            }
        })
    }
}

export function activate(context: ExtensionContext) {
    function didOpenTextDocument(document: TextDocument): void {
        // We are only interested in language mode text
        if (document.languageId !== 'asset') {
            return;
        }

        if (!defaultClient) {
            defaultClient = start(context, [
                { language: 'asset' }
            ], null);
            return;
        }
    }

    Workspace.onDidOpenTextDocument(didOpenTextDocument);
    Workspace.textDocuments.forEach(didOpenTextDocument);

    showAssetID()
}

export function deactivate(): Thenable<void> | undefined {
    let promises: Thenable<void>[] = [];
    if (defaultClient) {
        promises.push(defaultClient.stop());
    }
    for (let client of clients.values()) {
        promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
}
