import * as vscode from 'vscode';
import { NoteStore } from '../core/note-store';
import { Note, DESIGN_TOKENS } from '../core/types';
import { timeAgo, escapeHtml } from '../utils/helpers';

export class NoteHoverProvider implements vscode.HoverProvider {
  constructor(private store: NoteStore) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | null {
    const notes = this.store.queryPoint(
      document.uri.fsPath,
      position.line,
      position.character
    );

    if (notes.length === 0) {
      return null;
    }

    const markdownParts = notes.map(note => this.renderNote(note));
    const combined = new vscode.MarkdownString(markdownParts.join('\n\n---\n\n'));
    combined.isTrusted = true;
    combined.supportHtml = true;

    const range = this.computeUnionRange(notes);
    return new vscode.Hover(combined, range);
  }

  private renderNote(note: Note): string {
    const editUri = vscode.Uri.parse(
      `command:zeluza-smart-note.editNote?${encodeURIComponent(JSON.stringify(note.id))}`
    );
    const deleteUri = vscode.Uri.parse(
      `command:zeluza-smart-note.deleteNote?${encodeURIComponent(JSON.stringify(note.id))}`
    );

    const lines: string[] = [
      `**Note** — *${timeAgo(note.updatedAt)}*`,
      '',
      note.content,
      '',
      `[Edit](${editUri}) | [Delete](${deleteUri})`,
    ];

    return lines.join('\n');
  }

  private computeUnionRange(notes: Note[]): vscode.Range {
    let startLine = Number.MAX_SAFE_INTEGER;
    let startChar = Number.MAX_SAFE_INTEGER;
    let endLine = 0;
    let endChar = 0;

    for (const note of notes) {
      if (note.position.startLine < startLine ||
          (note.position.startLine === startLine && note.position.startChar < startChar)) {
        startLine = note.position.startLine;
        startChar = note.position.startChar;
      }
      if (note.position.endLine > endLine ||
          (note.position.endLine === endLine && note.position.endChar > endChar)) {
        endLine = note.position.endLine;
        endChar = note.position.endChar;
      }
    }

    return new vscode.Range(startLine, startChar, endLine, endChar);
  }
}
