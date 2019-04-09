import React from 'react';
import { useRouteData } from 'react-static';
import { Link } from '@reach/router';

function Tags() {
  const { tags } = useRouteData();

  return (
    <div>
      <h1>Tags</h1>

      {tags.map(({ id, name, count }) => (
        <div key={id}>
          <Link to={`tags/${id}`}>
            <h2>
              {name} <sup>{count}</sup>
            </h2>
          </Link>
        </div>
      ))}
    </div>
  );
}

export default Tags;
