export interface KeyboardNavigatorCallbacks {
  onSelectNode?: (nodeId: string) => void;
  onDeleteSelected?: (nodeId: string) => void;
  onConnect?: (sourceId: string, targetId: string) => void;
  onAnnounce?: (message: string) => void;
}

/**
 * Manages WCAG 2.1 AA/AAA compliant keyboard navigation across canvas nodes and handles.
 */
export class CanvasKeyboardNavigator {
  private static readonly _KEY_ARROW_UP = 'ArrowUp';
  private static readonly _KEY_ARROW_DOWN = 'ArrowDown';
  private static readonly _KEY_ARROW_LEFT = 'ArrowLeft';
  private static readonly _KEY_ARROW_RIGHT = 'ArrowRight';
  private static readonly _KEY_TAB = 'Tab';
  private static readonly _KEY_ENTER = 'Enter';
  private static readonly _KEY_SPACE = ' ';
  private static readonly _KEY_DELETE = 'Delete';
  private static readonly _KEY_BACKSPACE = 'Backspace';
  private static readonly _KEY_ESCAPE = 'Escape';

  private static readonly _ANNOUNCE_SELECTED = 'Selected node ';
  private static readonly _ANNOUNCE_CONNECT_STARTED = 'Connection started from node ';
  private static readonly _ANNOUNCE_CONNECTED = 'Connected node ';
  private static readonly _ANNOUNCE_TO = ' to ';
  private static readonly _ANNOUNCE_CANCELLED = 'Connection mode cancelled.';
  private static readonly _ANNOUNCE_DELETED = 'Deleted node ';

  public constructor(callbacks?: KeyboardNavigatorCallbacks) {
    this._callbacks = callbacks ?? {};
    this._selectedNodeId = null;
    this._pendingSourceId = null;
  }

  /**
   * Processes a keyboard event and executes accessibility traversal or actions.
   */
  public handleKeyDown(event: KeyboardEvent, nodeIds: string[]): boolean {
    if (this._isFormElementTarget(event)) {
      return false;
    }
    if (nodeIds.length === 0) {
      return false;
    }
    return this._dispatchKeyAction(event, nodeIds);
  }

  /**
   * Returns currently focused/selected node identifier.
   */
  public getSelectedNodeId(): string | null {
    return this._selectedNodeId;
  }

  /**
   * Programmatically sets the selected node and announces change.
   */
  public setSelectedNodeId(nodeId: string | null): void {
    this._selectedNodeId = nodeId;
    if (nodeId && this._callbacks.onSelectNode) {
      this._callbacks.onSelectNode(nodeId);
    }
  }

  /**
   * Returns active pending source node waiting for connection target.
   */
  public getPendingConnectionSource(): string | null {
    return this._pendingSourceId;
  }

  /**
   * Aborts pending connection mode.
   */
  public cancelConnection(): void {
    this._pendingSourceId = null;
    if (this._callbacks.onAnnounce) {
      this._callbacks.onAnnounce(CanvasKeyboardNavigator._ANNOUNCE_CANCELLED);
    }
  }

  /**
   * Updates delegate action callbacks.
   */
  public setCallbacks(callbacks: KeyboardNavigatorCallbacks): void {
    this._callbacks = callbacks;
  }

  private _callbacks: KeyboardNavigatorCallbacks;
  private _selectedNodeId: string | null;
  private _pendingSourceId: string | null;

  private _isFormElementTarget(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  }

  private _dispatchKeyAction(event: KeyboardEvent, nodeIds: string[]): boolean {
    switch (event.key) {
      case CanvasKeyboardNavigator._KEY_TAB:
      case CanvasKeyboardNavigator._KEY_ARROW_RIGHT:
      case CanvasKeyboardNavigator._KEY_ARROW_DOWN:
        return this._handleNextNode(event, nodeIds);
      case CanvasKeyboardNavigator._KEY_ARROW_LEFT:
      case CanvasKeyboardNavigator._KEY_ARROW_UP:
        return this._handlePreviousNode(event, nodeIds);
      case CanvasKeyboardNavigator._KEY_ENTER:
      case CanvasKeyboardNavigator._KEY_SPACE:
        return this._handleActionKey(event);
      case CanvasKeyboardNavigator._KEY_DELETE:
      case CanvasKeyboardNavigator._KEY_BACKSPACE:
        return this._handleDeleteKey(event);
      case CanvasKeyboardNavigator._KEY_ESCAPE:
        return this._handleEscapeKey(event);
      default:
        return false;
    }
  }

  private _handleNextNode(event: KeyboardEvent, nodeIds: string[]): boolean {
    event.preventDefault();
    const currentIndex = this._selectedNodeId ? nodeIds.indexOf(this._selectedNodeId) : -1;
    const nextIndex = (currentIndex + 1) % nodeIds.length;
    this._selectNodeByIndex(nodeIds, nextIndex);
    return true;
  }

  private _handlePreviousNode(event: KeyboardEvent, nodeIds: string[]): boolean {
    event.preventDefault();
    const currentIndex = this._selectedNodeId ? nodeIds.indexOf(this._selectedNodeId) : 0;
    const prevIndex = (currentIndex - 1 + nodeIds.length) % nodeIds.length;
    this._selectNodeByIndex(nodeIds, prevIndex);
    return true;
  }

  private _handleActionKey(event: KeyboardEvent): boolean {
    if (!this._selectedNodeId) return false;
    event.preventDefault();
    if (!this._pendingSourceId) {
      this._pendingSourceId = this._selectedNodeId;
      this._announceAction(
        CanvasKeyboardNavigator._ANNOUNCE_CONNECT_STARTED + this._selectedNodeId
      );
      return true;
    }
    if (this._pendingSourceId !== this._selectedNodeId) {
      this._completeConnection(this._pendingSourceId, this._selectedNodeId);
      return true;
    }
    return false;
  }

  private _handleDeleteKey(event: KeyboardEvent): boolean {
    if (!this._selectedNodeId) return false;
    event.preventDefault();
    const removedId = this._selectedNodeId;
    this._selectedNodeId = null;
    if (this._callbacks.onDeleteSelected) {
      this._callbacks.onDeleteSelected(removedId);
    }
    this._announceAction(CanvasKeyboardNavigator._ANNOUNCE_DELETED + removedId);
    return true;
  }

  private _handleEscapeKey(event: KeyboardEvent): boolean {
    if (this._pendingSourceId) {
      event.preventDefault();
      this.cancelConnection();
      return true;
    }
    return false;
  }

  private _selectNodeByIndex(nodeIds: string[], index: number): void {
    const nextId = nodeIds[index];
    if (!nextId) return;
    this._selectedNodeId = nextId;
    if (this._callbacks.onSelectNode) {
      this._callbacks.onSelectNode(nextId);
    }
    this._announceAction(CanvasKeyboardNavigator._ANNOUNCE_SELECTED + nextId);
  }

  private _completeConnection(sourceId: string, targetId: string): void {
    if (this._callbacks.onConnect) {
      this._callbacks.onConnect(sourceId, targetId);
    }
    this._announceAction(
      CanvasKeyboardNavigator._ANNOUNCE_CONNECTED +
        sourceId +
        CanvasKeyboardNavigator._ANNOUNCE_TO +
        targetId
    );
    this._pendingSourceId = null;
  }

  private _announceAction(message: string): void {
    if (this._callbacks.onAnnounce) {
      this._callbacks.onAnnounce(message);
    }
  }
}

