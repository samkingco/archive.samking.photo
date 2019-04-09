import React from 'react';
import { useRouteData } from 'react-static';
import { Link } from '@reach/router';

function Sets() {
  const { sets } = useRouteData();

  return (
    <div>
      <h1>Sets</h1>

      {sets.map(({ id, name, description }) => (
        <div key={id}>
          <Link to={`sets/${id}`}>
            <h2>{name}</h2>
          </Link>
          {description && <p>{description}</p>}
        </div>
      ))}
    </div>
  );
}

export default Sets;
