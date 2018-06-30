const paginate = (list, page, limit) => {
  const pageSize = (limit && Number(limit)) || 10;
  const totalPages = Math.ceil(list.length / pageSize);

  let pageNumber;

  if (!page || page < 1) {
    pageNumber = 1;
  } else if (page && Number(page) > totalPages) {
    pageNumber = totalPages;
  } else {
    pageNumber = Number(page);
  }

  const data = list.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  return {
    totalResources: list.length,
    limit: pageSize,
    totalPages,
    prevPage: pageNumber <= 1 ? null : pageNumber - 1,
    currPage: pageNumber,
    nextPage: pageNumber >= totalPages ? null : pageNumber + 1,
    data,
  };
};

const filter = (list, filterObj) =>
  list.filter(resource => {
    const matches = Object.keys(filterObj).map(filterKey => {
      const resourceVal = resource[filterKey];
      const filterVal = filterObj[filterKey];

      if (Array.isArray(resourceVal)) {
        const filterVals = filterVal.split(',');
        return filterVals.every(val => resourceVal.includes(val));
      }

      return (
        resourceVal &&
        resourceVal.toString().toLowerCase() === filterVal.toLowerCase()
      );
    });

    return matches.every(match => match === true);
  });

const rawEndpoint = async (ctx, raw) => {
  ctx.status = 200;
  ctx.body = raw;
};

const listEndpoint = async (ctx, resourceList, defaultLimit = 10) => {
  const { page, limit, ...filterObj } = ctx.query;

  ctx.status = 200;
  ctx.body = paginate(
    Object.keys(filterObj).length > 0
      ? filter(resourceList, filterObj)
      : resourceList,
    page,
    limit || defaultLimit,
  );
};

const idEndpoint = async (ctx, resourceList) => {
  const { id } = ctx.params;
  const resource = resourceList.find(i => i.id === id);

  if (!resource) ctx.throw(404);

  ctx.status = 200;
  ctx.body = resource;
};

module.exports = {
  rawEndpoint,
  listEndpoint,
  idEndpoint,
};
