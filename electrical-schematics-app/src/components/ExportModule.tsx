import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button, Box, Typography, Divider } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';

interface ExportModuleProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

const ExportModule: React.FC<ExportModuleProps> = ({ canvasRef }) => {

  const exportToPdf = async () => {
    if (canvasRef.current) {
      // Find the Konva <canvas> element within the referenced <div>
      const konvaCanvasElement = canvasRef.current.querySelector('canvas');
      if (konvaCanvasElement) {
        try {
          const canvas = await html2canvas(konvaCanvasElement, {
            logging: true,
            useCORS: true,
            backgroundColor: '#ffffff', // Ensure background is white for PDF
          });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save('schematic.pdf');
        } catch (error) {
          console.error("Error exporting to PDF:", error);
          alert("Error exporting to PDF. Check console for details.");
        }
      } else {
        console.error("Konva canvas element not found for PDF export.");
        alert("Could not find canvas to export.");
      }
    } else {
      console.error("Canvas reference not found for PDF export.");
      alert("Canvas reference is not available.");
    }
  };

  const exportToPng = async () => {
    if (canvasRef.current) {
      const konvaCanvasElement = canvasRef.current.querySelector('canvas');
      if (konvaCanvasElement) {
        try {
          const canvas = await html2canvas(konvaCanvasElement, {
            logging: true,
            useCORS: true,
            backgroundColor: '#ffffff', // Or null for transparent if supported and desired
          });
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = imgData;
          link.download = 'schematic.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.error("Error exporting to PNG:", error);
          alert("Error exporting to PNG. Check console for details.");
        }
      } else {
        console.error("Konva canvas element not found for PNG export.");
        alert("Could not find canvas to export.");
      }
    } else {
      console.error("Canvas reference not found for PNG export.");
      alert("Canvas reference is not available.");
    }
  };

  return (
    <Box sx={{ width: '100%'}}>
      <Typography variant="subtitle1" gutterBottom>Export Schematic</Typography>
      <Divider sx={{mb: 1}} />
      <Button
        variant="outlined"
        startIcon={<PictureAsPdfIcon />}
        onClick={exportToPdf}
        sx={{ mr: 1, mb: {xs: 1, sm: 0} }} // Margin bottom on extra small screens
        fullWidth
      >
        PDF
      </Button>
      <Button
        variant="outlined"
        startIcon={<ImageIcon />}
        onClick={exportToPng}
        fullWidth
      >
        PNG
      </Button>
    </Box>
  );
};

export default ExportModule;
