// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { CanvasKeyboardNavigator } from '@/components/canvas/canvas_keyboard_navigator';

describe('CanvasKeyboardNavigator', () => {
  it('test_handleKeyDown_whenTargetIsInputOrTextarea_ignoresEvent', () => {
    const navigator = new CanvasKeyboardNavigator();
    const inputElement = document.createElement('input');

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    Object.defineProperty(event, 'target', { value: inputElement });

    const handled = navigator.handleKeyDown(event, ['n1', 'n2']);
    expect(handled).toBe(false);
  });

  it('test_handleKeyDown_whenNodeListEmpty_returnsFalse', () => {
    const navigator = new CanvasKeyboardNavigator();
    const event = new KeyboardEvent('keydown', { key: 'Tab' });
    const handled = navigator.handleKeyDown(event, []);
    expect(handled).toBe(false);
  });

  it('test_handleKeyDown_tabAndArrowKeys_cyclesThroughNodes', () => {
    const onSelect = vi.fn();
    const onAnnounce = vi.fn();
    const navigator = new CanvasKeyboardNavigator({
      onSelectNode: onSelect,
      onAnnounce: onAnnounce,
    });

    const nodes = ['node_a', 'node_b', 'node_c'];

    const eventTab = new KeyboardEvent('keydown', { key: 'Tab' });
    navigator.handleKeyDown(eventTab, nodes);
    expect(navigator.getSelectedNodeId()).toBe('node_a');
    expect(onSelect).toHaveBeenCalledWith('node_a');
    expect(onAnnounce).toHaveBeenCalledWith('Selected node node_a');

    const eventArrow = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    navigator.handleKeyDown(eventArrow, nodes);
    expect(navigator.getSelectedNodeId()).toBe('node_b');

    const eventPrev = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    navigator.handleKeyDown(eventPrev, nodes);
    expect(navigator.getSelectedNodeId()).toBe('node_a');
  });

  it('test_handleKeyDown_enterInitiatesAndCompletesConnection', () => {
    const onConnect = vi.fn();
    const onAnnounce = vi.fn();
    const navigator = new CanvasKeyboardNavigator({
      onConnect: onConnect,
      onAnnounce: onAnnounce,
    });
    const nodes = ['source_node', 'target_node'];

    navigator.setSelectedNodeId('source_node');

    const enter1 = new KeyboardEvent('keydown', { key: 'Enter' });
    navigator.handleKeyDown(enter1, nodes);
    expect(navigator.getPendingConnectionSource()).toBe('source_node');
    expect(onAnnounce).toHaveBeenCalledWith('Connection started from node source_node');

    // Switch selection to target_node
    navigator.setSelectedNodeId('target_node');
    const enter2 = new KeyboardEvent('keydown', { key: 'Enter' });
    navigator.handleKeyDown(enter2, nodes);

    expect(onConnect).toHaveBeenCalledWith('source_node', 'target_node');
    expect(navigator.getPendingConnectionSource()).toBeNull();
  });

  it('test_handleKeyDown_escapeCancelsConnection', () => {
    const onAnnounce = vi.fn();
    const navigator = new CanvasKeyboardNavigator({ onAnnounce });
    navigator.setSelectedNodeId('node_x');

    const space = new KeyboardEvent('keydown', { key: ' ' });
    navigator.handleKeyDown(space, ['node_x']);
    expect(navigator.getPendingConnectionSource()).toBe('node_x');

    const escape = new KeyboardEvent('keydown', { key: 'Escape' });
    navigator.handleKeyDown(escape, ['node_x']);
    expect(navigator.getPendingConnectionSource()).toBeNull();
    expect(onAnnounce).toHaveBeenCalledWith('Connection mode cancelled.');
  });

  it('test_handleKeyDown_deleteRemovesSelectedNode', () => {
    const onDelete = vi.fn();
    const onAnnounce = vi.fn();
    const navigator = new CanvasKeyboardNavigator({ onDeleteSelected: onDelete, onAnnounce });
    navigator.setSelectedNodeId('node_to_delete');

    const del = new KeyboardEvent('keydown', { key: 'Delete' });
    navigator.handleKeyDown(del, ['node_to_delete']);

    expect(onDelete).toHaveBeenCalledWith('node_to_delete');
    expect(navigator.getSelectedNodeId()).toBeNull();
    expect(onAnnounce).toHaveBeenCalledWith('Deleted node node_to_delete');
  });

  it('test_handleKeyDown_unrecognizedKey_returnsFalse', () => {
    const navigator = new CanvasKeyboardNavigator();
    const keyZ = new KeyboardEvent('keydown', { key: 'z' });
    expect(navigator.handleKeyDown(keyZ, ['node_1'])).toBe(false);
  });
});

