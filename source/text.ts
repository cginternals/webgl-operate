
/**
 * The text object is intended as character sequence manipulation interface. A text can be referenced by multiple glyph
 * sequences for rendering and interaction. E.g., a single text could be renderer multiple times at different locations
 * or using different font faces, alignments, etc. The text object will probably increase in complexity when additional
 * features such as text formatting (bold, italic, varying size), (multi)cursor, (multi)selection, etc. will be added.
 */
export class Text {

    static readonly DEFAULT_LINEFEED = '\x0A';


    /** @see {@link text} */
    protected _text: string;

    /** @see {@link lineFeed} */
    protected _lineFeed: string = Text.DEFAULT_LINEFEED;

    /** @see {@link altered} */
    protected _altered = false;


    /**
     * Length of the text, i.e., number of characters within the text.
     */
    get length(): number {
        return this._text.length;
    }

    /**
     * Text that is to be rendered.
     */
    set text(text: string) {
        if (this._text === text) {
            return;
        }
        this._altered = true;
        this._text = text;
    }
    get text(): string {
        return this._text;
    }

    /**
     * Character that is to be used for Line feed.
     */
    set lineFeed(lineFeed: string) {
        if (this._lineFeed === lineFeed) {
            return;
        }
        this._altered = true;
        this._lineFeed = lineFeed;
        return;
    }
    get lineFeed(): string {
        return this._lineFeed;
    }

    /**
     * Intended for resetting alteration status.
     */
    set altered(altered: boolean) {
        this._altered = altered;
    }

    /*
     * Whether or not any other public property has changed.
     */
    get altered(): boolean {
        return this._altered;
    }

}
