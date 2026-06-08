/**
 * @param {string} path
 */
const normalizePath = (path) => {
  const parts = path.split('/');
  const last = parts.pop().replace(/_/g, '-').replace(/-{2,}/, '-').toLowerCase();
  return [...parts, last].join('/');
};

export default normalizePath;
