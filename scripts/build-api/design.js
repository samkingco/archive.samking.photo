const {
  slugify,
  processImages,
  getImageListFromMarkdown,
  parseMarkdown,
} = require('./utils');

const buildDesignProjectJSON = async (project, imgSrc, imgDest) => {
  const markdownImages = getImageListFromMarkdown(project.content);
  const projectImages = project.cover
    ? [{ src: project.cover }, ...markdownImages]
    : markdownImages;

  const processedImages = await processImages(projectImages, {
    imgSrc,
    imgDest,
  });

  const coverImage = processedImages.find(i => i.meta.src === project.cover);
  const coverUrl = coverImage ? coverImage.src : null;

  return Object.assign(
    {
      id: slugify(project.title),
    },
    project,
    {
      cover: coverUrl,
      content: parseMarkdown(project.content, processedImages),
      images: processedImages,
    },
  );
};

const buildDesignJSON = async (designSrc, imgSrc, imgDest) => {
  const projects = designSrc.map(
    async project => await buildDesignProjectJSON(project, imgSrc, imgDest),
  );

  return await Promise.all(projects);
};

module.exports = {
  buildDesignProjectJSON,
  buildDesignJSON,
};
