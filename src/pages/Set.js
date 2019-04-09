import React from 'react';
import { useRouteData } from 'react-static';

function Set() {
  const { name, description, photos } = useRouteData();

  return (
    <div>
      <h1>{name}</h1>
      {description && <p>{description}</p>}

      {photos.map(({ id, title, src }) => (
        <figure key={id}>
          <img src={src} width={100} />
          {title && <figcaption>{title}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default Set;
