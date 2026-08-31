import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { useFont } from '../../hooks/useFont';
import { FONTS } from '../../lib/fonts';

interface FontModalProps {
  open: boolean;
  onClose: () => void;
}

export function FontModal({ open, onClose }: FontModalProps) {
  const { fontId, setFont } = useFont();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextFieldsIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Typography
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
            Select Typography Style
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            Choose font pairing for headlines and data
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 1 }}>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 0 }}>
          {FONTS.map((f) => {
            const isSelected = fontId === f.id;
            return (
              <ListItem key={f.id} disablePadding>
                <ListItemButton
                  onClick={() => setFont(f.id)}
                  sx={{
                    borderRadius: 3,
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    bgcolor: isSelected ? 'action.selected' : 'background.paper',
                    py: 1.5,
                    px: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <ListItemText
                    primary={f.name}
                    secondary="The quick brown fox jumps · ₹1,23,456"
                    slotProps={{
                      primary: {
                        sx: {
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          fontFamily: f.body,
                        },
                      },
                      secondary: {
                        sx: {
                          fontSize: '0.75rem',
                          fontFamily: f.display,
                          mt: 0.5,
                        },
                      },
                    }}
                  />
                  {isSelected && (
                    <CheckCircleIcon color="primary" sx={{ ml: 1, fontSize: 22 }} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', py: 1 }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

