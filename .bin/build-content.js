#!/usr/bin/env node
const path = require('path');
const YAML = require('yamljs');
const {
  writeContentJSON,
  slugify,
  processImages,
  copyImages,
} = require('./utils');

const { APP_IMAGE_BASE_URLS } = process.env;

const DIRS = {
  contentSrc: path.resolve(__dirname, '../content'),
  contentDest: path.resolve(__dirname, '../content/dist'),
  imagesDest: path.resolve(__dirname, '../content/dist/images'),
};

const build = async () => {
  const loadSrc = src => YAML.load(path.resolve(DIRS.contentSrc, src));
  const photosSrc = loadSrc('photos.yml');
  const photoSetsSrc = loadSrc('photoSets.yml');
  const photoTagsSrc = loadSrc('photoTags.yml');

  const allSets = photoSetsSrc.map(({ name, slug, description }) => ({
    id: slug,
    name,
    description,
  }));

  const allTags = photoTagsSrc.map(({ name, slug }) => ({
    id: slug,
    name,
  }));

  const processedImages = await processImages(photosSrc, {
    src: path.resolve(DIRS.contentSrc, 'photos'),
    dest: APP_IMAGE_BASE_URLS,
  });

  const allPhotos = processedImages.map((image, index) => {
    const { title, set, tags } = photosSrc[index];

    return {
      id: image.meta.hash,
      number: index + 1,
      title: title || null,
      set: set || null,
      tags: allTags.reduce(
        (tagsList, tag) =>
          tags && tags.includes(tag.id) ? [...tagsList, tag.id] : tagsList,
        [],
      ),
      ...image,
    };
  });

  const photos = allPhotos.map(({ meta, ...photo }) => photo).reverse();

  const sets = allSets.map(set => {
    const photosInSet = allPhotos
      .filter(photo => photo.set === set.id)
      .map(i => i.id);

    const cover = photosInSet[0] || null;

    return {
      ...set,
      cover,
      count: photosInSet.length,
      photos: photosInSet,
    };
  });

  const tags = allTags.map(tag => {
    const taggedPhotos = photos
      .filter(photo => photo.tags.includes(tag.id))
      .map(i => i.id);

    return {
      ...tag,
      count: taggedPhotos.length,
      photos: taggedPhotos,
    };
  });

  const archiveByYear = allPhotos.reduce((memo, photo) => {
    if (!photo.captureTime) return memo;

    const captureDate = new Date(photo.captureTime);
    const year = `${captureDate.getFullYear()}`;
    const monthNum = captureDate.getMonth() + 1;
    const month = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

    const photosForYear = memo[year] ? memo[year].photos : [];

    const photosForMonth =
      memo[year] && memo[year].months && memo[year].months[month]
        ? memo[year].months[month].photos
        : [];

    return {
      ...memo,
      [year]: {
        ...memo[year],
        year,
        photos: [...photosForYear, photo.id],
        count: photosForYear.length + 1,
        months: {
          ...(memo[year] && memo[year].months),
          [month]: {
            ...(memo[year] && memo[year].months && memo[year].months[month]),
            month,
            photos: [...photosForMonth, photo.id],
            count: photosForMonth.length + 1,
          },
        },
      },
    };
  }, {});

  const archive = Object.keys(archiveByYear)
    .sort()
    .reverse()
    .map(yearKey => ({
      ...archiveByYear[yearKey],
      months: Object.keys(archiveByYear[yearKey].months)
        .sort()
        .reverse()
        .map(monthKey => ({ ...archiveByYear[yearKey].months[monthKey] })),
    }));

  // Write the JSON files
  await writeContentJSON(DIRS.contentDest, 'photos.json', photos);
  await writeContentJSON(DIRS.contentDest, 'sets.json', sets);
  await writeContentJSON(DIRS.contentDest, 'tags.json', tags);
  await writeContentJSON(DIRS.contentDest, 'archive.json', archive);

  // Copy to `./images` to be served by local server or synced to S3
  await copyImages(allPhotos, DIRS.imagesDest);
};

build();
