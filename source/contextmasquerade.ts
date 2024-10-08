
/* spellchecker: disable */

import { auxiliaries } from './auxiliaries';

import { ExtensionsHash } from './extensionshash';

/* spellchecker: enable */


/**
 * Mask object for context masquerade. It is used to artificially restrict the capabilities of context instances.
 * It is intended to simplify cross-browser testing without actually using different browsers.
 *
 * A mask can be instantiated in four different ways:
 * 1. by creating the object and explicitly configuring all values as required.
 * 2. from a preset identifier (all presets are stored in assets/masquerade.json).
 * 3. from an extension hash
 * 4. from GET parameters, either 'msqrd_p=<Identifer>' or 'msqrd_h=<ExtensionsHash>'.
 *
 * Intended use; when the context's static masquerade is set, all subsequent instances apply that mask:
 * ```
 * Context.masquerade = ContextMasquerade.fromHash('288M01-o');
 * ```
 */
export class ContextMasquerade {

    /** @see {@link presets} */
    protected static readonly MASQUERADE_JSON: Array<ContextMasquerade.Preset> = require('./data/masquerade.json');

    /** @see {@link backend} */
    protected _backend: string;

    /** @see {@link extensionsStrive} */
    protected _extensionsStrive = new Array<string>();

    /** @see {@link extensionsConceal} */
    protected _extensionsConceal = new Array<string>();

    /** @see {@link functionsUndefine} */
    protected _functionsUndefine = new Array<string>();

    /**
     * Generates a mask based on an extensions hash (encoding backend and extensions_strive). If extensions are strived
     * for, all extensions that are not explicitly mentioned will be added to the list of concealed extensions.
     * @param hash - Hash that is to be decoded for backend and extensions data.
     */
    static fromHash(hash: string): ContextMasquerade {
        const mask = new ContextMasquerade();
        const tuple = ExtensionsHash.decode(hash);

        mask._backend = tuple[0];
        mask._extensionsStrive = tuple[1];
        mask._extensionsConceal = ExtensionsHash.complement(mask._backend, mask._extensionsStrive);

        return mask;
    }

    /**
     * Creates a context mask based on a preset. Note that the presence of an extensions_hash overrides the backend,
     * extensions_strive, as well as extensions_conceal. Only the functions_undefine will be preserved in that case.
     * @param identifier - Name of a preset as specified in masquerade.json.
     */
    static fromPreset(identifier: string): ContextMasquerade {
        const mask = new ContextMasquerade();

        const identifiers = new Array<string>();
        let preset: ContextMasquerade.Preset | undefined;
        for (const p of ContextMasquerade.presets()) {
            identifiers.push(p.identifier);
            if (p.identifier !== identifier) {
                continue;
            }
            preset = p;
            break;
        }

        if (preset === undefined) {
            auxiliaries.assert(false,
                `expected valid identifier, available ['${identifiers.join('\', \'')}'], given '${identifier}'`);
        }
        preset = preset as ContextMasquerade.Preset;

        if (preset.extensions_hash !== undefined) {
            const tuple = ExtensionsHash.decode(preset.extensions_hash);
            mask._backend = tuple[0];
            mask._extensionsStrive = tuple[1];
        } else {
            mask._backend = preset.backend!;
        }

        auxiliaries.assert(mask._backend !== undefined,
            'expected backend to be included in preset');

        if (preset.extensions_strive === undefined) {
            mask._extensionsStrive = [];
            mask._extensionsConceal = preset.extensions_conceal ? preset.extensions_conceal : [];
        } else {
            mask._extensionsStrive = preset.extensions_strive;
            mask._extensionsConceal = ExtensionsHash.complement(mask._backend, preset.extensions_strive);
        }

        mask._functionsUndefine = preset.functions_undefine ? preset.functions_undefine : [];

        return mask;
    }

    /**
     * Tries to generate a mask based on GET parameters: if msqrd_h is present, its value is interpreted as
     * extensions hash and a mask is generated from hash. If no hash was found, presence of msqrd_p is evaluated and if
     * found, a mask is generated from preset identifier.
     */
    static fromGET(): ContextMasquerade | undefined {
        const msqrdHash = auxiliaries.GETparameter('msqrd_h');
        if (msqrdHash !== undefined) {
            return ContextMasquerade.fromHash(msqrdHash);
        }
        const msqrdPreset = auxiliaries.GETparameter('msqrd_p');
        if (msqrdPreset !== undefined) {
            return ContextMasquerade.fromPreset(msqrdPreset);
        }
        return undefined;
    }

    /*
     * Presets for emulation of various browsers. This can be used to maintain multiple test configurations and
     * simplify cross-browser testing without actually using different browsers.
     */
    static presets(): Array<ContextMasquerade.Preset> {
        return this.MASQUERADE_JSON;
    }

    /**
     * Defines the backend (currently either 'webgl1' or 'webgl2').
     */
    get backend(): string {
        return this._backend;
    }

    /**
     * Extensions that the context should strive to support. The support can only go as far as the extensions are
     * actually supported.
     */
    get extensionsStrive(): Array<string> {
        return this._extensionsStrive;
    }

    /**
     * Extensions that the context should conceal support of. This only affects supported extensions, which will
     * be reported to be not supported.
     */
    get extensionsConceal(): Array<string> {
        return this._extensionsConceal;
    }

    /**
     * Functions that the context should delete during construction. Since WebGL context functions cannot be deleted
     * they are undefined instead.
     */
    get functionsUndefine(): Array<string> {
        return this._functionsUndefine;
    }
}


export namespace ContextMasquerade {

    /**
     * Interfaces required to prevent implicit any when parsing masquerade.json.
     */
    export interface Preset {
        identifier: string;
        backend?: string;
        extensions_hash?: string;
        extensions_strive?: Array<string>;
        extensions_conceal?: Array<string>;
        functions_undefine?: Array<string>;
    }

}
