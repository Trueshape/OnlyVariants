import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { TabDef } from '../hooks/useTabs';
import '../styles/TabBar.css';

interface TabBarProps {
  tabs: TabDef[];
  activeId: string;
  counts: Record<string, number>;
  onSelect: (id: string) => void;
  canRename: (id: string) => boolean;
  canDelete: (id: string) => boolean;
  onRename: (id: string, name: string) => void;
  onMove: (id: string, beforeId: string | null) => void;
  onAddList: (name: string) => string;
  onDelete: (id: string) => void;
}

export default function TabBar({
  tabs,
  activeId,
  counts,
  onSelect,
  canRename,
  canDelete,
  onRename,
  onMove,
  onAddList,
  onDelete,
}: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBeforeId, setDropBeforeId] = useState<string | null | undefined>(undefined);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const startRename = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab || !canRename(id)) return;
    setDraftName(tab.name);
    setEditingId(id);
    setMenu(null);
  };

  const commitRename = () => {
    if (editingId) onRename(editingId, draftName);
    setEditingId(null);
  };

  const askDelete = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    const n = counts[id] ?? 0;
    const msg =
      tab.kind === 'view'
        ? `Eliminare la tab "${tab.name}"?`
        : n === 0
          ? `Eliminare la lista "${tab.name}"?`
          : `Eliminare "${tab.name}"? ${n === 1 ? '1 carta verrà rimossa' : `${n} carte verranno rimosse`} dalla lista.`;
    if (window.confirm(msg)) {
      if (activeId === id) onSelect('all');
      onDelete(id);
    }
    setMenu(null);
  };

  const handleAdd = () => {
    const id = onAddList('New list');
    onSelect(id);
    setDraftName('New list');
    setEditingId(id);
  };

  // Drop target: before the hovered tab, or before the next one if the
  // pointer is past its horizontal midpoint (null = drop at the end).
  const handleDragOverTab = (e: React.DragEvent, id: string, index: number) => {
    if (!dragId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientX > rect.left + rect.width / 2;
    const target = after ? (tabs[index + 1]?.id ?? null) : id;
    setDropBeforeId(target === dragId ? undefined : target);
  };

  const handleDrop = () => {
    if (dragId && dropBeforeId !== undefined) onMove(dragId, dropBeforeId);
    setDragId(null);
    setDropBeforeId(undefined);
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    // Ignore clicks landing inside the menu itself, otherwise this closes it
    // before the menu item's click can register.
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <div className="tabs" onDragOver={(e) => dragId && e.preventDefault()} onDrop={handleDrop}>
      {tabs.map((tab, index) => {
        const isEditing = editingId === tab.id;
        return (
          <div
            key={tab.id}
            className={`tab-slot ${dropBeforeId === tab.id ? 'drop-before' : ''}`}
            draggable={!isEditing}
            onDragStart={(e) => {
              setDragId(tab.id);
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tab.id);
              }
            }}
            onDragEnd={() => {
              setDragId(null);
              setDropBeforeId(undefined);
            }}
            onDragOver={(e) => handleDragOverTab(e, tab.id, index)}
          >
            {isEditing ? (
              <input
                ref={editInputRef}
                className="tab tab-edit"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingId(null);
                }}
              />
            ) : (
              <button
                className={`tab ${activeId === tab.id ? 'active' : ''} ${dragId === tab.id ? 'dragging' : ''}`}
                onClick={() => onSelect(tab.id)}
                onDoubleClick={() => startRename(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ id: tab.id, x: e.clientX, y: e.clientY });
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft' && index > 0) {
                    e.preventDefault();
                    onMove(tab.id, tabs[index - 1].id);
                  } else if (
                    (e.ctrlKey || e.metaKey) &&
                    e.key === 'ArrowRight' &&
                    index < tabs.length - 1
                  ) {
                    e.preventDefault();
                    onMove(tab.id, tabs[index + 2]?.id ?? null);
                  } else if (e.key === 'F2' && canRename(tab.id)) {
                    e.preventDefault();
                    startRename(tab.id);
                  }
                }}
                title={
                  canRename(tab.id)
                    ? 'Double-click to rename, right-click for options, Ctrl+Arrows to reorder'
                    : 'Ctrl+Arrows to reorder'
                }
              >
                {tab.name} ({counts[tab.id] ?? 0})
              </button>
            )}
          </div>
        );
      })}

      <button
        className={`tab tab-add ${dropBeforeId === null ? 'drop-before' : ''}`}
        onClick={handleAdd}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          setDropBeforeId(null);
        }}
        title="New list"
      >
        <Plus size={16} />
      </button>

      {menu &&
        createPortal(
          <div ref={menuRef} className="tab-menu" style={{ left: menu.x, top: menu.y }} role="menu">
            {canRename(menu.id) && (
              <button className="tab-menu-item" onClick={() => startRename(menu.id)}>
                <Pencil size={14} /> Rename
              </button>
            )}
            {canDelete(menu.id) && (
              <button className="tab-menu-item danger" onClick={() => askDelete(menu.id)}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            {!canRename(menu.id) && !canDelete(menu.id) && (
              <div className="tab-menu-empty">Pinned tab</div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
