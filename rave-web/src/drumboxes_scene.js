import * as THREE from 'three';
import { VisScene } from './vis_scene.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
    lerp_scalar,
    ease,
    update_persp_camera_aspect,
    update_orth_camera_aspect,
    rand_int,
    clamp,
    arr_eq,
    create_instanced_cube,
    ShaderLoader
} from './util.js';
import { InstancedGeometryCollection } from './instanced_geom.js';

class TruncatedCuboctahedron {
    constructor() {
        const C0 = 1.20710678118654752440084436210;
        const C1 = 1.91421356237309504880168872421;
        // 8 sided faces = 6
        // 6 sided faces = 8
        // 4 sided faces = 12
        this.vertex = [
            [  C0,  0.5,   C1],
            [  C0,  0.5,  -C1],
            [  C0, -0.5,   C1],
            [  C0, -0.5,  -C1],
            [ -C0,  0.5,   C1],
            [ -C0,  0.5,  -C1],
            [ -C0, -0.5,   C1],
            [ -C0, -0.5,  -C1],
            [  C1,   C0,  0.5],
            [  C1,   C0, -0.5],
            [  C1,  -C0,  0.5],
            [  C1,  -C0, -0.5],
            [ -C1,   C0,  0.5],
            [ -C1,   C0, -0.5],
            [ -C1,  -C0,  0.5],
            [ -C1,  -C0, -0.5],
            [ 0.5,   C1,   C0],
            [ 0.5,   C1,  -C0],
            [ 0.5,  -C1,   C0],
            [ 0.5,  -C1,  -C0],
            [-0.5,   C1,   C0],
            [-0.5,   C1,  -C0],
            [-0.5,  -C1,   C0],
            [-0.5,  -C1,  -C0],
            [ 0.5,   C0,   C1],
            [ 0.5,   C0,  -C1],
            [ 0.5,  -C0,   C1],
            [ 0.5,  -C0,  -C1],
            [-0.5,   C0,   C1],
            [-0.5,   C0,  -C1],
            [-0.5,  -C0,   C1],
            [-0.5,  -C0,  -C1],
            [  C1,  0.5,   C0],
            [  C1,  0.5,  -C0],
            [  C1, -0.5,   C0],
            [  C1, -0.5,  -C0],
            [ -C1,  0.5,   C0],
            [ -C1,  0.5,  -C0],
            [ -C1, -0.5,   C0],
            [ -C1, -0.5,  -C0],
            [  C0,   C1,  0.5],
            [  C0,   C1, -0.5],
            [  C0,  -C1,  0.5],
            [  C0,  -C1, -0.5],
            [ -C0,   C1,  0.5],
            [ -C0,   C1, -0.5],
            [ -C0,  -C1,  0.5],
            [ -C0,  -C1, -0.5]];

        this.face = [
            [  2 , 26, 30,  6,  4, 28, 24,  0],
            [ 25 , 29,  5,  7, 31, 27,  3,  1],
            [  9 , 33, 35, 11, 10, 34, 32,  8],
            [ 36 , 38, 14, 15, 39, 37, 13, 12],
            [ 20 , 44, 45, 21, 17, 41, 40, 16],
            [ 42 , 43, 19, 23, 47, 46, 22, 18],
            [ 24 , 16, 40,  8, 32,  0],
            [ 33 ,  9, 41, 17, 25,  1],
            [ 34 , 10, 42, 18, 26,  2],
            [ 27 , 19, 43, 11, 35,  3],
            [ 36 , 12, 44, 20, 28,  4],
            [ 29 , 21, 45, 13, 37,  5],
            [ 30 , 22, 46, 14, 38,  6],
            [ 39 , 15, 47, 23, 31,  7],
            [ 32 , 34,  2,  0],
            [  3 , 35, 33,  1],
            [  6 , 38, 36,  4],
            [ 37 , 39,  7,  5],
            [ 40 , 41,  9,  8],
            [ 11 , 43, 42, 10],
            [ 13 , 45, 44, 12],
            [ 46 , 47, 15, 14],
            [ 24 , 28, 20, 16],
            [ 21 , 29, 25, 17],
            [ 22 , 30, 26, 18],
            [ 27 , 31, 23, 19]];

        this.edge = this._get_edges(this.face);
    }

