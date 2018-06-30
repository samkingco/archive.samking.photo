const endpointDocs = [
  {
    path: '/about',
    info:
      'More information about me. Includes a blurb, contact methods, and experience.',
  },
  {
    path: '/photos',
    info: 'Filterable and paginated list of photos.',
  },
  {
    path: '/photos/:id',
    info: 'The individual photo with matching ID.',
  },
  {
    path: '/photos-sets',
    info: 'Filterable and paginated list of photo sets.',
  },
  {
    path: '/photos-sets/:id',
    info:
      'The individual photo set with matching ID. A photo set is a collection of photos with a title and description.',
  },
  {
    path: '/tags',
    info:
      'Filterable and paginated list of photo tags. Photos can be tagged with anything from this list. You can also filter photos by these tags on the `/photos` endpoint.',
  },
  {
    path: '/tags/:id',
    info: 'The individual photo tag with matching ID.',
  },
];

module.exports = endpointDocs;
