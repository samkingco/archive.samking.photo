import React from 'react';
import { Root, Routes } from 'react-static';
import { Link, Router } from '@reach/router';

function App() {
  return (
    <Root>
      <nav>
        <Link to="/">Photos</Link>
        <Link to="/info">Info</Link>
      </nav>
      <div className="content">
        <React.Suspense fallback={<em>Loading...</em>}>
          <Router>
            <Routes path="*" />
          </Router>
        </React.Suspense>
      </div>
    </Root>
  );
}

export default App;
