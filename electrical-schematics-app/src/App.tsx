import React, { useRef, useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import GetAppIcon from '@mui/icons-material/GetApp'; // For export parent

import SymbolLibrary from './components/SymbolLibrary';
import Canvas, { CanvasElement, Wire } from './components/Canvas';
import ExportModule from './components/ExportModule'; // We'll integrate its functionality into the UI
import ValidationService, { ValidationError } from './services/ValidationService';
import ValidationResults from './components/ValidationResults';
import StorageService, { SchematicData } from './services/StorageService';

const drawerWidth = 240;

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Blue
    },
    secondary: {
      main: '#dc004e', // Pink/Red
    },
  },
});

function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false); // For responsive drawer

  useEffect(() => {
    const loadedData = StorageService.loadSchematic();
    if (loadedData) {
      setCanvasElements(loadedData.elements);
      setWires(loadedData.wires);
    }
    setIsInitialLoadDone(true);
  }, []);

  useEffect(() => {
    if (isInitialLoadDone) {
      const schematicToSave: SchematicData = { elements: canvasElements, wires };
      StorageService.saveSchematic(schematicToSave);
    }
  }, [canvasElements, wires, isInitialLoadDone]);

  const handleElementsChange = (elements: CanvasElement[]) => setCanvasElements(elements);
  const handleWiresChange = (updatedWires: Wire[]) => setWires(updatedWires);

  const runValidation = () => {
    const schematicData = { elements: canvasElements, wires };
    const errors = ValidationService.validateSchematic(schematicData);
    setValidationErrors(errors);
    // Could also trigger a snackbar or some visual feedback
  };

  useEffect(() => {
    if (isInitialLoadDone) runValidation();
  }, [canvasElements, wires, isInitialLoadDone]);

  const handleClearStorage = () => {
    StorageService.clearSchematic();
    setCanvasElements([]);
    setWires([]);
    alert("Saved schematic has been cleared.");
  };

  // Placeholder for explicit save action if needed, though it saves on change
  const handleSave = () => {
    const schematicToSave: SchematicData = { elements: canvasElements, wires };
    StorageService.saveSchematic(schematicToSave);
    alert("Schematic explicitly saved!"); // Or use a Snackbar
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (!isInitialLoadDone) {
    return <Typography>Loading schematic...</Typography>;
  }

  const drawerContent = (
    <div>
      <Toolbar /> {/* For spacing under AppBar */}
      <SymbolLibrary />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSave}>
            <ListItemIcon><SaveIcon /></ListItemIcon>
            <ListItemText primary="Save Schematic" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={runValidation}>
            <ListItemIcon><CheckCircleOutlineIcon /></ListItemIcon>
            <ListItemText primary="Validate" />
          </ListItemButton>
        </ListItem>
         <ListItem disablePadding>
          <ListItemButton onClick={handleClearStorage}>
            <ListItemIcon><DeleteSweepIcon /></ListItemIcon>
            <ListItemText primary="Clear Saved Data" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{p: 2}}>
        <ExportModule canvasRef={canvasContainerRef} />
      </Box>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              South African Electrical Schematics
            </Typography>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* The implementation can be swapped with js to avoid SEO duplication. */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }} // Better open performance on mobile.
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawerContent}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          <div ref={canvasContainerRef} style={{ height: 'calc(100vh - 180px)', marginBottom: '10px' }}> {/* Adjust height dynamically */}
            <Canvas
              initialElements={canvasElements}
              initialWires={wires}
              onElementsChange={handleElementsChange}
              onWiresChange={handleWiresChange}
            />
          </div>
          <ValidationResults errors={validationErrors} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
