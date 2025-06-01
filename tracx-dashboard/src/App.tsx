import { ThemeProvider, createTheme, CssBaseline, Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import Dashboard from './components/Dashboard';
import VariantAnalysis from './components/VariantAnalysis';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Dashboard" />
          <Tab label="Detailed Analysis" />
        </Tabs>
      </Box>
      {activeTab === 0 ? <Dashboard /> : <VariantAnalysis />}
    </ThemeProvider>
  );
}

export default App;
