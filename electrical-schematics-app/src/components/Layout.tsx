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
import { SymbolType, ToolType } from '../types';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SettingsIcon from '@mui/icons-material/Settings';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { Switch } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { symbolCatalog } from '../symbols/catalog';
import SymbolSVG from './SymbolSVG'; // For fallback rendering

const drawerWidth = 260;

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
  const deleteSymbol = useCanvasStore((s) => s.deleteSymbol);
  const deleteWire = useCanvasStore((s) => s.deleteWire);
  const deleteTextElement = useCanvasStore((s) => s.deleteTextElement);
  const selectedElements = useCanvasStore((s) => s.selectedElements);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoom = useCanvasStore((s) => s.zoom);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const setPan = useCanvasStore((s) => s.setPan);
  const symbols = useCanvasStore((s) => s.symbols);
  const setActiveToolStore = useCanvasStore((s) => s.setActiveTool);
  const autoSave = useCanvasStore((s) => s.autoSave);
  const toggleAutoSave = useCanvasStore((s) => s.toggleAutoSave);
  const validateSchematic = useCanvasStore((s) => s.validateSchematic);
  const exportToPDF = useCanvasStore((s) => s.exportToPDF);
  const exportToSVG = useCanvasStore((s) => s.exportToSVG);
  const exportToPNG = useCanvasStore((s) => s.exportToPNG);
  const rotateSymbol = useCanvasStore((s) => s.rotateSymbol);
  const selectAll = useCanvasStore((s) => s.selectAll);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  
  // Drag state for symbol drag-and-drop
  const [draggedSymbolType, setDraggedSymbolType] = useState<SymbolType | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  // Symbol library search state
  const [symbolSearch, setSymbolSearch] = useState('');
  // Settings panel state
  const [showSettings, setShowSettings] = useState(false);

  const handleDelete = () => {
    selectedElements.forEach((id) => {
      deleteSymbol(id);
      deleteWire(id);
      deleteTextElement(id);
    });
    clearSelection();
  };

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    setActiveToolStore(tool);
  };

  const handleValidate = () => {
    const results = validateSchematic();
    if (results.length > 0) {
      console.log('Validation results:', results);
      // Show validation results in a dialog
    } else {
      console.log('No validation issues found');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Tool shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            handleToolChange(ToolType.SELECT);
            break;
          case '2':
            e.preventDefault();
            handleToolChange(ToolType.WIRE);
            break;
          case '3':
            e.preventDefault();
            handleToolChange(ToolType.HAND);
            break;
          case '4':
            e.preventDefault();
            handleToolChange(ToolType.TEXT);
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'd':
            e.preventDefault();
            duplicateSelected();
            break;
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            handleDelete();
            break;
        }
      } else {
        // Non-modifier shortcuts
        switch (e.key) {
          case 'Escape':
            clearSelection();
            break;
          case 'r':
            if (selectedElements.length === 1) {
              const selectedSymbol = symbols.find(s => s.id === selectedElements[0]);
              if (selectedSymbol) {
                rotateSymbol(selectedSymbol.id, (selectedSymbol.rotation + 90) % 360);
              }
            }
            break;
          case 'R':
            if (selectedElements.length === 1) {
              const selectedSymbol = symbols.find(s => s.id === selectedElements[0]);
              if (selectedSymbol) {
                rotateSymbol(selectedSymbol.id, (selectedSymbol.rotation - 90 + 360) % 360);
              }
            }
            break;
          case '0':
            setZoom(1);
            setPan({ x: 0, y: 0 });
            break;
          case '=':
          case '+':
            e.preventDefault();
            setZoom(Math.min(2, zoom * 1.2));
            break;
          case '-':
            e.preventDefault();
            setZoom(Math.max(0.2, zoom / 1.2));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, symbols, rotateSymbol, setZoom, zoom, setPan, clearSelection, undo, redo, selectAll, duplicateSelected, handleDelete]);

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f4f6fa' }}>
      <CssBaseline />
      {/* Top AppBar */}
      <AppBar position="fixed" color="primary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Box sx={{ width: 60, height: 60, mr: 1, display: 'flex', alignItems: 'center' }}>
            <img src="/logo512.png" alt="Muriel Logo" style={{ height: 65 }} />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            schematics
          </Typography>
          {/* Action buttons */}
          <IconButton color="inherit" size="large"><SaveIcon /></IconButton>
          <IconButton color="inherit" size="large"><CloudUploadIcon /></IconButton>
          <IconButton color="inherit" size="large"><CloudDownloadIcon /></IconButton>
          <IconButton color="inherit" onClick={() => setShowSettings(!showSettings)}>
            <SettingsIcon />
          </IconButton>
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
            sx={{
              p: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              boxShadow: 2,
              borderRadius: 2,
              background: '#f8fafc',
              transition: 'box-shadow 0.2s',
              '&:focus-within': { boxShadow: 4 },
            }}
            elevation={0}
            onSubmit={e => e.preventDefault()}
          >
            <SearchIcon sx={{ color: 'action.active', mr: 1, ml: 0.5 }} />
            <InputBase
              sx={{ flex: 1, fontSize: 15, background: 'transparent' }}
              placeholder="Search symbols..."
              inputProps={{ 'aria-label': 'search symbols' }}
              value={symbolSearch}
              onChange={e => setSymbolSearch(e.target.value)}
            />
          </Paper>
          <Divider sx={{ mb: 2 }} />
          <SymbolLibrary
            draggedSymbolType={draggedSymbolType}
            setDraggedSymbolType={setDraggedSymbolType}
            setDragPreviewPosition={setDragPreviewPosition}
            search={symbolSearch}
          />
        </Box>
      </Drawer>
      {/* Main Area */}
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: '#f4f6fa', display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <Toolbar />
        {/* Enhanced Toolbar */}
        <Paper elevation={1} sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1, gap: 1, flexWrap: 'wrap' }}>
          {/* Drawing Tools */}
          <Tooltip title="Select (S)">
            <IconButton 
              color={activeTool === ToolType.SELECT ? 'primary' : 'default'} 
              onClick={() => handleToolChange(ToolType.SELECT)}
            >
              <MouseIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Hand/Move (H)">
            <IconButton 
              color={activeTool === ToolType.HAND ? 'primary' : 'default'} 
              onClick={() => handleToolChange(ToolType.HAND)}
            >
              <PanToolIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Wire Tool (W)">
            <IconButton 
              color={activeTool === ToolType.WIRE ? 'primary' : 'default'} 
              onClick={() => handleToolChange(ToolType.WIRE)}
            >
              <TimelineIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Text Tool (T)">
            <IconButton 
              color={activeTool === ToolType.TEXT ? 'primary' : 'default'} 
              onClick={() => handleToolChange(ToolType.TEXT)}
            >
              <TextFieldsIcon />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Edit Operations */}
          <Tooltip title="Delete (Del)">
            <IconButton onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Undo (Ctrl+Z)">
            <IconButton onClick={undo}>
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <IconButton onClick={redo}>
              <RedoIcon />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* View Controls */}
          <Tooltip title="Toggle Grid">
            <IconButton color={showGrid ? 'primary' : 'default'} onClick={() => setShowGrid(v => !v)}>
              <GridOnIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Snap to Grid">
            <IconButton color={snapToGrid ? 'primary' : 'default'} onClick={() => setSnapToGrid(v => !v)}>
              <GridOnIcon sx={{ opacity: 0.5 }} />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Zoom Controls */}
          <Tooltip title="Zoom Out (Ctrl+-)">
            <IconButton onClick={() => setZoom(Math.max(zoom - 0.1, 0.2))}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" sx={{ mx: 1 }}>{Math.round(zoom * 100)}%</Typography>
          <Tooltip title="Zoom In (Ctrl+=)">
            <IconButton onClick={() => setZoom(Math.min(zoom + 0.1, 2))}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <CenterFocusStrongIcon />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Export Options */}
          <Tooltip title="Export to PDF">
            <IconButton onClick={exportToPDF}>
              <CloudDownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export to SVG">
            <IconButton onClick={exportToSVG}>
              <CloudDownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export to PNG">
            <IconButton onClick={exportToPNG}>
              <CloudDownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          {/* Validation */}
          <Tooltip title="Validate Schematic">
            <IconButton onClick={handleValidate}>
              <AutoFixHighIcon />
            </IconButton>
          </Tooltip>
        </Paper>

        {/* Settings Panel */}
        {showSettings && (
          <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
            <Typography variant="h6" gutterBottom>Settings</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Typography>Auto-save:</Typography>
              <Switch checked={autoSave} onChange={() => toggleAutoSave()} />
            </Box>
          </Paper>
        )}

        {/* Canvas Area */}
        <Box sx={{ flexGrow: 1, display: 'flex' }}>
          <CanvasArea
            wireToolActive={activeTool === ToolType.WIRE}
            selectToolActive={activeTool === ToolType.SELECT}
            handToolActive={activeTool === ToolType.HAND}
            textToolActive={activeTool === ToolType.TEXT}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            draggedSymbolType={draggedSymbolType}
            dragPreviewPosition={dragPreviewPosition}
            setDragPreviewPosition={setDragPreviewPosition}
            setDraggedSymbolType={setDraggedSymbolType}
          />
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