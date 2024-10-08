
import { mat4 } from 'gl-matrix';
import { auxiliaries } from '../auxiliaries';
import assert = auxiliaries.assert;
import { tuples } from '../tuples';

import { Camera } from '../camera';
import { ChangeLookup } from '../changelookup';
import { Context } from '../context';
import { Framebuffer } from '../framebuffer';
import { Geometry } from '../geometry';
import { Initializable } from '../initializable';
import { Program } from '../program';
import { GeometryComponent } from './geometrycomponent';
import { Material } from './material';
import { SceneNode } from './scenenode';
import { SceneRenderPass } from './scenerenderpass';
import { TransformComponent } from './transformcomponent';


/**
 * This class renders a SceneNode hierarchy. It uses one single program for rendering the whole scene.
 * If different programs are necessary to render a scene, multiple SceneNodes should be used for each
 * program that is used.
 * This renderpass calls callbacks such as `updateModelTransform`, which have to be set by the renderer
 * using this renderpass.
 */
export class ForwardSceneRenderPass extends SceneRenderPass {

    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        camera: false,
    });

    /** @see {@link target} */
    protected _target: Framebuffer;

    /** @see {@link camera} */
    protected _camera: Camera;

    /** @see {@link ndcOffset} */
    protected _ndcOffset: tuples.GLfloat2;

    /** @see {@link clearColor} */
    protected _clearColor: tuples.GLclampf4;

    /** @see {@link program} */
    protected _program: Program;

    /**
     * These maps are used to map from a material to all geometries using this material.
     * Alongside the geometry a transform is saved, that is generated during a preprocessing traverse.
     */
    protected _opaqueGeometryMap: Map<Material, Array<[Geometry, mat4]>>;
    protected _transparentGeometryMap: Map<Material, Array<[Geometry, mat4]>>;

    updateModelTransform: (matrix: mat4) => void;
    updateViewProjectionTransform: (matrix: mat4) => void;
    bindMaterial: (material: Material) => void;
    bindGeometry: (geometry: Geometry) => void;
    bindUniforms: () => void;

    /**
     * Creates a pass that renders a SceneNode and all of its children.
     * @param context - @todo The WebGL context for rendering the scene.
     */
    constructor(context: Context) {
        super();
        this._context = context;

        this._opaqueGeometryMap = new Map();
        this._transparentGeometryMap = new Map();
    }

    /**
     * Sort all geometries by their material and save their transform given by a scene traversal.
     * With this information, rendering can be sped up later on by avoiding material changes
     * during rendering of the scene.
     */
    protected preprocessScene(): void {
        assert(this._scene !== undefined, 'Scene was undefined during preprocessing.');

        if (this._scene === undefined) {
            return;
        }

        this._opaqueGeometryMap.clear();
        this._transparentGeometryMap.clear();

        this.preprocessNode(this._scene!, mat4.create());
    }

    /**
     * Handle a single node during preprocessing. Each GeometryComponent of the node will be added
     * to the preprocessing maps.
     * Afterwards all children of the node will also be processed recursively.
     */
    protected preprocessNode(node: SceneNode, transform: mat4): void {
        const nodeTransform = mat4.clone(transform);

        const transformComponents = node.componentsOfType('TransformComponent');
        assert(transformComponents.length <= 1, `SceneNode can not have more than one transform component`);

        if (transformComponents.length === 1) {
            const transformComponent = transformComponents[0] as TransformComponent;
            mat4.mul(nodeTransform, nodeTransform, transformComponent.transform);
        }

        const geometryComponents = node.componentsOfType('GeometryComponent');

        for (const geometryComponent of geometryComponents) {
            const currentComponent = geometryComponent as GeometryComponent;
            const material = currentComponent.material;
            const geometry = currentComponent.geometry;

            if (material.isTransparent) {
                let map = this._transparentGeometryMap.get(material);
                if (map === undefined) {
                    map = [];
                }

                map.push([geometry, nodeTransform]);
                this._transparentGeometryMap.set(material, map);
            } else {
                let map = this._opaqueGeometryMap.get(material);
                if (map === undefined) {
                    map = [];
                }

                map.push([geometry, nodeTransform]);
                this._opaqueGeometryMap.set(material, map);
            }
        }

        if (node.nodes === undefined) {
            return;
        }

        for (const child of node.nodes) {
            this.preprocessNode(child, nodeTransform);
        }
    }

    /**
     * Render a preprocessed map, where geometries are already sorted by material.
     * Thus, each material only needs to be bound once.
     */
    protected renderGeometryMap(map: Map<Material, Array<[Geometry, mat4]>>): void {
        for (const material of Array.from(map.keys())) {
            this.bindMaterial(material);

            const geometryTuples = map.get(material)!;
            for (const [geometry, transform] of geometryTuples) {
                geometry.bind();
                if (this.bindGeometry !== undefined) {
                    this.bindGeometry(geometry);
                }
                this.updateModelTransform(transform);

                geometry.draw();
                geometry.unbind();
            }
        }
    }

    @Initializable.initialize()
    initialize(): boolean {
        return true;
    }

    @Initializable.uninitialize()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uninitialize(): void { }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    prepare(): void { }

    /**
     * @param override - If enabled, everything will be updated, regardless of tracked alterations.
     */
    @Initializable.assert_initialized()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    update(override: boolean = false): void { }

    /**
     * Triggers rendering a frame of the given hierarchy. All nodes in the hierarchy will be visited recursively
     * and rendered. If nodes contain transformations, they are applied and used for the whole subtree.
     */
    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);
        assert(this._program && this._program.valid, `valid program expected`);

        assert(this.updateModelTransform !== undefined,
            `Model transform function needs to be initialized.`);
        assert(this.updateViewProjectionTransform !== undefined,
            `View Projection transform function needs to be initialized.`);
        assert(this.bindMaterial !== undefined,
            `Material binding function needs to be initialized.`);

        if (this._scene === undefined) {
            return;
        }

        const gl = this._context.gl;

        // gl.disable(gl.CULL_FACE);
        // gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        //const c = this._clearColor;
        //gl.clearColor(c[0], c[1], c[2], c[3]);

        //this._target.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        this._program.bind();

        if (this.bindUniforms !== undefined) {
            this.bindUniforms();
        }

        this.updateViewProjectionTransform(this._camera.viewProjection);

        this.drawCalls();

        this._program.unbind();

        // gl.cullFace(gl.BACK);
        // gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
    }

    /**
     * Encapsulates the draw calls made to webgl. This is useful if state should not be changed before rendering,
     * e.g. for shadow mapping.
     */
    @Initializable.assert_initialized()
    drawCalls(renderTransparentMaterials: boolean = true): void {
        if (this._scene === undefined) {
            return;
        }

        /**
         * Render geometries by material.
         * First render opaque materials, then transparent ones.
         */
        this.renderGeometryMap(this._opaqueGeometryMap);

        if (renderTransparentMaterials) {
            this.renderGeometryMap(this._transparentGeometryMap);
        }
    }

    /**
     * Sets the framebuffer the quads are rendered to.
     * @param target - Framebuffer to render into.
     */
    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    /**
     * The NDC offset is used for vertex displacement within subpixel space for anti-aliasing over
     * multiple intermediate frames (multi-frame sampling).
     * @param offset - Subpixel offset used for vertex displacement (multi-frame anti-aliasing).
     */
    set ndcOffset(offset: tuples.GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    /**
     * The camera's viewProjection is used for 3D label placement calculation.
     */
    set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        this._altered.alter('camera');
    }

    /**
     * Sets the clear color for rendering.
     */
    set clearColor(color: tuples.GLclampf4) {
        this._clearColor = color;
    }

    set program(program: Program) {
        this._program = program;
    }
}
