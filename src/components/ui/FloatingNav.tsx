import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Fab from '@mui/material/Fab';
import Box from '@mui/material/Box';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import type { AppTab } from '../../domain/types';

interface FloatingNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onAdd?: () => void;
  showAdd?: boolean;
}

export function FloatingNav({
  activeTab,
  onTabChange,
  onAdd,
  showAdd = true,
}: FloatingNavProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 12, sm: 20 },
        left: 0,
        right: 0,
        zIndex: 1200,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        px: 2,
      }}
      aria-label="Primary"
    >
      <Paper
        elevation={6}
        sx={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          borderRadius: 8,
          px: 1,
          py: 0.5,
          maxWidth: { xs: 440, sm: 540 },
          width: '100%',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_, newValue: AppTab) => {
            if (newValue) {
              onTabChange(newValue);
            }
          }}
          showLabels
          sx={{
            flex: 1,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              py: 0.5,
              borderRadius: 4,
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 700,
              },
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            label="Insights"
            value="insights"
            icon={<BarChartIcon />}
          />

          {showAdd && onAdd && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.5,
              }}
            >
              <Fab
                color="primary"
                aria-label="Add transaction"
                size="medium"
                onClick={onAdd}
                sx={{
                  boxShadow: 4,
                  '&:hover': {
                    transform: 'scale(1.06)',
                  },
                  transition: 'transform 0.2s ease',
                }}
              >
                <AddIcon />
              </Fab>
            </Box>
          )}

          <BottomNavigationAction
            label="Ledger"
            value="ledger"
            icon={<MenuBookIcon />}
          />
          <BottomNavigationAction
            label="Settings"
            value="settings"
            icon={<SettingsIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

