import React from 'react';
import { ValidationError } from '../services/ValidationService';
import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Alert, AlertTitle, Box } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

interface ValidationResultsProps {
  errors: ValidationError[];
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ errors }) => {
  if (errors.length === 0) {
    return (
      <Alert severity="success" sx={{ mt: 2 }}>
        <AlertTitle>Validation Passed</AlertTitle>
        No issues found in the schematic.
      </Alert>
    );
  }

  return (
    <Paper elevation={2} sx={{ marginTop: 2, padding: 2 }}>
      <Typography variant="h6" gutterBottom component="div" sx={{ color: errors.some(e => e.severity === 'error') ? 'error.main' : 'warning.main' }}>
        Validation Issues
      </Typography>
      <List dense>
        {errors.map((error, index) => (
          <ListItem key={index} sx={{
            borderLeft: `4px solid ${error.severity === 'error' ? 'red' : 'orange'}`,
            mb: 1,
            backgroundColor: error.severity === 'error' ? 'rgba(255,0,0,0.05)' : 'rgba(255,165,0,0.05)'
          }}>
            <ListItemIcon sx={{minWidth: 'auto', mr: 1}}>
              {error.severity === 'error' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />}
            </ListItemIcon>
            <ListItemText
              primary={`${error.severity.toUpperCase()}: ${error.message}`}
              secondary={
                (error.elementId ? `Element: ${error.elementId} ` : '') +
                (error.wireId ? `Wire: ${error.wireId}` : '')
              }
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default ValidationResults;
