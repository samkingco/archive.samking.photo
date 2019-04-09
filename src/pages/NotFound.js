import React from 'react';

function NotFound() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  return ready ? (
    <div>
      <h1>404 - Not found</h1>
    </div>
  ) : null;
}

export default NotFound;
