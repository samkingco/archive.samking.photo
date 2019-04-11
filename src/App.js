import React from 'react';
import { Root, Routes } from 'react-static';
import { Link, Router } from '@reach/router';
import { ThemeProvider } from 'emotion-theming';
import { ActiveThemeProvider, useActiveTheme } from './components/ActiveTheme';

function AppContent() {
  const { activeTheme } = useActiveTheme();

  return (
    <Root>
      <ThemeProvider theme={activeTheme}>
        <nav>
          <Link to="/">Photos</Link>
          <Link to="/tags">Tags</Link>
          <Link to="/sets">Sets</Link>
          <Link to="/info">Info</Link>
        </nav>
        <div>
          <React.Suspense fallback={<em>Loading...</em>}>
            <Router>
              <Routes path="*" />
            </Router>
          </React.Suspense>
        </div>
      </ThemeProvider>
    </Root>
  );
}

function App() {
  return (
    <ActiveThemeProvider defaultThemeName="light">
      <AppContent />
    </ActiveThemeProvider>
  );
}

export default App;
