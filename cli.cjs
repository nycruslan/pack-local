#!/usr/bin/env node
import('./dist/index.js').catch((err) => {
  console.error('Error executing CLI:', err);
  process.exit(1);
});
