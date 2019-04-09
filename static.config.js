import { makePageRoutes } from 'react-static/node';

import photos from './content/dist/photos.json';
import sets from './content/dist/sets.json';
import tags from './content/dist/tags.json';

const PHOTOS_PAGE_SIZE = 48;
const PHOTOS_PAGE_TOKEN = 'page';

export default {
  plugins: [require.resolve('react-static-plugin-reach-router')],
  getRoutes: async () => {
    const photoRoutes = makePageRoutes({
      items: photos,
      pageSize: PHOTOS_PAGE_SIZE,
      pageToken: PHOTOS_PAGE_TOKEN,
      route: {
        path: '/',
        template: 'src/pages/Photos',
      },
      decorate: (photos, currentPage, totalPages) => ({
        getData: () => ({
          photos,
          ...paginationProps(currentPage, totalPages),
        }),
        children: photos.map(photo => ({
          path: `photos/${photo.id}`,
          template: 'src/pages/Photo',
          getData: () => ({
            photo,
          }),
        })),
      }),
    });

    const sortedSets = sets.filter(set => set.count > 0).sort(sortByKey('id'));

    const setsRoutes = sortedSets.reduce(
      (routes, set) => [
        ...routes,
        ...makePageRoutes({
          items: set.photos,
          pageSize: PHOTOS_PAGE_SIZE,
          pageToken: PHOTOS_PAGE_TOKEN,
          route: {
            path: `sets/${set.id}`,
            template: 'src/pages/Set',
          },
          decorate: (photoIds, currentPage, totalPages) => ({
            getData: () => ({
              ...set,
              photos: photoIds.map(photoId =>
                photos.find(photo => photo.id === photoId),
              ),
              ...paginationProps(currentPage, totalPages),
            }),
          }),
        }),
      ],
      [
        {
          path: 'sets',
          template: 'src/pages/Sets',
          getData: () => ({
            sets: sortedSets,
            photosById: sortedSets.reduce(
              (photosById, set) => ({
                ...photosById,
                ...set.photos.slice(0, 3).reduce(
                  (photosList, photoId) => ({
                    ...photosList,
                    [photoId]: photos.find(photo => photo.id === photoId),
                  }),
                  {},
                ),
              }),
              {},
            ),
          }),
        },
      ],
    );

    const sortedTags = tags.filter(tag => tag.count > 0).sort(sortByKey('id'));

    const tagsRoutes = sortedTags.reduce(
      (routes, tag) => [
        ...routes,
        ...makePageRoutes({
          items: tag.photos,
          pageSize: PHOTOS_PAGE_SIZE,
          pageToken: PHOTOS_PAGE_TOKEN,
          route: {
            path: `tags/${tag.id}`,
            template: 'src/pages/Tag',
          },
          decorate: (photoIds, currentPage, totalPages) => ({
            getData: () => ({
              ...tag,
              photos: photoIds.map(photoId =>
                photos.find(photo => photo.id === photoId),
              ),
              ...paginationProps(currentPage, totalPages),
            }),
          }),
        }),
      ],
      [
        {
          path: 'tags',
          template: 'src/pages/Tags',
          getData: () => ({
            tags: sortedTags,
            photosById: sortedTags.reduce(
              (photosById, tag) => ({
                ...photosById,
                ...tag.photos.slice(0, 3).reduce(
                  (photosList, photoId) => ({
                    ...photosList,
                    [photoId]: photos.find(photo => photo.id === photoId),
                  }),
                  {},
                ),
              }),
              {},
            ),
          }),
        },
      ],
    );

    const infoRoute = {
      path: 'info',
      template: 'src/pages/Info',
    };

    const notfoundRoute = {
      path: '*',
      template: 'src/pages/NotFound',
    };

    return [
      ...photoRoutes,
      ...setsRoutes,
      ...tagsRoutes,
      infoRoute,
      notfoundRoute,
    ];
  },
};

function sortByKey(key) {
  return function sort(a, b) {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
    return 0;
  };
}

function paginationProps(currentPage, totalPages) {
  return {
    totalPages,
    currentPage,
    hasPrevPage: currentPage !== 1,
    hasNextPage: currentPage < totalPages,
  };
}
