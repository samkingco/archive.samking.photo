import React from 'react';
import { useRouteData } from 'react-static';

function Tag() {
  const { name, count, photos } = useRouteData();

  return (
    <div>
      <h1>
        {name} <sup>{count}</sup>
      </h1>

      {photos.map(({ id, title, src }) => (
        <figure key={id}>
          <img src={src} width={100} />
          {title && <figcaption>{title}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default Tag;
