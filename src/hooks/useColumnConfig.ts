import { useState, useEffect, useCallback } from 'react';

export interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

interface StoredConfig {
  order: string[];
  visible: string[];
}

export function useColumnConfig(storageKey: string, defaultColumns: ColumnConfig[]) {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    new Set(defaultColumns.filter(c => c.defaultVisible).map(c => c.id))
  );

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const config: StoredConfig = JSON.parse(stored);
        
        // Restore order
        if (config.order && config.order.length > 0) {
          const orderedColumns = config.order
            .map(id => defaultColumns.find(c => c.id === id))
            .filter((c): c is ColumnConfig => c !== undefined);
          
          // Add any new columns that weren't in storage
          const storedIds = new Set(config.order);
          const newColumns = defaultColumns.filter(c => !storedIds.has(c.id));
          
          setColumns([...orderedColumns, ...newColumns]);
        }
        
        // Restore visibility
        if (config.visible) {
          const restoredVisible = new Set(config.visible);
          defaultColumns.forEach(column => {
            if (column.defaultVisible && !config.order?.includes(column.id)) {
              restoredVisible.add(column.id);
            }
          });
          // Validate: at least one column must be visible among known columns
          const validVisibleCount = defaultColumns.filter(c => restoredVisible.has(c.id)).length;
          if (validVisibleCount > 0) {
            setVisibleIds(restoredVisible);
          }
          // else: keep defaults
        }
      }
    } catch (error) {
      console.error('Error loading column config:', error);
    }
  }, [storageKey, defaultColumns]);

  // Save to localStorage when config changes
  const saveConfig = useCallback((newColumns: ColumnConfig[], newVisibleIds: Set<string>) => {
    try {
      const config: StoredConfig = {
        order: newColumns.map(c => c.id),
        visible: Array.from(newVisibleIds)
      };
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving column config:', error);
    }
  }, [storageKey]);

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    setVisibleIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        // Prevent removing the last visible column
        if (newSet.size <= 1) return prev;
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      saveConfig(columns, newSet);
      return newSet;
    });
  }, [columns, saveConfig]);

  // Reorder columns
  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [removed] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, removed);
      saveConfig(newColumns, visibleIds);
      return newColumns;
    });
  }, [visibleIds, saveConfig]);

  // Set columns directly (for drag-and-drop)
  const setColumnOrder = useCallback((newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    saveConfig(newColumns, visibleIds);
  }, [visibleIds, saveConfig]);

  // Reset to defaults
  const resetColumns = useCallback(() => {
    setColumns(defaultColumns);
    const defaultVisibleIds = new Set(defaultColumns.filter(c => c.defaultVisible).map(c => c.id));
    setVisibleIds(defaultVisibleIds);
    localStorage.removeItem(storageKey);
  }, [defaultColumns, storageKey]);

  // Get visible columns in order
  const visibleColumns = columns.filter(c => visibleIds.has(c.id));

  return {
    columns,
    visibleColumns,
    visibleIds,
    toggleColumn,
    reorderColumns,
    setColumnOrder,
    resetColumns,
    isVisible: (id: string) => visibleIds.has(id)
  };
}
