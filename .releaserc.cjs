module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog', 
      {
        changelogFile: 'CHANGELOG.md',
      }
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md', 'prisma/prisma-cloud/docs/sitemaps/**'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: "echo 'generating sitemaps' && npm run gen:sitemaps",
        publishCmd: "echo 'deploy worker' && npm run deploy",
      },
    ],
  ],
};