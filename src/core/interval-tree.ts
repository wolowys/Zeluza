import { Note } from './types';

const MAX_CHAR = 1_000_000;

function encode(line: number, char: number): number {
  return line * MAX_CHAR + char;
}

interface TreeNode {
  low: number;
  high: number;
  maxEnd: number;
  noteId: string;
  left: TreeNode | null;
  right: TreeNode | null;
  height: number;
}

export class IntervalTree {
  private root: TreeNode | null = null;
  private size: number = 0;

  insert(note: Note): void {
    const low = encode(note.position.startLine, note.position.startChar);
    const high = encode(note.position.endLine, note.position.endChar);
    this.root = this._insert(this.root, low, high, note.id);
    this.size++;
  }

  remove(noteId: string): boolean {
    const result = this._remove(this.root, noteId);
    if (result.found) {
      this.root = result.node;
      this.size--;
      return true;
    }
    return false;
  }

  queryPoint(line: number, char: number): string[] {
    const point = encode(line, char);
    const results: string[] = [];
    this._queryPoint(this.root, point, results);
    return results;
  }

  queryRange(startLine: number, startChar: number, endLine: number, endChar: number): string[] {
    const low = encode(startLine, startChar);
    const high = encode(endLine, endChar);
    const results: string[] = [];
    this._queryRange(this.root, low, high, results);
    return results;
  }

  get count(): number {
    return this.size;
  }

  clear(): void {
    this.root = null;
    this.size = 0;
  }

  private _height(node: TreeNode | null): number {
    return node ? node.height : 0;
  }

  private _maxEnd(node: TreeNode | null): number {
    return node ? node.maxEnd : -1;
  }

  private _balanceFactor(node: TreeNode): number {
    return this._height(node.left) - this._height(node.right);
  }

  private _updateNode(node: TreeNode): void {
    node.height = 1 + Math.max(this._height(node.left), this._height(node.right));
    node.maxEnd = Math.max(
      node.high,
      this._maxEnd(node.left),
      this._maxEnd(node.right)
    );
  }

  private _rotateRight(y: TreeNode): TreeNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this._updateNode(y);
    this._updateNode(x);
    return x;
  }

  private _rotateLeft(x: TreeNode): TreeNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this._updateNode(x);
    this._updateNode(y);
    return y;
  }

  private _balance(node: TreeNode): TreeNode {
    this._updateNode(node);
    const bf = this._balanceFactor(node);

    if (bf > 1) {
      if (this._balanceFactor(node.left!) < 0) {
        node.left = this._rotateLeft(node.left!);
      }
      return this._rotateRight(node);
    }
    if (bf < -1) {
      if (this._balanceFactor(node.right!) > 0) {
        node.right = this._rotateRight(node.right!);
      }
      return this._rotateLeft(node);
    }
    return node;
  }

  private _insert(node: TreeNode | null, low: number, high: number, noteId: string): TreeNode {
    if (!node) {
      return {
        low,
        high,
        maxEnd: high,
        noteId,
        left: null,
        right: null,
        height: 1,
      };
    }

    if (low < node.low || (low === node.low && noteId < node.noteId)) {
      node.left = this._insert(node.left, low, high, noteId);
    } else {
      node.right = this._insert(node.right, low, high, noteId);
    }

    return this._balance(node);
  }

  private _findMin(node: TreeNode): TreeNode {
    let current = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  private _remove(node: TreeNode | null, noteId: string): { node: TreeNode | null; found: boolean } {
    if (!node) {
      return { node: null, found: false };
    }

    if (node.noteId === noteId) {

      if (!node.left && !node.right) {
        return { node: null, found: true };
      }
      if (!node.left) {
        return { node: node.right, found: true };
      }
      if (!node.right) {
        return { node: node.left, found: true };
      }

      const successor = this._findMin(node.right);
      node.noteId = successor.noteId;
      node.low = successor.low;
      node.high = successor.high;
      const result = this._remove(node.right, successor.noteId);
      node.right = result.node;
      return { node: this._balance(node), found: true };
    }

    let result = this._remove(node.left, noteId);
    if (result.found) {
      node.left = result.node;
      return { node: this._balance(node), found: true };
    }

    result = this._remove(node.right, noteId);
    if (result.found) {
      node.right = result.node;
      return { node: this._balance(node), found: true };
    }

    return { node, found: false };
  }

  private _queryPoint(node: TreeNode | null, point: number, results: string[]): void {
    if (!node) { return; }

    if (node.maxEnd < point) { return; }

    this._queryPoint(node.left, point, results);

    if (point >= node.low && point <= node.high) {
      results.push(node.noteId);
    }

    if (point >= node.low) {
      this._queryPoint(node.right, point, results);
    }
  }

  private _queryRange(node: TreeNode | null, low: number, high: number, results: string[]): void {
    if (!node) { return; }

    if (node.maxEnd < low) { return; }

    this._queryRange(node.left, low, high, results);

    if (node.low <= high && node.high >= low) {
      results.push(node.noteId);
    }

    if (high >= node.low) {
      this._queryRange(node.right, low, high, results);
    }
  }
}
