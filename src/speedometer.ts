export function speedometer(seconds: number = 5) {
	seconds = seconds || 5;
	const interval = 1000 / RESOLUTION;
	const size = RESOLUTION * seconds;
	let buffer: number[] = [0];
	let pointer = 1;
	let tick: number = 1;
	let last = (tick - 1) & MAX_TICK;
	let lastSpeed: number = 0;
	let ended = false;

	const timer = setInterval(() => tick = (tick + 1) & MAX_TICK, interval);
	if (timer.unref) timer.unref();

	const end = () => {
		ended = true;
		clearInterval(timer);
		buffer = [];
	};

	const speed = (delta?: number): number => {
		if (ended) return lastSpeed;

		if (delta == null) {
			end();
			return lastSpeed;
		}

		let dist = (tick - last) & MAX_TICK;
		if (dist > size) dist = size;
		last = tick;

		while (dist--) {
			if (pointer === size) pointer = 0;
			buffer[pointer] = buffer[pointer === 0 ? size - 1 : pointer - 1];
			pointer++;
		}

		if (delta) buffer[pointer - 1] += delta;

		const top = buffer[pointer - 1];
		const btm = buffer.length < size ? 0 : buffer[pointer === size ? 0 : pointer];

		lastSpeed = buffer.length < RESOLUTION ? top : ((top - btm) * RESOLUTION) / buffer.length;

		return lastSpeed;
	};

	return speed;
}

const MAX_TICK = 65535;
const RESOLUTION = 4;
