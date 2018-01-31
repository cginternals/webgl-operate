
import { assert, log_if, LogLevel } from './common';

import { Context } from './context';
import { AbstractObject } from './object';


/**
 * WebGL shader wrapper encapsulating shader creation, compilation, and deletion. A shader can be attached to multiple
 * Programs for linking, and can be deleted if detached from all (linked) programs.
 * ```
 * @todo Add example for shader usage.
 * ```
 */
export class Shader extends AbstractObject<WebGLShader> {

    /**
     * Either GL_VERTEX_SHADER or GL_FRAGMENT_SHADER.
     */
    protected _type: GLenum;

    /**
     * Object constructor, requires a context and a valid identifier.
     * @param context - Valid context to create the object for.
     * @param identifier - Meaningful name for identification of this instance.
     * @param type - Either GL_VERTEX_SHADER or GL_FRAGMENT_SHADER.
     */
    constructor(context: Context, type: GLenum, identifier?: string) {
        super(context, identifier);
        this._type = type;
    }

    /**
     * @override
     * Creates a shader, sets the shader source, and compiles the shader. If the shader source cannot be compiled, the
     * identifier and an info log are logged to console and the shader object is deleted.
     * @param source - Shader source.
     * @returns - Either a new shader or undefined if compilation failed.
     */
    protected create(source: string): WebGLShader | undefined {
        const gl = this._context.gl;
        const object = gl.createShader(this._type);
        assert(object && object instanceof WebGLShader, `expected WebGLShader object to be created`);

        gl.shaderSource(object, source);
        gl.compileShader(object);

        if (!gl.getShaderParameter(object, gl.COMPILE_STATUS)) {
            const infoLog: string = gl.getShaderInfoLog(object);
            log_if(true, LogLevel.Dev, `compilation of WebGLShader '${this._identifier}' failed: ${infoLog}`);

            gl.deleteShader(object);
            return undefined;
        }
        return object;
    }

    /**
     * Delete the shader object. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        this._context.gl.deleteShader(this._object);
    }

}
