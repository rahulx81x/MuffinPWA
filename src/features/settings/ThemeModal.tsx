import { useState, type SyntheticEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '../../hooks/useTheme';
import { DARK_THEMES, LIGHT_THEMES, type ThemeDefinition } from '../../lib/themes';

interface ThemeModalProps {
  open: boolean;
  onClose: () => void;
}

function ThemeOptionCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'action.selected' : 'background.paper',
        boxShadow: selected ? 3 : 0,
        transition: 'all 0.2s ease',
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ p: 1.5, height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box
            sx={{
              display: 'inline-flex',
              height: 24,
              width: 50,
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
            }}
          >
            <Box sx={{ width: '40%', height: '100%', bgcolor: theme.background }} />
            <Box sx={{ width: '30%', height: '100%', bgcolor: theme.card }} />
            <Box sx={{ flex: 1, height: '100%', bgcolor: theme.accent }} />
          </Box>

          {selected && (
            <CheckCircleIcon color="primary" sx={{ fontSize: 20 }} />
          )}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
          {theme.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
          {theme.mode} palette
        </Typography>
      </CardActionArea>
    </Card>
  );
}

export function ThemeModal({ open, onClose }: ThemeModalProps) {
  const { themeId, setTheme } = useTheme();
  const [tab, setTab] = useState<number>(0);

  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
            <PaletteIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Appearance
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
            Select Theme & Palette
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
            Choose from cozy light and dark aesthetics
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={handleTabChange} textColor="primary" indicatorColor="primary" variant="fullWidth">
          <Tab label="All Themes" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<LightModeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Light" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab icon={<DarkModeIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Dark" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ py: 2 }}>
        {(tab === 0 || tab === 1) && (
          <Box sx={{ mb: tab === 0 ? 3 : 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1, display: 'block', mb: 1.5 }}>
              Light Palettes
            </Typography>
            <Grid container spacing={1.5}>
              {LIGHT_THEMES.map((t) => (
                <Grid size={6} key={t.id}>
                  <ThemeOptionCard
                    theme={t}
                    selected={themeId === t.id}
                    onSelect={() => setTheme(t.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {(tab === 0 || tab === 2) && (
          <Box sx={{ pt: tab === 0 ? 2 : 0, borderTop: tab === 0 ? '1px solid' : 'none', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1, display: 'block', mb: 1.5 }}>
              Dark Palettes
            </Typography>
            <Grid container spacing={1.5}>
              {DARK_THEMES.map((t) => (
                <Grid size={6} key={t.id}>
                  <ThemeOptionCard
                    theme={t}
                    selected={themeId === t.id}
                    onSelect={() => setTheme(t.id)}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
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

