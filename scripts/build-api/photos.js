const { slugify, processImages } = require('./utils');

const getSetId = title => slugify(title);

const buildTagsJSON = async (tagsSrc, imgSrc, imgDest, photosSrc) =>
  tagsSrc.map(tag => ({
    id: slugify(tag),
    name: tag,
    count: photosSrc.reduce(
      (count, photo) =>
        photo.tags && photo.tags.includes(tag) ? count + 1 : count,
      0,
    ),
  }));

const buildPhotoSetsJSON = async (setsSrc, imgSrc, imgDest, photosSrc) =>
  setsSrc.map(({ title, description, tags }) => {
    const id = getSetId(title);
    return {
      id,
      title,
      description,
      photos: photosSrc.reduce(
        (photos, photo) =>
          photo.set && photo.set === id ? [...photos, photo.id] : photos,
        [],
      ),
    };
  });

const buildPhotosJSON = async (photosSrc, imgSrc, imgDest, allTags) => {
  const processedImages = await processImages(photosSrc, {
    imgSrc,
    imgDest,
    includeExif: true,
  });

  return processedImages.map((image, index) => {
    const { title, set, tags } = photosSrc[index];

    return Object.assign(
      {
        id: image.meta.hash,
        title: title || null,
        set: set ? getSetId(set) : null,
        tags: allTags.reduce((photoTags, tag) => {
          if (tags && tags.includes(tag.name)) return [...photoTags, tag.id];
          return photoTags;
        }, []),
      },
      image,
    );
  });
};

module.exports = {
  buildTagsJSON,
  buildPhotoSetsJSON,
  buildPhotosJSON,
};
