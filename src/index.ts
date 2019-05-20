import { SyntaxError } from "./SyntaxError";

const NOT_WHITESPACE_OR_END = /^(\S|$)/;
const SPACE_QUOTE_PARENT_ESCAPED_OR_END = /^(\s|\\|"|'|`|,|\(|\)|$)/;
const STRING_OR_ESCAPED_OR_END = /^(\\|"|$)/;
const QUOTES = /('|`|,)/;
const QUOTES_MAP: { [key: string]: string; } = {
	"'": "quote",
	"`": "quasiquote",
	",": "unquote"
};

export default class SParser {

	public static parse(stream: string) {
		const parser = new SParser(stream);
		const expression = parser.expr();

		// if anything is left to parse, it's a syntax error
		if (parser.peek() !== null) {
			throw new SyntaxError(`Syntax error: Superfluous characters after expression: ${parser.peek()}`, parser._line + 1, parser._col + 1);
		}

		return expression;
	}
	private _line: number;
	private _col: number;
	private _pos: number;
	private _stream: string;

	constructor(stream: string) {
		this._line = this._col = this._pos = 0;
		this._stream = stream;
	}

	public peek(): string {
		if (this._stream.length === this._pos) { return null; }
		return this._stream[this._pos];
	}

	public consume(): string {
		if (this._stream.length === this._pos) { return null; }

		let c = this._stream[this._pos];
		this._pos += 1;

		if (c === "\r") {
			if (this.peek() === "\n") {
				this._pos += 1;
				c += "\n";
			}
			this._line++;
			this._col = 0;
		} else if (c === "\n") {
			this._line++;
			this._col = 0;
		} else {
			this._col++;
		}

		return c;
	}

	public until(regex: RegExp): string {
		let s = "";

		while (this.peek() != null && !regex.test(this.peek())) {
			s += this.consume();
		}

		return s;
	}

	public string(): string {
		// consume "
		this.consume();

		let str = "";

		while (true) {
			str += this.until(STRING_OR_ESCAPED_OR_END);
			let next = this.peek();

			if (next === null) {
				throw new SyntaxError(`Syntax Error: Unterminated string literal`, this._line + 1, this._col + 1);
			}

			if (next === '"') {
				this.consume();
				if (str === "") {
					str = " ";
				}
				break;
			}

			if (next === "\\") {
				this.consume();
				next = this.peek();

				if (next === "r") {
					this.consume();
					str += "\r";
				} else if (next === "t") {
					this.consume();
					str += "\t";
				} else if (next === "n") {
					this.consume();
					str += "\n";
				} else if (next === "f") {
					this.consume();
					str += "\f";
				} else if (next === "b") {
					this.consume();
					str += "\b";
				} else {
					str += this.consume();
				}
			}
		}

		// wrap in object to make strings distinct from symbols
		return str;
	}

	public atom(): string {
		if (this.peek() === '"') {
			return this.string();
		}

		let atom = "";

		while (true) {
			atom += this.until(SPACE_QUOTE_PARENT_ESCAPED_OR_END);
			const next = this.peek();

			if (next === "\\") {
				this.consume();
				atom += this.consume();
				continue;
			}

			break;
		}

		return atom;
	}

	public quoted(): Array<string | string[]> {
		let q = this.consume();
		let quote = QUOTES_MAP[q];

		if (quote === "unquote" && this.peek() === "@") {
			this.consume();
			quote = "unquote-splicing";
			q = ",@";
		}

		// ignore whitespace
		this.until(NOT_WHITESPACE_OR_END);
		const quotedExpr = this.expr();

		// nothing came after '
		if (quotedExpr === "") {
			throw new SyntaxError(`Syntax Error: Unexpected ${this.peek()} after ${q}`, this._line + 1, this._col + 1);
		}

		return [quote, quotedExpr];
	}

	public expr(): string[] | string {
		// ignore whitespace
		this.until(NOT_WHITESPACE_OR_END);

		if (QUOTES.test(this.peek())) {
			return this.quoted() as string[];
		}

		const expr = this.peek() === "(" ? this.list() : this.atom();

		// ignore whitespace
		this.until(NOT_WHITESPACE_OR_END);

		return expr as string[];
	}

	public list() {
		if (this.peek() !== "(") {
			throw new SyntaxError(`Syntax Error: Expected ( - saw ${this.peek()} instead.`, this._line + 1, this._col + 1);
		}

		this.consume();

		const ls: string[] | string[][] = [];
		let v = this.expr();

		while (v !== "") {
			if (v === " ") {
				v = "";
			}
			ls.push(v as any);
			v = this.expr();
		}

		if (this.peek() !== ")") {
			throw new SyntaxError(`Syntax Error: Expected ) - saw: ${this.peek()}`, this._line + 1, this._col + 1);
		}

		// consume that closing paren
		this.consume();

		return ls;
	}

}
