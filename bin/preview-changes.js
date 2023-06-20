import fs from 'node:fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import yaml from 'js-yaml';

/**
 * Generates preview URLs as GitHub comments for adoc changes
 * or displays a default preview URL if only book changes
 *
 * @param github
 * @param context
 * @param glob
 * @param changes
 * @returns {Promise<void>}
 */
export default async function previewChanges({
  github, context, glob, changes,
}) {
  const host = 'https://main--prisma-cloud-docs-website--hlxsites.hlx.page';
  const fallbackPath = '/prisma/prisma-cloud/en';
  const branch = context.payload.pull_request.head.ref;
  const adocChanges = changes.filter((change) => change.endsWith('.adoc'));

  const bookGlobber = await glob.create('docs/**/book.yml');
  const books = await bookGlobber.glob();

  const adocGlobber = await glob.create('docs/**/*.adoc');
  const adocs = await adocGlobber.glob();

  // Find all references adoc files in books
  const adocReferences = new Set();
  const normalizePath = (path) => path.toLowerCase().replaceAll('_', '-');
  const buildAdocReferencePath = (doc, currentPath) => {
    if (doc.file) {
      currentPath.push(normalizePath(doc.file));
      return currentPath.join('/');
    }

    if (doc.dir) {
      currentPath.push(normalizePath(doc.dir));
    }

    if (doc.topics) {
      doc.topics.forEach((topic) => {
        const path = buildAdocReferencePath(topic, [...currentPath]);
        if (path) {
          adocReferences.add(path);
        }
      });
    }

    return null;
  };

  books.forEach((book) => {
    const docs = yaml.loadAll(fs.readFileSync(book).toString()).filter((doc) => doc?.kind === 'chapter');
    docs.forEach((doc) => {
      buildAdocReferencePath(doc, book.split('/').slice(0, -1));
    });
  });

  // Compare adoc files with adoc referenced in books
  const missingReferences = [...adocReferences]
    .filter((adocReference) => !adocs.includes(adocReference));

  // Remove "docs" and ".adoc" from path
  const cleanChangePath = (file) => file.slice(4, -5);

  let body = adocChanges.length ? `Preview URL(s):\n\n${adocChanges.map((change) => `- ${host}/prisma/prisma-cloud${cleanChangePath(change)}?branch=${branch}`).join('\n')}`
    : `Default Preview URL: ${host}${fallbackPath}?branch=${branch}`;

  if (missingReferences.length) {
    // Remove home/runner/work/repo/dir
    const cleanRefPath = (ref) => ref.split('/').slice(6).join('/');

    const buildGHLink = (path) => `https://github.com/${context.payload.pull_request.base.repo.full_name}/tree/${branch}/${cleanRefPath(path)}`;

    body += `\n\nWarning: ${missingReferences.length} missing adoc reference(s) found:\n\n`;
    body += `${missingReferences.map((missingReference) => `- <a href="${buildGHLink(missingReference)}" target="_blank">${cleanRefPath(missingReference)}</a>`).join('\n')}`;
  }

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body,
  });
}
