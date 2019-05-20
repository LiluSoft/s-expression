import { expect } from "chai";
import fs from "fs";
import "mocha";
import SParser from "../src/index";
import { SyntaxError } from "../src/SyntaxError";

describe("simple", () => {
	it("should parse simple and empty sexp", () => {
		expect(SParser.parse("((a b c)(()()))")).to.deep.eq([["a", "b", "c"], [[], []]]);
		expect(SParser.parse("((a b c) (() ()))")).to.deep.eq([["a", "b", "c"], [[], []]]);
	});

	it("should parse quoted sexp", () => {
		expect(SParser.parse("((a 'b 'c))")).to.deep.eq([["a", ["quote", "b"], ["quote", "c"]]]);
		expect(SParser.parse("(a '(a b c))")).to.deep.eq(["a", ["quote", ["a", "b", "c"]]]);
		expect(SParser.parse("(a ' (a b c))")).to.deep.eq(["a", ["quote", ["a", "b", "c"]]]);

	});
	it("should parse quoted sexp but Multiple quotes should not be flattened", () => {
		expect(SParser.parse("(a '' (a b c))")).to.deep.eq(["a", ["quote", ["quote", ["a", "b", "c"]]]]);
	});

	it("should parse quasiquote sexp", () => {
		expect(SParser.parse("((a `b `c))")).to.deep.eq([["a", ["quasiquote", "b"], ["quasiquote", "c"]]]);
		expect(SParser.parse("(a `(a b c))")).to.deep.eq(["a", ["quasiquote", ["a", "b", "c"]]]);
		expect(SParser.parse("(a ` (a b c))")).to.deep.eq(["a", ["quasiquote", ["a", "b", "c"]]]);

	});
	it("should parse quasiquote sexp but Multiple quasiquotes should not be flattened", () => {
		expect(SParser.parse("(a `` (a b c))")).to.deep.eq(["a", ["quasiquote", ["quasiquote", ["a", "b", "c"]]]]);
	});

	it("should parse unquote sexp", () => {
		expect(SParser.parse("((a ,b ,c))")).to.deep.eq([["a", ["unquote", "b"], ["unquote", "c"]]]);
		expect(SParser.parse("(a ,(a b c))")).to.deep.eq(["a", ["unquote", ["a", "b", "c"]]]);
		expect(SParser.parse("(a , (a b c))")).to.deep.eq(["a", ["unquote", ["a", "b", "c"]]]);

	});
	it("should parse unquote sexp Multiple unquotes should not be flattened", () => {
		expect(SParser.parse("(a ,, (a b c))")).to.deep.eq(["a", ["unquote", ["unquote", ["a", "b", "c"]]]]);
	});
	it("should parse unquote-splicing sexp", () => {
		expect(SParser.parse("((a ,@b ,@c))")).to.deep.eq([["a", ["unquote-splicing", "b"], ["unquote-splicing", "c"]]]);
		expect(SParser.parse("(a ,@(a b c))")).to.deep.eq(["a", ["unquote-splicing", ["a", "b", "c"]]]);
		expect(SParser.parse("(a ,@ (a b c))")).to.deep.eq(["a", ["unquote-splicing", ["a", "b", "c"]]]);

	});
	it("should parse uquote-splicing sexp but Multiple unquote-splicings should not be flattened", () => {
		expect(SParser.parse("(a ,@,@ (a b c))")).to.deep.eq(["a", ["unquote-splicing", ["unquote-splicing", ["a", "b", "c"]]]]);
	});
	it("should throw for Any character after a complete expression", () => {
		expect(() => SParser.parse("()()")).to.throw(/Superfluous characters after expression/);
		expect(() => SParser.parse("((a) b))")).to.throw(/Superfluous characters after expression/);
		expect(() => SParser.parse("((a))abc")).to.throw(/Superfluous characters after expression/);
	});
	it("should throw for A ' without anything to quote", () => {
		expect(() => SParser.parse("(')")).to.throw(/Unexpected/);
	});
	it("should parse a quoted empty list", () => {
		expect(SParser.parse("'()")).to.deep.eq(["quote", []]);
	});
	it("should parse An empty list", () => {
		expect(SParser.parse("()")).to.deep.eq([]);
	});
	it("should parse A quoted atom", () => {
		expect(SParser.parse("'a")).to.deep.eq(["quote", "a"]);
	});
	it("should parse A quoted atom in a list", () => {
		expect(SParser.parse("'(a)")).to.deep.eq(["quote", ["a"]]);
	});
	it("should parse An atom", () => {
		expect(SParser.parse("a")).to.deep.eq("a");
	});
	it("should parse Quote as symbol delimiting", () => {
		expect(SParser.parse("(a'b)")).to.deep.eq(["a", ["quote", "b"]]);
	});
	it("should parse Quasiquote as symbol delimiting", () => {
		expect(SParser.parse("(a`b)")).to.deep.eq(["a", ["quasiquote", "b"]]);
	});
	it("should parse Unquote as symbol delimiting", () => {
		expect(SParser.parse("(a,b)")).to.deep.eq(["a", ["unquote", "b"]]);
	});
	it("should parse Unquote-splicing as symbol delimiting", () => {
		expect(SParser.parse("(a,@b)")).to.deep.eq(["a", ["unquote-splicing", "b"]]);
	});
	it("should parse Escaped quotes in symbols", () => {
		expect(SParser.parse("(a\\'b)")).to.deep.eq(["a'b"]);
	});
	it("should parse Escaped quotes in symbols", () => {
		expect(SParser.parse("(a\\\"b)")).to.deep.eq(['a\"b']);
	});
	it("should parse Escaped \\ in symbols as \\", () => {
		expect(SParser.parse("(a\\\\b)")).to.deep.eq(["a\\b"]);
	});
	it("should parse Escaped normal characters in symbols as normal characters", () => {
		expect(SParser.parse("(a\\b)")).to.deep.eq(["ab"]);
	});
	it("should fail to parse (\\n')", () => {
		expect(() => SParser.parse("(\n'")).to.throw(/Syntax Error: Unexpected null after \' line: 2 col: 2/);
	});
	it("should fail to parse (\\r\\n'", () => {
		expect(() => SParser.parse("(\r\n'")).to.throw(/Syntax Error: Unexpected null after \' line: 2 col: 2/);
	});
	it("should parse empty strings", () => {
		// bug
		expect(SParser.parse('(a "")')).to.deep.eq(["a", ""]);
	});
	it("should parse string objects", () => {
		expect(SParser.parse('(a "a")')).to.deep.eq(["a", "a"]);
	});
	it("should parse double quotes as symbol delimiter", () => {
		expect(SParser.parse('(a"s"b)')).to.deep.eq(["a", "s", "b"]);
	});
	it("should parse Escaped double quotes in symbols", () => {
		expect(SParser.parse('(a\\"s\\"b)')).to.deep.eq(['a"s"b']);
	});
	it("should parse Escaped double quotes \" in Strings", () => {
		expect(SParser.parse('(a "\\"\n")')).to.deep.eq(["a", '"\n']);
	});
	it("should parse Escaped \\ in Strings", () => {
		expect(SParser.parse('(a "\\\\")')).to.deep.eq(["a", "\\"]);
	});
	it("should parse Escaped characters", () => {
		expect(SParser.parse('(a "\\a")')).to.deep.eq(["a", "a"]);
	});
	it("should throw Prematurely ending strings", () => {
		expect(() => SParser.parse('(a "string)')).to.throw(/Unterminated string literal/);
	});
	it("should parse A quoted string", () => {
		expect(SParser.parse('\'"string"')).to.deep.eq(["quote", "string"]);
	});
	it("should fail to parse (\"a)", () => {
		expect(() => SParser.parse("(\"a)")).to.throw("Syntax Error: Unterminated string literal");
	});
	it("should ignore whitespace", () => {
		expect(SParser.parse("  a   ")).to.deep.eq("a");
	});
	it("should parse empty expressions", () => {
		expect(SParser.parse("    ")).to.deep.eq("");
	});

	it("should parse quoted symbols with spaces", () => {
		expect(SParser.parse('(abc "A B C" "D E F")')).to.deep.eq(["abc", "A B C", "D E F"]);
	});
	it("should parse lib description", () => {
		expect(SParser.parse('(descr "Bulgin Battery Holder, BX0036, Battery Type C (https://www.bulgin.com/products/pub/media/bulgin/data/Battery_holders.pdf)")'))
			.to.deep.eq(["descr", "Bulgin Battery Holder, BX0036, Battery Type C (https://www.bulgin.com/products/pub/media/bulgin/data/Battery_holders.pdf)"]);
	});
	it("should parse fp_text", () => {
		expect(SParser.parse(`(fp_text reference REF** (at 27.8 -18.1) (layer F.SilkS)
		(effects (font (size 1 1) (thickness 0.15)))
	  )`)).to.deep
			.eq(["fp_text", "reference", "REF**", ["at", "27.8", "-18.1", ], ["layer", "F.SilkS", ], ["effects", ["font", ["size", "1", "1"], ["thickness", "0.15"]]]]);
	});

	it("should parse pad with empty name", () => {
		expect(SParser.parse(`(pad "" np_thru_hole circle (at 11.9 0) (size 3.8 3.8) (drill 3.8) (layers *.Cu *.Mask))`)).to.deep
			.eq(["pad", "", "np_thru_hole", "circle", ["at", "11.9", "0"], ["size", "3.8", "3.8"], ["drill", "3.8"], ["layers", "*.Cu", "*.Mask"]]);
	});

	it("should parse pad with one quoted word name", () => {
		expect(SParser.parse(`(pad "abc" np_thru_hole circle (at 11.9 0) (size 3.8 3.8) (drill 3.8) (layers *.Cu *.Mask))`)).to.deep
			.eq(["pad", "abc", "np_thru_hole", "circle", ["at", "11.9", "0"], ["size", "3.8", "3.8"], ["drill", "3.8"], ["layers", "*.Cu", "*.Mask"]]);
	});
	it("should parse a pad with quoted string with multiple spaces", () => {
		expect(SParser.parse(`(pad "a b c" np_thru_hole circle (at 11.9 0) (size 3.8 3.8) (drill 3.8) (layers *.Cu *.Mask))`)).to.deep
			.eq(["pad", "a b c", "np_thru_hole", "circle", ["at", "11.9", "0"], ["size", "3.8", "3.8"], ["drill", "3.8"], ["layers", "*.Cu", "*.Mask"]]);
	});

	it("should parse a kicad_mod file", () => {
		const RESOURCE_FILE = __dirname + "/resources/test.kicad_mod";
		const PARSED_RESOURCE_FILE = __dirname + "/resources/test.kicad_mod.json";
		const preprocessed = JSON.parse(fs.readFileSync(PARSED_RESOURCE_FILE).toString());
		const data = SParser.parse(fs.readFileSync(RESOURCE_FILE).toString());
		expect(data).to.deep.eq(preprocessed);

	});
});
