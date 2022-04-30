export interface Progress {
	percent: number;
	current: number;
	total: number;
	remaining: number;
	eta: number;
	runtime: number;
	//delta: number;
	speed: number;
}
