

/**
 * Bindable interface that demands bind and unbind implementations.
 */
export interface Bindable {

    /**
     * Should bind the object.
     */
    bind(target?: GLenum): void;

    /**
     * Should bind the default object.
     */
    unbind(target?: GLenum): void;

}
