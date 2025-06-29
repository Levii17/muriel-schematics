import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import GridOnIcon from '@mui/icons-material/GridOn';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import TimelineIcon from '@mui/icons-material/Timeline';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import SymbolLibrary from './SymbolLibrary';
import CanvasArea from './CanvasArea';
import PropertiesPanel from './PropertiesPanel';

const drawerWidth = 260;

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [wireToolActive, setWireToolActive] = useState(false);

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
          <SymbolLibrary />
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
          <IconButton><MenuIcon /></IconButton>
          {/* Wire tool button */}
          <IconButton color={wireToolActive ? 'primary' : 'default'} onClick={() => setWireToolActive((v) => !v)}>
            <TimelineIcon />
          </IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <IconButton><UndoIcon /></IconButton>
          <IconButton><RedoIcon /></IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          <IconButton><GridOnIcon /></IconButton>
          <IconButton><ZoomOutIcon /></IconButton>
          <Typography variant="body2" sx={{ mx: 1 }}>100%</Typography>
          <IconButton><ZoomInIcon /></IconButton>
        </Paper>
        {/* Canvas Area */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Box sx={{ flex: 1, bgcolor: '#fff', borderRadius: 2, boxShadow: 1, overflow: 'hidden', minHeight: 0 }}>
            <CanvasArea wireToolActive={wireToolActive} />
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