import { join, parse } from 'path';
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

import { fmtSize } from '../src/utils';
import { ProgressBar } from '../src';

async function download(url: string, dir: string) {
	const response = await axios({ url, responseType: 'stream' });
	const inputStream = response.data as IncomingMessage;
	const outputStream = createWriteStream(join(dir, parse(url).base));

	const total = parseInt(response.headers['content-length'] as string, 10) ?? undefined;

	const progressStream = new PassThrough();
	let current = 0;
	progressStream.on('data', (chunk: Buffer) => {
		current += chunk.length;
		bar.tick(current);
	});

	const bar = new ProgressBar({
		format: '{percent} {bar} {current} / {total} {speed} {elapsed}s',
		formatValue: fmtSize,
		total,
		minWidth: 20,
	});

	await pipeline(inputStream, progressStream, outputStream);

	console.log('\nDONE...');
}

async function main() {
	const url = 'https://proof.ovh.net/files/1Mb.dat';
	const dir = join(process.cwd(), '/_output/');
	download(url, dir);
}

main();
