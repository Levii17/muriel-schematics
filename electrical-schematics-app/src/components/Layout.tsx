import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import GridOnIcon from '@mui/icons-material/GridOn';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import TimelineIcon from '@mui/icons-material/Timeline';
import MouseIcon from '@mui/icons-material/Mouse';
import PanToolIcon from '@mui/icons-material/PanTool';
import DeleteIcon from '@mui/icons-material/Delete';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import SymbolLibrary from './SymbolLibrary';
import CanvasArea from './CanvasArea';
import PropertiesPanel from './PropertiesPanel';
import { useCanvasStore } from '../store/canvasStore';
import Tooltip from '@mui/material/Tooltip';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import { SymbolType } from '../types';

const drawerWidth = 260;

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [activeTool, setActiveTool] = useState<'select' | 'wire' | 'hand'>('select');
  const deleteSymbol = useCanvasStore((s) => s.deleteSymbol);
  const deleteWire = useCanvasStore((s) => s.deleteWire);
  const selectedElements = useCanvasStore((s) => s.selectedElements);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoom = useCanvasStore((s) => s.zoom);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const setPan = useCanvasStore((s) => s.setPan);
  // Drag state for symbol drag-and-drop
  const [draggedSymbolType, setDraggedSymbolType] = useState<SymbolType | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);

  const handleDelete = () => {
    selectedElements.forEach((id) => {
      deleteSymbol(id);
      deleteWire(id);
    });
    clearSelection();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); }
      else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); }
      else if (e.ctrlKey && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(Math.min(zoom + 0.1, 2)); }
      else if (e.ctrlKey && (e.key === '-' || e.key === '_')) { e.preventDefault(); setZoom(Math.max(zoom - 0.1, 0.2)); }
      else if (e.key === 's' || e.key === 'S') { setActiveTool('select'); }
      else if (e.key === 'h' || e.key === 'H') { setActiveTool('hand'); }
      else if (e.key === 'w' || e.key === 'W') { setActiveTool('wire'); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { handleDelete(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, handleDelete, undo, redo, setZoom, zoom]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f4f6fa' }}>
      <CssBaseline />
      {/* Top AppBar */}
      <AppBar position="fixed" color="primary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Box sx={{ width: 40, height: 40, mr: 2, display: 'flex', alignItems: 'center' }}>
            <img src="/logo192.png" alt="Muriel Logo" style={{ height: 36 }} />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Muriel Schematics
          </Typography>
          {/* Action buttons */}
          <IconButton color="inherit" size="large"><SaveIcon /></IconButton>
          <IconButton color="inherit" size="large"><CloudUploadIcon /></IconButton>
          <IconButton color="inherit" size="large"><CloudDownloadIcon /></IconButton>
        </Toolbar>
      </AppBar>
      {/* Sidebar: Symbol Library */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#fff' },
        }}
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            SANS Symbol Library
          </Typography>
          <Paper
            component="form"
            sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 2 }}
            elevation={0}
          >
            <InputBase sx={{ ml: 1, flex: 1 }} placeholder="Search symbols..." inputProps={{ 'aria-label': 'search symbols' }} />
          </Paper>
          <Divider sx={{ mb: 2 }} />
          <SymbolLibrary
            draggedSymbolType={draggedSymbolType}
            setDraggedSymbolType={setDraggedSymbolType}
            setDragPreviewPosition={setDragPreviewPosition}
          />
        </Box>
      </Drawer>
      {/* Main Area */}
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: '#f4f6fa', display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <Toolbar />
        {/* Toolbar above canvas */}
        <Paper elevation={1} sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1, gap: 1 }}>
          <Tooltip title="Select (S)"><IconButton color={activeTool === 'select' ? 'primary' : 'default'} onClick={() => setActiveTool('select')}><MouseIcon /></IconButton></Tooltip>
          <Tooltip title="Hand/Move (H)"><IconButton color={activeTool === 'hand' ? 'primary' : 'default'} onClick={() => setActiveTool('hand')}><PanToolIcon /></IconButton></Tooltip>
          <Tooltip title="Wire Tool (W)"><IconButton color={activeTool === 'wire' ? 'primary' : 'default'} onClick={() => setActiveTool('wire')}><TimelineIcon /></IconButton></Tooltip>
          <Tooltip title="Delete (Del)"><IconButton onClick={handleDelete}><DeleteIcon /></IconButton></Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Tooltip title="Undo (Ctrl+Z)"><IconButton onClick={undo}><UndoIcon /></IconButton></Tooltip>
          <Tooltip title="Redo (Ctrl+Y)"><IconButton onClick={redo}><RedoIcon /></IconButton></Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <Tooltip title="Toggle Grid"><IconButton color={showGrid ? 'primary' : 'default'} onClick={() => setShowGrid(v => !v)}><GridOnIcon /></IconButton></Tooltip>
          <Tooltip title="Toggle Snap to Grid"><IconButton color={snapToGrid ? 'primary' : 'default'} onClick={() => setSnapToGrid(v => !v)}><GridOnIcon sx={{ opacity: 0.5 }} /></IconButton></Tooltip>
          <Tooltip title="Zoom Out (Ctrl+-)"><IconButton onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))}><ZoomOutIcon /></IconButton></Tooltip>
          <Typography variant="body2" sx={{ mx: 1 }}>{Math.round(zoom * 100)}%</Typography>
          <Tooltip title="Zoom In (Ctrl+=)"><IconButton onClick={() => setZoom(Math.min(zoom + 0.1, 2))}><ZoomInIcon /></IconButton></Tooltip>
          <Tooltip title="Reset View"><IconButton onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><CenterFocusStrongIcon /></IconButton></Tooltip>
        </Paper>
        {/* Canvas Area */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Box sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, boxShadow: 1, overflow: 'hidden', minHeight: 0 }}>
            <CanvasArea
              wireToolActive={activeTool === 'wire'}
              selectToolActive={activeTool === 'select'}
              handToolActive={activeTool === 'hand'}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
              draggedSymbolType={draggedSymbolType}
              dragPreviewPosition={dragPreviewPosition}
              setDragPreviewPosition={setDragPreviewPosition}
            />
          </Box>
        </Box>
      </Box>
      {/* Properties Panel */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', bgcolor: '#f9fafb', borderLeft: '1px solid #e0e0e0' },
        }}
        anchor="right"
      >
        <Toolbar />
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          <PropertiesPanel />
        </Box>
      </Drawer>
    </Box>
  );
};

export default Layout;