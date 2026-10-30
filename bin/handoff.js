#!/usr/bin/env node
import { main } from '../src/cli.ts';
try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`handoff: ${error.message}`);
  process.exitCode = 1;
}
