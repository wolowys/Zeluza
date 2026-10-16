import * as vscode from 'vscode';
import { NoteStore } from './core/note-store';
import { NoteHoverProvider } from './providers/hover-provider';
import { DecorationProvider } from './providers/decoration-provider';
import { SidebarProvider } from './views/sidebar-provider';
import { registerNoteCommands } from './commands/note-commands';

let noteStore: NoteStore;
let decorationProvider: DecorationProvider;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Zeluza Smart Note] Activating...');

  noteStore = new NoteStore();
  await noteStore.initialize();

  const sidebarProvider = new SidebarProvider(context.extensionUri, noteStore);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  const refreshSidebar = () => sidebarProvider.refresh();

  registerNoteCommands(context, noteStore, refreshSidebar);

  const hoverProvider = new NoteHoverProvider(noteStore);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: 'file' },
      hoverProvider
    )
  );

  decorationProvider = new DecorationProvider(noteStore, context.extensionUri);
  context.subscriptions.push(decorationProvider);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      noteStore.handleDocumentChange(event);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      refreshSidebar();
    })
  );

  context.subscriptions.push(
    noteStore.onDidChange(() => {
      refreshSidebar();
    })
  );

  console.log('[Zeluza Smart Note] Activated with', noteStore.count(), 'notes loaded.');
}

export async function deactivate() {
  if (noteStore) {
    await noteStore.dispose();
  }
  if (decorationProvider) {
    decorationProvider.dispose();
  }
}
