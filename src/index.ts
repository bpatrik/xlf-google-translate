import {run} from './translator';
import {Config} from './config/Config';

if (Config.source.file == null) {
  console.log('source.file is not set');
  process.exit();
}
if (Config.source.lang == null) {
  console.log('source.lang is not set');
  process.exit();
}
if (Config.destination.languages == null) {
  console.log('destination.languages is not set');
  process.exit();
}

if (Config.destination.filename == null) {
  console.log('destination.filename is not set');
  process.exit();
}

if (Config.destination.folder == null) {
  console.log('destination.folder is not set');
  process.exit();
}
run().catch(console.error);

