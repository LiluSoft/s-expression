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

/**
 * S-Expression Parser
 */
export default class SParser {
	/**
	 * Recursively parses s-expressions into arrays
	 * @param stream s-expression string
	 */
	public static parse(stream: string) {
		const parser = new SParser(stream);
		const expression = parser.expr();

		// if anything is left to parse, it's a syntax error
		if (parser.peek() !== null) {
			throw new SyntaxError(`Syntax error: Superfluous characters after expression: ${parser.peek()}`, parser._line + 1, parser._col + 1);
		}

		return expression;
	}
	/**
	 * Current Line
	 */
	private _line: number;

	/**
	 * Current Column
	 */
	private _col: number;

	/**
	 * Current Position
	 */
	private _pos: number;

	/**
	 * String to parse
	 */
	private _stream: string;

	/**
	 * Instantiates a new SParser
	 * @param stream s-expression string
	 */
	constructor(stream: string) {
		this._line = this._col = this._pos = 0;
		this._stream = stream;
	}

	/**
	 * Returns the next character
	 */
	public peek(): string {
		if (this._stream.length === this._pos) { return null; }
		return this._stream[this._pos];
	}

	/**
	 * Returns the next character and advances the counter, if a new line is detected, return it as well
	 */
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

	/**
	 * Parse the string until a regex is encountered and return the parsed substring
	 * @param regex matcher look for
	 */
	public until(regex: RegExp): string {
		let s = "";

		while (this.peek() != null && !regex.test(this.peek())) {
			s += this.consume();
		}

		return s;
	}

	/**
	 * parse until string section ends and return the string
	 */
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

	/**
	 * Returns the next atom
	 */
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

	/**
	 * Returns the next quoted
	 */
	public quoted(): (string | string[])[] {
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

	/**
	 * returns the next expression
	 */
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

	/**
	 * returns the next list
	 */
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
