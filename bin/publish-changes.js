#!/usr/bin/node

function publishChanges() {
  const args = process.argv.slice(2);
  console.log('publishChanges() changed files: ', args);
}

publishChanges();
