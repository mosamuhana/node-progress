import { join, parse } from 'path';
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

import { fmtSize } from '../src/utils';
import { ProgressBar, ProgressStream } from '../src';

async function download(url: string, dir: string) {
	const response = await axios({ url, responseType: 'stream' });
	const inputStream = response.data as IncomingMessage;
	const outputStream = createWriteStream(join(dir, parse(url).base));

	const report = new ProgressStream({
		interval: 500,
		onTotal: x => bar.total = x, // or use `total` event
		onProgress: x => bar.tick(x.current), // or use progress event
	});

	const bar = new ProgressBar({
		format: '{percent} {bar} {current} / {total} {speed} {elapsed}s',
		formatValue: fmtSize,
	});

	//report.on('total', total => bar.total = total);
	//report.on('progress', progress => bar.tick(progress.current));

	await pipeline(inputStream, report, outputStream);
	console.log('\nDONE...');
}

async function main() {
	const url = 'https://proof.ovh.net/files/1Mb.dat';
	const dir = join(process.cwd(), '/_output/');
	download(url, dir);
}

main();