    _get_edges(faces) {
        var edges = new Set();
        for (var i = 0; i < faces.length; i++) {
            var face = faces[i];
            for (var j = 0; j < face.length; j++) {
                var edge = [face[j], face[(j + 1) % face.length]];
                if (edge[0] > edge[1]) {
                    edge = [edge[1], edge[0]];
                } else if (edge[0] > edge[1]) {
                    edge = [edge[0], edge[1]];
                }
                edges.add(edge);
            }
        }
        return Array.from(edges);
    }
}

function polyhedron_from_data(data)
{
    // convert vertex data to THREE.js vectors
    var vertex = []
    for (var i = 0; i < data.vertex.length; i++) {
        vertex.push( new THREE.Vector3( data.vertex[i][0], data.vertex[i][1], data.vertex[i][2] ).multiplyScalar(1) );
    }

    var segment_vertices = new Float32Array(6 * data.edge.length);
    for (var i = 0; i < data.edge.length; i++)
    {
        var index0 = data.edge[i][0];
        var index1 = data.edge[i][1];
        vertex[index0].toArray(segment_vertices, 6 * i);
        vertex[index1].toArray(segment_vertices, 6 * i + 3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(segment_vertices, 3));

    const mat = new THREE.LineBasicMaterial({color: "white"});
    const lines = new THREE.LineSegments(geom, mat);
    return lines;
}

export class DrumboxScene extends VisScene {
    constructor(env) {
        super(env);
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        this.frustum_size = 40;
        this.cam_orth = new THREE.OrthographicCamera(
            -this.frustum_size / 2,
            this.frustum_size / 2,
            this.frustum_size / 2,
            -this.frustum_size / 2, -1000, 1000);
        this.camera = this.cam_orth;

        this.clock = new THREE.Clock();
        this.base_group = new THREE.Group();
        this.paddle_group = new THREE.Group();
        this.base_group.add(this.paddle_group);
        this.drums = [];

        //const cuboct = polyhedron_from_data(new TruncatedCuboctahedron());
        //cuboct.scale.multiplyScalar(4);
        //this.base_group.add(cuboct);

        //const cube = create_instanced_cube([1, 1, 1], "white");
        //this.base_group.add(cube);
        const loaders = {
            'stl/truncated-cuboctahedron.stl': new STLLoader(),
            'stl/drumbox-paddle-top.stl': new STLLoader(),
        };
        const stl_load_promises = [];
        for (const [key, loader] of Object.entries(loaders)) {
            stl_load_promises.push(loader.loadAsync(key));
        }

        this.shader_loader = new ShaderLoader('glsl/chunks/dither_pars.frag',
            'glsl/chunks/dither.frag');
        const shader_load_promise = this.shader_loader.load();
        this.spacing = 16;
        this.num_per_side = 8;
        Promise.all([...stl_load_promises, shader_load_promise]).then((results) => {
            const geometries = results.slice(0, -1);
            const dither_pars = results[results.length - 1][0];
            const dither = results[results.length - 1][1];
            const cube_mat = new THREE.MeshLambertMaterial({
                color: "red",
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const paddle_mat = new THREE.MeshLambertMaterial({
                color: "white",
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const wireframe_mat = new THREE.LineBasicMaterial( { color: "red", linewidth: 1, transparent: true } );
            const paddle_wireframe_mat = new THREE.LineBasicMaterial( { color: "white", linewidth: 1, transparent: true } );

            for (const mat of [cube_mat, paddle_mat]) {
                mat.onBeforeCompile = (shader) => {
                    shader.fragmentShader =
                        shader.fragmentShader.replace(
                            '#include <dithering_pars_fragment>',
                            dither_pars
                        ).replace(
                            '#include <dithering_fragment>',
                            dither
                        );
                };
            }
            console.log("Loading finished cuboct");


            // Main polyhedron
            let edges = new THREE.EdgesGeometry(geometries[0], 30);
            const cube = new THREE.Mesh(geometries[0], cube_mat);
            cube.add(new THREE.LineSegments(edges, wireframe_mat));
            cube.scale.multiplyScalar(1 / 8);
            // Top paddle
            let top_paddle_edges = new THREE.EdgesGeometry(geometries[1], 30);
            const top_paddle = new THREE.Mesh(geometries[1], paddle_mat);
            top_paddle.add(new THREE.LineSegments(top_paddle_edges, paddle_wireframe_mat));
            top_paddle.scale.multiplyScalar(1 / 8);
            this.paddle_group.add(top_paddle);

            for (let i = 0; i < this.num_per_side; i++) {
                for (let j = 0; j < this.num_per_side; j++) {
                    const c = cube.clone();
                    c.position.set(
                        this.spacing * (i - this.num_per_side / 2),
                        this.spacing * (j - this.num_per_side / 2),
                        0);
                    this.drums.push(c);
                    this.base_group.add(c);
                }
            }
        });

        this.base_group.rotation.x = -Math.PI / 4 ;
        this.base_group.rotation.z = Math.PI / 4;


        this.scene = new THREE.Scene();
        this.scene.add(this.base_group);

        this.light = new THREE.DirectionalLight("white", 0.75);
        this.light.position.set(0, 0, 100);
        //this.light = new THREE.PointLight("white", 400);
        //this.light.position.set(0, 0, 20);
        this.base_group.add(this.light);

        this.top_paddle_pound_time = 0.08;
        this.impacts = [];
    }

    get_palette_color(t) {
        const a = [0.5, 0.5, 0.5];
        const b = [0.5, 0.5, 0.5];
        const c = [2.0, 1.0, 0.0];
        const d = [0.5, 0.2, 0.25];

        const out = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            out[i] = a[i] + b[i] * Math.cos(2 * Math.PI * ( c[i] * t + d[i] ) );
        }
        console.log(out);
        return new THREE.Color(...out);
    }

    paddle_pos(t_till_impact, drum_pos) {
        const t = t_till_impact;
        if (t < 0 && t > -1) {
            return 4 * (t + 0.5) ** 2 - 1;
        } else {
            return 4 * Math.max(0, Math.abs(t + 0.5) - 0.5);
        }
    }

    drum_pos(t) {
        t = Math.min(0, t);
        return 4 * 2 * Math.sin(Math.PI * t / 2) / (Math.PI * (1 - t / 2));
    }

    anim_frame(dt) {
        //this.base_group.rotation.z += 0.001;
        let top_paddle_pos = this.paddle_pos(1, 0);
        let drum_pos = 0;
        while (this.impacts.length > 0 &&
                this.impacts[0][0] < -16 * this.top_paddle_pound_time) {
            this.impacts.shift();
        }
        console.log(this.impacts.length);
        for (let i = 0; i < this.impacts.length; i++) {
            this.impacts[i][0] -= dt;
            if (this.impacts[i][1] == 1) {
                drum_pos += this.drum_pos(
                    this.impacts[i][0] / this.top_paddle_pound_time);
            }
        }
        for (let i = 0; i < this.impacts.length; i++) {
            if (this.impacts[i][1] == 1) {
                top_paddle_pos = Math.min(top_paddle_pos, this.paddle_pos(
                    this.impacts[i][0] / this.top_paddle_pound_time, drum_pos));
            }
        }
        for (const d of this.drums) {
            d.rotation.z += 0.01;
        }
        this.paddle_group.position.z = top_paddle_pos;
        if (this.drums.length > 36) {
            this.drums[36].position.z = drum_pos;
            this.paddle_group.rotation.z = this.drums[36].rotation.z;
        }
    }

    handle_beat(t, channel) {
        const time_till_impact = 60 / this.env.bpm / 2 - this.env.total_latency;
        console.log(time_till_impact);
        this.impacts.push([time_till_impact, channel]);
    }
}
