import findFilesAndFolders from './find-files-and-folders.js';

/**
 * @type {import('./find-files-and-folders.js').Predicate}
 */
const isBookYamlFilePredicate = (name, _path, stat) => stat.isFile() && /book.*.ya?ml/.test(name);

/**
* @param {string} [dir='<repo_root>/docs'] root dir
* @returns {Promise<void>} absolute paths
*/
const findBooks = async (dir) => {
  const { files } = await findFilesAndFolders(isBookYamlFilePredicate, dir);
  return files;
};

export default findBooks;
