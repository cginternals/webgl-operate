
import { assert, GETparameter } from './common';

import { ExtensionsHash } from './extensionshash';


/**
 * Interfaces required to prevent implicit any when parsing masquerade.json.
 */
interface MasqueradePreset {
    identifier: string;
    backend: string;
    extensions_hash: string;
    extensions_strive: Array<string>;
    extensions_conceal: Array<string>;
    functions_undefine: Array<string>;
}
interface MasqueradePresets {
    presets: Array<MasqueradePreset>;
}


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

    /**
     * Presets for emulation of various browsers. This can be used to maintain multiple test configurations and
     * simplify cross-browser testing without actually using different browsers.
     */
    private static readonly MASQUERADE_JSON: MasqueradePresets = require('../assets/masquerade.json');

    /**
     * @see {@link backend}
     */
    protected _backend: string | undefined = undefined;

    /**
     * @see {@link extensionsStrive}
     */
    protected _extensionsStrive = new Array<string>();

    /**
     * @see {@link extensionsConceal}
     */
    protected _extensionsConceal = new Array<string>();

    /**
     * @see {@link functionsUndefine}
     */
    protected _functionsUndefine = new Array<string>();

    /**
     * Generates a mask based on an extensions hash (encoding backend and extensions_strive).
     *
     * @param hash - Hash that is to be decoded for backend and extensions data.
     */
    static fromHash(hash: string): ContextMasquerade {
        const mask = new ContextMasquerade();
        const tuple = ExtensionsHash.decode(hash);

        mask._backend = tuple[0];
        mask._extensionsStrive = tuple[1];

        return mask;
    }

    /**
     * Creates a context mask based on a preset. Note that the presence of an extensions_hash overrides the backend,
     * extensions_strive, as well as extensions_conceal. Only the functions_undefine will be preserved in that case.
     *
     * @param identifier - Name of a preset as specified in masquerade.json.
     */
    static fromPreset(identifier: string): ContextMasquerade {
        const mask = new ContextMasquerade();

        const identifiers = new Array<string>();
        let preset: MasqueradePreset | undefined;
        for (const p of ContextMasquerade.MASQUERADE_JSON.presets) {
            identifiers.push(p.identifier);
            if (p.identifier === identifier) {
                preset = p;
            }
        }
        assert(preset !== undefined
            , `expected valid identifier, available ['${identifiers.join('\', \'')}'], given '${identifier}'`);

        preset = preset as MasqueradePreset;

        if (preset.extensions_hash !== undefined) {
            const tuple = ExtensionsHash.decode(preset.extensions_hash);
            mask._backend = tuple[0];
            mask._extensionsStrive = tuple[1];
        } else {
            mask._backend = preset.backend;
            mask._extensionsConceal = preset.extensions_conceal;
            mask._extensionsStrive = preset.extensions_strive;
        }
        mask._functionsUndefine = preset.functions_undefine;

        assert(mask._backend !== undefined,
            'expected backend to be included in preset');

        if (mask._extensionsStrive === undefined) {
            mask._extensionsStrive = [];
        }

        if (mask._extensionsConceal === undefined) {
            mask._extensionsConceal = [];
        }

        if (mask._functionsUndefine === undefined) {
            mask._functionsUndefine = [];
        }

        return mask;
    }

    /**
     * Tries to generate a mask based on GET parameters: if msqrd_h is present, its value is interpreted as
     * extensions hash and a mask is generated from hash. If no hash was found, presence of msqrd_p is evaluated and if
     * found, a mask is generated from preset identifier.
     */
    static fromGET(): ContextMasquerade | undefined {
        const msqrdHash = GETparameter('msqrd_h');
        if (msqrdHash !== undefined) {
            return ContextMasquerade.fromHash(msqrdHash);
        }
        const msqrdPreset = GETparameter('msqrd_p');
        if (msqrdPreset !== undefined) {
            return ContextMasquerade.fromPreset(msqrdPreset);
        }
        return undefined;
    }

    /**
     * Defines the backend (currently either 'webgl1' or 'webgl2').
     */
    get backend() {
        return this._backend;
    }

    /**
     * Extensions that the context should strive to support. The support can only go as far as the extensions are
     * actually supported.
     */
    get extensionsStrive() {
        return this._extensionsStrive;
    }

    /**
     * Extensions that the context should conceal support of. This only affects supported extensions, which will
     * be reported to be not supported.
     */
    get extensionsConceal() {
        return this._extensionsConceal;
    }

    /**
     * Functions that the context should delete during construction. Since WebGL context functions cannot be deleted
     * they are undefined instead.
     */
    get functionsUndefine() {
        return this._functionsUndefine;
    }
}
