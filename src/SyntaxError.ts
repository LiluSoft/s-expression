/**
 * Syntax Error for s-expression parsing
 * contains message, line and column
 */
export class SyntaxError extends Error {
	constructor(message: string, public line: number, public col: number) {
		super(`${message} line: ${line} col: ${col}` );
	}
}
