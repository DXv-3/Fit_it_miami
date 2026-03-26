import React, { useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Command as CmdIcon } from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  category: string;
  shortcut?: string[];
  onSelect: () => void | Promise<any>;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  commands: Command[];
}

// --- Styled Components ---
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
`;

const PaletteContainer = styled(motion.div)`
  width: 100%;
  max-width: 640px;
  background: #111111;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
`;

const SearchHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 18px;
  font-weight: 400;
  font-family: 'Inter', system-ui, sans-serif;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ListContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  
  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const CategoryLabel = styled.div`
  padding: 12px 12px 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ListItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin: 2px 0;
  border-radius: 8px;
  cursor: pointer;
  background: ${props => props.$selected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'};
  color: ${props => props.$selected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'};
  transition: background 0.1s ease, color 0.1s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }
`;

const CommandTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ShortcutContainer = styled.div`
  display: flex;
  gap: 4px;
`;

const ShortcutKey = styled.kbd`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Geist Mono', monospace;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
`;

// --- Component ---
export default function CommandPalette({ isOpen, setIsOpen, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Filter and Group Commands
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(search.toLowerCase()) || 
      cmd.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    return filteredCommands.reduce((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    }, {} as Record<string, Command[]>);
  }, [filteredCommands]);

  // Flatten for Virtualization
  type FlattenedItem = 
    | { type: 'header'; title: string }
    | { type: 'command'; command: Command; index: number };

  const flattenedItems = useMemo(() => {
    const items: FlattenedItem[] = [];
    let cmdIndex = 0;
    for (const [category, cmds] of Object.entries(groupedCommands)) {
      items.push({ type: 'header', title: category });
      for (const cmd of cmds) {
        items.push({ type: 'command', command: cmd, index: cmdIndex++ });
      }
    }
    return items;
  }, [groupedCommands]);

  // Reset selection on search
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Virtualizer Setup
  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => flattenedItems[index].type === 'header' ? 36 : 48,
    overscan: 5,
  });

  // Scroll to selected item
  useEffect(() => {
    if (!isOpen) return;
    const actualIndex = flattenedItems.findIndex(
      item => item.type === 'command' && item.index === selectedIndex
    );
    if (actualIndex !== -1) {
      rowVirtualizer.scrollToIndex(actualIndex, { align: 'auto' });
    }
  }, [selectedIndex, flattenedItems, rowVirtualizer, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalCommands = filteredCommands.length;
    if (totalCommands === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalCommands);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalCommands) % totalCommands);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedCmd = filteredCommands[selectedIndex];
      if (selectedCmd) {
        handleSelect(selectedCmd);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleSelect = (cmd: Command) => {
    // Optimistic UI: Close immediately
    setIsOpen(false);
    
    // Execute the action (which might return a Promise for background processing)
    const result = cmd.onSelect();
    
    // If it's a promise, the parent component should handle the loading state
    // (e.g., showing a Vercel-style pulsing indicator in the main UI)
    if (result instanceof Promise) {
      result.catch(console.error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setIsOpen(false)}
        >
          <PaletteContainer
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <SearchHeader>
              <Search size={20} color="rgba(255,255,255,0.4)" />
              <SearchInput
                ref={inputRef}
                placeholder="Type a command or search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <ShortcutKey>ESC</ShortcutKey>
            </SearchHeader>

            <ListContainer ref={parentRef}>
              {flattenedItems.length === 0 ? (
                <EmptyState>No commands found for "{search}"</EmptyState>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = flattenedItems[virtualRow.index];
                    
                    return (
                      <div
                        key={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {item.type === 'header' ? (
                          <CategoryLabel>{item.title}</CategoryLabel>
                        ) : (
                          <ListItem
                            $selected={selectedIndex === item.index}
                            onClick={() => handleSelect(item.command)}
                            onMouseEnter={() => setSelectedIndex(item.index)}
                          >
                            <CommandTitle>
                              <CmdIcon size={16} color={selectedIndex === item.index ? '#fff' : 'rgba(255,255,255,0.4)'} />
                              {item.command.title}
                            </CommandTitle>
                            {item.command.shortcut && (
                              <ShortcutContainer>
                                {item.command.shortcut.map((key, i) => (
                                  <ShortcutKey key={i}>{key}</ShortcutKey>
                                ))}
                              </ShortcutContainer>
                            )}
                          </ListItem>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ListContainer>
          </PaletteContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
}
