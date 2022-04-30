Node ascii progress bar

## Installation

```bash
$ npm install @devteks/progress
```

## Usage

First we create a `ProgressBar`, giving it a format string
as well as the `total`, telling the progress bar when it will
be considered complete. After that all we need to do is `tick()` appropriately.

### Example 1:

```javascript
const { ProgressBar } = require('@devteks/progress');

const bar = new ProgressBar({
	format: '{bar} {percent}',
	total: 100
});
let timer = setInterval(() => {
  bar.tick();
  if (bar.complete) {
    console.log('\ncomplete\n');
    clearInterval(timer);
  }
}, 100);
```

-------

### Example 2:

```typescript
import { join, parse } from 'path';
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

import { fmtSize } from '../src/utils';
import { ProgressBar, ProgressStream } from '@devteks/progress';

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
```

-------

### Example 3:

```typescript
import { join, parse } from 'path';
import { IncomingMessage } from 'http';
import { createWriteStream } from 'fs';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';

import { fmtSize } from '../src/utils';
import { ProgressBar } from '@devteks/progress';

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
```

-------

### Options

| Option       | Description |
|--------------|-------------|
| `format`     | format of progress with tokens |
| `current`    | current completed index |
| `total`      | total number of ticks to complete |
| `width`      | the displayed width of the progress bar defaulting to total |
| `stream`     | the output stream defaulting to stderr |
| `head`       | head character defaulting to complete character |
| `complete`   | completion character defaulting to "=" |
| `incomplete` | incomplete character defaulting to "-" |
| `throttle`   | minimum time between updates in milliseconds defaulting to 16 |
| `onComplete` | optional function to call when the progress bar completes |
| `clear`      | will clear the progress bar upon termination |
| `line`       | terminal line |

### Tokens: (builtin tokens)
These are tokens you can use in the format of your progress bar.

| Token       | Description |
|-------------|-------------|
| `{bar}`     | the progress bar |
| `{current}` | current tick number |
| `{total}`   | total ticks |
| `{elapsed}` | time elapsed in seconds |
| `{percent}` | completion percentage |
| `{eta}`     | estimated completion time in seconds |
| `{speed}`   | speed of ticks per second |


### Custom Tokens

You can define custom tokens by adding a `{'name': value}` object parameter to your method (`tick()`) calls.

```javascript
const bar = new ProgressBar({
	format: '{current}: [token1] [token2]',
	total: 3
});

bar.tick({ 'token1': "Hello", 'token2': "World!\n" });
bar.tick(2, { 'token1': "Goodbye", 'token2': "World!" });
```
The above example would result in the output below.

```
1: Hello World!
3: Goodbye World!
```

## Examples

### Download

In our download example each tick has a variable influence, so we pass the chunk
length which adjusts the progress bar appropriately relative to the total
length.

```javascript
const { ProgressBar } = require('@devteks/progress');
const https = require('https');

const req = https.request({
  host: 'example.com',
  port: 443,
  path: '/somefile.zip'
});

req.on('response', function(res){
  const total = parseInt(res.headers['content-length'], 10);
	let current = 0;

  console.log();
  var bar = new ProgressBar({
		format: 'Downloading [{bar}] {speed} {percent} {etas}',
    complete: '=',
    incomplete: ' ',
    width: 40,
    total: total
  });

  res.on('data', (chunk) => {
		current += chunk.length;
    bar.tick(current);
  });

  res.on('end', function () {
    console.log('\n');
  });
});

req.end();
```

The above example result in a progress bar like the one below.

```
downloading [=====             ] 39/bps 29% 3.7s
```

### Interrupt

To display a message during progress bar execution, use `interrupt()`
```javascript
const { ProgressBar } = require('@devteks/progress');

const bar = new ProgressBar({ format: '{bar} {current}/{total}', total: 10 });
let timer = setInterval(() => {
  bar.tick();
  if (bar.complete) {
    clearInterval(timer);
  } else if (bar.curr === 5) {
      bar.interrupt(`this message appears above the progress bar\ncurrent progress is ${bar.current}/${bar.total}`);
  }
}, 1000);
```

You can see more examples in the `examples` folder.

## License

MIT
