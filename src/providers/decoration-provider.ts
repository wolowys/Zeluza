import * as vscode from 'vscode';
import { NoteStore } from '../core/note-store';
import { NoteEventType, DESIGN_TOKENS } from '../core/types';

export class DecorationProvider implements vscode.Disposable {
  private decorationType: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor(private store: NoteStore, private extensionUri: vscode.Uri) {

    this.decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: DESIGN_TOKENS.colors.note.highlight,
      borderColor: DESIGN_TOKENS.colors.note.border,
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      overviewRulerColor: DESIGN_TOKENS.colors.note.gutterIcon,
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      gutterIconSize: '80%',
      isWholeLine: false,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    this.disposables.push(
      store.onDidChange(() => this.refreshAllEditors())
    );

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshAllEditors())
    );

    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this.refreshAllEditors())
    );

    this.refreshAllEditors();
  }

  refreshAllEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.refreshEditor(editor);
    }
  }

  private refreshEditor(editor: vscode.TextEditor): void {
    const filePath = editor.document.uri.fsPath;
    const notes = this.store.getNotesForFile(filePath);

    const decorations: vscode.DecorationOptions[] = notes.map(note => {
      const range = new vscode.Range(
        note.position.startLine,
        note.position.startChar,
        note.position.endLine,
        note.position.endChar
      );

      return {
        range,
        hoverMessage: undefined,
      };
    });

    editor.setDecorations(this.decorationType, decorations);
  }

  dispose(): void {
    this.decorationType.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
