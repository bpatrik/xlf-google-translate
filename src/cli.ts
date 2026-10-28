#!/usr/bin/env node
import {Config} from './config/Config';
import {resolveOptions} from './options';
import {run} from './translator';

const main = async (): Promise<void> => {
  const options = resolveOptions(Config);
  // in extraction mode stdout carries the JSON result, so progress goes to stderr
  const log = options.extractOriginalOnly ? console.error : console.log;
  const result = await run(options, log);
  if (result.extracted) {
    console.log(JSON.stringify(result.extracted, null, 2));
  }
};

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
