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

function start(context: ExtensionContext, documentSelector: DocumentSelector): LanguageClient {
    // Options to control the language client
    let clientOptions: LanguageClientOptions = {
        // Register the server for plain text documents
        documentSelector: documentSelector,
        progressOnInitialization: true,
        markdown: {
            isTrusted: true,
        },
    };

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

    //client.registerProposedFeatures();
    client.start();

    return client;
}

// @ts-ignore
FileDecoration.validate = () => {
    return true;
}

function showAssetID() {
    let badgeMap = new Map<string, string|boolean>();
    window.registerFileDecorationProvider({
        provideFileDecoration: async (uri: Uri): Promise<FileDecoration> => {
            let id = badgeMap.get(uri.toString());
            if (typeof id == 'boolean') {
                return;
            }
            if (typeof id != 'string') {
                badgeMap.set(uri.toString(), true);
                if (!uri.path.toLowerCase().endsWith('.asset')) {
                    badgeMap.set(uri.toString(), false);
                    return;
                }
                let text = (await workspace.fs.readFile(uri)).toString();
                let results = text.match(/OwnerId:\s*(".*")/);
                if (!results) {
                    results = text.match(/ID:\s*(".*")/);
                }
                if (!results) {
                    badgeMap.set(uri.toString(), false);
                    return;
                }
                id = eval(results[1]);
            }
            if (typeof id == 'string') {
                let fd = new FileDecoration();
                fd.badge   = id;
                badgeMap.set(uri.toString(), id);
                return fd
            }
        }
    })
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
            ]);
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
