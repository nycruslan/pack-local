#!/usr/bin/env node

import('./dist/index.js')
  .then((module) => {
    if (module.default) {
      module.default();
    }
  })
  .catch((err) => {
    console.error('Error executing CLI:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
