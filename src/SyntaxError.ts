export class SyntaxError extends Error {
	constructor(message: string, public line: number, public col: number) {
		super(`${message} line: ${line} col: ${col}` );
	}
}
