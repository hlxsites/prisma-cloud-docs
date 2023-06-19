/**
 * Generates preview URLs as GitHub comments for adoc changes
 * or displays a default preview URL if only book changes
 *
 * @param github
 * @param context
 * @param changes
 * @returns {Promise<void>}
 */
export default async function previewChanges({ github, context, changes }) {
  const host = 'https://main--prisma-cloud-docs-website--hlxsites.hlx.page';
  const fallbackPath = '/prisma/prisma-cloud/en';
  const branch = context.payload.pull_request.head.ref;

  // We only care about adoc changes for preview urls
  const adocChanges = changes.filter((change) => change.endsWith('.adoc'));
  // Remove "docs" and ".adoc" from path
  const cleanPath = (file) => file.slice(4, -5);

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: adocChanges.length ? `
Preview URL(s):
    
${adocChanges.map((change) => `- ${host}/prisma/prisma-cloud${cleanPath(change)}?branch=${branch}`).join('\n')}`
      : `Default Preview URL: ${host}${fallbackPath}?branch=${branch}`,
  });
}
