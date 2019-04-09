import React from 'react';
import { useRouteData } from 'react-static';

function Photo() {
  const { id, src, title } = useRouteData();

  return (
    <div>
      <h1>Photo: {id}</h1>

      <figure>
        <img src={src} width={300} />
        {title && <figcaption>{title}</figcaption>}
      </figure>
    </div>
  );
}

export default Photo;
