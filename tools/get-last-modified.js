import { exec } from 'child_process';

const getLastModified = async (file) => new Promise((resolve, reject) => {
  exec(`git log -1 --pretty="format:%ci" ${file}`, (err, out) => {
    if (err) {
      console.error('[tools/get-last-modified] error: ', err);
      reject(err);
    }
    resolve(new Date(out));
  });
});
export default getLastModified;
