import React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SymbolLibrary from './SymbolLibrary';
import CanvasArea from './CanvasArea';
import PropertiesPanel from './PropertiesPanel';

const drawerWidth = 240;

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {/* Logo placeholder */}
          <Box sx={{ width: 48, height: 48, mr: 2, display: 'flex', alignItems: 'center' }}>
            {/* Replace with Muriel SVG or image */}
            <img src="/logo192.png" alt="Muriel Logo" style={{ height: 40 }} />
          </Box>
          <Typography variant="h6" noWrap component="div">
            Muriel Electrical Schematics
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {/* Symbol Library Component */}
          <SymbolLibrary />
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, display: 'flex', flexDirection: 'column' }}
      >
        <Toolbar />
        {/* Canvas Area Component */}
        <Box sx={{ flex: 1, bgcolor: '#222', borderRadius: 2, p: 2, minHeight: 0 }}>
          <CanvasArea />
        </Box>
      </Box>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', right: 0, left: 'auto' },
        }}
        anchor="right"
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 2 }}>
          {/* Properties Panel Component */}
          <PropertiesPanel />
        </Box>
      </Drawer>
    </Box>
  );
};

export default Layout; 