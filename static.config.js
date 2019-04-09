import { makePageRoutes } from 'react-static/node';

import photos from './content/dist/photos.json';
import sets from './content/dist/sets.json';
import tags from './content/dist/tags.json';

const PHOTOS_PAGE_SIZE = 48;
const PHOTOS_PAGE_TOKEN = 'page';

export default {
  plugins: [require.resolve('react-static-plugin-reach-router')],
  getRoutes: async () => {
    const indexRoute = {
      path: '/',
      template: 'src/pages/Index',
    };

    const infoRoute = {
      path: 'info',
      template: 'src/pages/Info',
    };

    const notfoundRoute = {
      path: '*',
      template: 'src/pages/NotFound',
    };

    return [indexRoute, infoRoute, notfoundRoute];
  },
};

function paginationProps(currentPage, totalPages) {
  return {
    totalPages,
    currentPage,
    hasPrevPage: currentPage !== 1,
    hasNextPage: currentPage < totalPages,
  };
}
