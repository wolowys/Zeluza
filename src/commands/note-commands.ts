import * as vscode from 'vscode';
import { NoteStore } from '../core/note-store';

export function registerNoteCommands(
  context: vscode.ExtensionContext,
  store: NoteStore,
  refreshSidebar: () => void
): void {

  context.subscriptions.push(
    vscode.commands.registerCommand('zeluza-smart-note.addNote', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor. Open a file first.');
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showWarningMessage('Select some code first, then add a note.');
        return;
      }

      const content = await vscode.window.showInputBox({
        title: '📝 Add Note',
        prompt: 'What do you want to note about this code?',
        placeHolder: 'Type your note here...',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Note content cannot be empty.';
          }
          return null;
        },
      });

      if (!content) { return; }

      const anchorText = editor.document.getText(selection);
      const filePath = editor.document.uri.fsPath;

      store.createNote(filePath, selection, content.trim(), anchorText);
      refreshSidebar();

      vscode.window.showInformationMessage('📝 Note added!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zeluza-smart-note.editNote', async (noteId: string) => {
      const note = store.getNoteById(noteId);
      if (!note) {
        vscode.window.showErrorMessage('Note not found.');
        return;
      }

      const newContent = await vscode.window.showInputBox({
        title: '✏️ Edit Note',
        prompt: 'Update your note:',
        value: note.content,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Note content cannot be empty.';
          }
          return null;
        },
      });

      if (newContent === undefined) { return; }

      store.updateContent(noteId, newContent.trim());
      refreshSidebar();

      vscode.window.showInformationMessage('✏️ Note updated!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zeluza-smart-note.deleteNote', async (noteId: string) => {
      const note = store.getNoteById(noteId);
      if (!note) {
        vscode.window.showErrorMessage('Note not found.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        'Delete this note?',
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') { return; }

      store.remove(noteId);
      refreshSidebar();

      vscode.window.showInformationMessage('🗑️ Note deleted.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zeluza-smart-note.goToNote', async (noteId: string) => {
      const note = store.getNoteById(noteId);
      if (!note) {
        vscode.window.showErrorMessage('Note not found.');
        return;
      }

      const uri = vscode.Uri.file(note.filePath);
      const range = new vscode.Range(
        note.position.startLine,
        note.position.startChar,
        note.position.endLine,
        note.position.endChar
      );

      const editor = await vscode.window.showTextDocument(uri, {
        selection: range,
        preserveFocus: false,
      });

      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    })
  );
}
