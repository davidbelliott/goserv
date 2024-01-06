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

export class DrumboxScene extends VisScene {
    constructor(env) {
        super(env);
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        this.frustum_size = 50;
        this.cam_orth = new THREE.OrthographicCamera(
            -this.frustum_size / 2,
            this.frustum_size / 2,
            this.frustum_size / 2,
            -this.frustum_size / 2, -1000, 1000);
        this.camera = this.cam_orth;

        this.clock = new THREE.Clock();
        this.base_group = new THREE.Group();
        this.drums_group = new THREE.Group();
        this.paddle_group = new THREE.Group();
        this.drums_group.add(this.paddle_group);
        this.base_group.add(this.drums_group);
        this.drums = [];
        this.initialized = false;

        //const cube = create_instanced_cube([1, 1, 1], "white");
        //this.base_group.add(cube);
        const loaders = {
            'stl/truncated-cuboctahedron.stl': new STLLoader(),
            'stl/drumbox-paddle-top.stl': new STLLoader(),
            'stl/drumbox-paddle-side-0.stl': new STLLoader(),
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
        const drum_color = "red";
        Promise.all([...stl_load_promises, shader_load_promise]).then((results) => {
            const geometries = results.slice(0, -1);
            const dither_pars = results[results.length - 1][0];
            const dither = results[results.length - 1][1];
            const cube_mat = new THREE.MeshLambertMaterial({
                color: drum_color,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const paddle_mat = new THREE.MeshLambertMaterial({
                color: "pink",
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            });
            const wireframe_mat = new THREE.LineBasicMaterial( { color: drum_color, linewidth: 1, transparent: true } );
            const paddle_wireframe_mat = new THREE.LineBasicMaterial( { color: "white", linewidth: 1, transparent: true } );
            const side_paddle_wireframe_mat = new THREE.LineBasicMaterial( { color: "white", linewidth: 1, transparent: true } );

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
            this.top_paddle = new THREE.Mesh(geometries[1], paddle_mat);
            this.top_paddle.add(new THREE.LineSegments(top_paddle_edges, paddle_wireframe_mat));
            this.top_paddle.scale.multiplyScalar(1 / 8);

            this.light = new THREE.PointLight("white", 400);
            this.light.position.set(0, 0, 24);
            //this.light = new THREE.PointLight("white", 400);
            //this.light.position.set(0, 0, 20);
            this.top_paddle.add(this.light);
            this.paddle_group.add(this.top_paddle);

            // Side paddles
            this.side_paddles = [];
            let side_paddle_edges = new THREE.EdgesGeometry(geometries[2], 30);
            const side_paddle = new THREE.Mesh(geometries[2], paddle_mat);
            side_paddle.add(new THREE.LineSegments(side_paddle_edges, side_paddle_wireframe_mat));
            side_paddle.scale.multiplyScalar(1 / 8);
            for (let i = 0; i < 4; i++) {
                const this_side_paddle = side_paddle.clone();
                const offset = new THREE.Vector3(1/2, 1/2, 1/2);
                offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), i * Math.PI / 2);
                offset.multiplyScalar(4);
                this_side_paddle.rotation.z = i * Math.PI / 2;
                this_side_paddle.position.add(offset);
                this.side_paddles.push(this_side_paddle);
                this.paddle_group.add(this_side_paddle);
            }

            for (let i = 0; i < this.num_per_side; i++) {
                this.drums.push([]);
                for (let j = 0; j < this.num_per_side; j++) {
                    const c = cube.clone();
                    const pos = this.drum_pos_in_array(i, j);
                    c.position.copy(pos);
                    this.drums[i].push(c);
                    this.drums_group.add(c);
                }
            }
            this.initialized = true;
        });

        this.drums_group.rotation.z = Math.PI / 4 ;
        this.camera.rotation.x = Math.PI / 4;


        this.scene = new THREE.Scene();
        this.scene.add(this.base_group);


        //this.light2 = new THREE.AmbientLight("white", 0.10);
        //this.base_group.add(this.light2);
        this.directional_light = new THREE.DirectionalLight("white", 0.2);
        this.directional_light.position.set(0, 0, 100);
        //this.base_group.add(this.directional_light);

        this.top_paddle_pound_time = 0.08;
        this.side_paddle_pound_time = 0.15;
        this.impacts = [];

        this.drift_vel = 3.0;
        this.cur_drum_idx = [Math.floor(this.num_per_side / 2),
            Math.floor(this.num_per_side / 2)];
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
    side_paddle_pos(t_till_impact, drum_pos) {
        const t = t_till_impact;
        return 4 * (1 - (Math.abs(clamp(t, -1, 1)) - 1) ** 2);
    }

    drum_pos(t) {
        t = Math.min(0, t);
        return 4 * 2 * Math.sin(Math.PI * t / 2) / (Math.PI * (1 - t / 2));
    }

    drum_pos_in_array(i, j) {
        return new THREE.Vector3(
            this.spacing * (i - this.num_per_side / 2),
            this.spacing * (j - this.num_per_side / 2),
            0);
    }

    anim_frame(dt) {
        if (!this.initialized) {
            return;
        }
        //this.base_group.rotation.z += 0.001;
        let top_paddle_pos = this.paddle_pos(1, 0);
        let side_paddle_pos = this.side_paddle_pos(1, 0);
        let drum_pos = 0;
        while (this.impacts.length > 0 &&
                this.impacts[0][0] < -16 * this.top_paddle_pound_time) {
            this.impacts.shift();
        }

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
            } else if (this.impacts[i][1] == 2) {
                side_paddle_pos = Math.min(side_paddle_pos, this.side_paddle_pos(
                    this.impacts[i][0] / this.side_paddle_pound_time, drum_pos));
            }
        }
        for (const row of this.drums) {
            for (const drum of row) {
                drum.rotation.z += 0.01;
            }
        }

        // Apply offsets to objects
        this.drums[this.cur_drum_idx[0]][this.cur_drum_idx[1]].position.z = drum_pos;
        this.paddle_group.rotation.z = this.drums[this.cur_drum_idx[0]][this.cur_drum_idx[1]].rotation.z;
        this.top_paddle.position.z = top_paddle_pos;
        for (let i = 0; i < 4; i++) {
            const offset = new THREE.Vector3(1/2, 1/2, 1/2);
            offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), i * Math.PI / 2);
            offset.multiplyScalar(side_paddle_pos);
            this.side_paddles[i].position.copy(offset);
        }

        this.drums_group.position.y += this.drift_vel * dt;
        const max_offset = this.spacing * Math.sqrt(2);
        while (this.drums_group.position.y > max_offset) {
            this.drums_group.position.y -= max_offset;
            this.cur_drum_idx[0] = (this.cur_drum_idx[0] + 1) % this.num_per_side;
            this.cur_drum_idx[1] = (this.cur_drum_idx[1] + 1) % this.num_per_side;
        }
        this.paddle_group.position.copy(this.drum_pos_in_array(
            this.cur_drum_idx[0], this.cur_drum_idx[1]));
    }

    handle_beat(t, channel) {
        const time_till_impact = 60 / this.env.bpm / 2 - this.env.total_latency;
        console.log(time_till_impact);
        this.impacts.push([time_till_impact, channel]);
    }

    handle_sync(t, bpm, beat) {
        if (beat % 4 == 0) {
            this.cur_drum_idx[0] = Math.floor(Math.random() * 4 - 2 + this.num_per_side / 2);
            this.cur_drum_idx[1] = Math.floor(Math.random() * 4 - 2 + this.num_per_side / 2);
        }
    }
}
