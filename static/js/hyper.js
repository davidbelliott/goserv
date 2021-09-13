import * as THREE from '/static/js/three.js/build/three.module.js';
import * as stellated from '/static/js/stellated.js';
import { GLTFLoader } from '/static/js/three.js/examples/jsm/loaders/GLTFLoader.js';

var cur_scene_idx = 0;
//const camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );
stellated.set_cam(new THREE.OrthographicCamera( 7, -7, 7, -7, -7, 1000));

//var canvas = null;
//var renderer = null;
//const clock = new THREE.Clock(false);

var mesh = null;
var cube_started = false;

// audio
var audioCtx = null;
var oscs = null;
var audio_src_vecs = null;
var pans = null;
var gain = null;

var n_dimensions = null;

const bpm = 150;

const move_clock = new THREE.Clock(false);

function playNote(osc_idx, frequency) {
    oscs[osc_idx].type = 'sine';
    oscs[osc_idx].frequency.value = frequency; // value in hertz
    oscs[osc_idx].start();
}

class BoxDef {
    constructor(coords, dims) {
        this.coords = coords;
        this.dims = dims;
    }
    create() {
        let geometry = new THREE.BoxGeometry(...this.dims);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1 } );
        let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
        mesh.position.set(...this.coords);
        return mesh;
    }
}

class LineDef {
    constructor(coords) {
        this.coords = coords;
    }
    create() {
        const line_mat = new THREE.LineBasicMaterial({color: "yellow"});
        const points = [];
        for (const i in this.coords) {
            points.push(new THREE.Vector3(...(this.coords[i])));
        }
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geom, line_mat);
        return line;
    }
}

const RobotParts = {
    TORSO: 0,
    LEGS: [1, 2],
    HEAD: 3,
    HANDS: [4, 5],
    FEET: [6, 7],
    ARMS: [8, 9],
    EYES: 10,
    MAX: 11
}

class Robot {
    constructor(parent_obj, position) {
        let cube_defs = Array(RobotParts.MAX);
        cube_defs[RobotParts.TORSO] = new BoxDef([0, 1, 0], [3, 2, 1]);
        cube_defs[RobotParts.LEGS[0]] = new BoxDef([-0.75, -1, 0],
            [0.5, 1.5, 1.0]);
        cube_defs[RobotParts.LEGS[1]] = new BoxDef([0.75, -1, 0],
            [0.5, 1.5, 1.0]);
        cube_defs[RobotParts.HEAD] = new BoxDef([0, 2.75, 0], [2.0, 1.0, 2.0]);
        cube_defs[RobotParts.HANDS[0]] = new BoxDef([-1.25, 1.5, 2.75], [0.5, 1, 1]);
        cube_defs[RobotParts.HANDS[1]] = new BoxDef([1.25, 1.5, 2.75], [0.5, 1, 1]);
        cube_defs[RobotParts.FEET[0]] = new BoxDef([-0.75, -2, 0], [1.5, 0.5, 2.0]);
        cube_defs[RobotParts.FEET[1]] = new BoxDef([0.75, -2, 0], [1.5, 0.5, 2.0]);
        cube_defs[RobotParts.ARMS[0]] = new BoxDef([-1.75, 1.5, 1.75], [0.5, 0.5, 2.0]);
        cube_defs[RobotParts.ARMS[1]] = new BoxDef([1.75, 1.5, 1.75], [0.5, 0.5, 2.0]);
        cube_defs[RobotParts.EYES] = new BoxDef([0, 2.75, 0.875], [1.5, 0.25, 0.25]);

        this.cube_defs = cube_defs;
        this.obj = new THREE.Group();
        this.meshes = Array(RobotParts.MAX);

        for (let i in cube_defs) {
            let mesh = cube_defs[i].create();
            this.obj.add(mesh);
            this.meshes[i] = mesh;
        }
        this.obj.position.copy(position);
        parent_obj.add(this.obj);
    }
}

const demo = {
    robots: [],
    all_group: null,
    robot_group: null,
    triguy_group: null,
}

function init_demo(scene, camera) {
    const robot_spacing = 7;

    demo.all_group = new THREE.Group();
    demo.robot_group = new THREE.Group();
    demo.triguy_group = new THREE.Group();

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (i == 1 && j == 1) {
                continue;
            }
            let position = new THREE.Vector3((i - 1) * robot_spacing, 0,
                (j - 1) * robot_spacing);
            demo.robots.push(new Robot(demo.robot_group, position));
        }
    }
    demo.all_group.add(demo.robot_group);
    scene.add(demo.all_group);

    let loader = new GLTFLoader();
    loader.load( 'static/obj/triguy.glb', function ( gltf ) {
        console.log(gltf.scene);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1 } );
        for (var i in gltf.scene.children) {
            let edges = new THREE.EdgesGeometry(gltf.scene.children[i].geometry, 30);
            let mesh = new THREE.LineSegments(edges, wireframe_mat);
            demo.triguy_group.add(mesh);
            demo.triguy_group.position.set(0, 4, 0);
            demo.triguy_group.scale.set(2.0, 2.0, 2.0);
            demo.triguy_group.rotation.set(Math.PI / 2.0, 0, 0);
        }
	demo.all_group.add(demo.triguy_group);
    }, undefined, function ( error ) {
            console.error( error );
    } );

    camera.position.set(0, 0, 8);
    return 4;
}

function init_cube_projection(scene, camera) {
    let wireframe = new THREE.EdgesGeometry(new THREE.BoxGeometry());
    const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1 } );
    mesh = new THREE.LineSegments(wireframe, wireframe_mat);
    scene.add(mesh);
    camera.position.set(0, 0, 1);
}

function start_cube_projection(scene, camera) {
    for (let i = 0; i < n_dimensions; i++) {
        if (oscs[i] != null) {
            oscs[i].stop();
        }
    }
    n_dimensions = 3;
    cube_started = true;
    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    gain = audioCtx.createGain();
    gain.gain.value = 0.01;
    gain.connect(audioCtx.destination);
    oscs = new Array(n_dimensions).fill(null);
    pans = new Array(n_dimensions).fill(null);
    audio_src_vecs = new Array(n_dimensions).fill(null);
    for (let i = 0; i < n_dimensions; i++) {
        audio_src_vecs[i] = new THREE.Vector4(0, 0, 0, 0);
        audio_src_vecs[i].setComponent(i, 1);
        oscs[i] = audioCtx.createOscillator();;
        pans[i] = audioCtx.createStereoPanner();
        oscs[i].connect(pans[i]);
        pans[i].connect(gain);
        pans[i].pan.value = -1.0;
    }
    mesh.rotation.set(0, 0, 0);
    camera.position.set(0, 0, 1);
    playNote(0, 500);
    playNote(1, 1000);
    playNote(2, 10000);
}

function update_cube_projection(scene, camera) {
    if (!cube_started) {
        return;
    }
    if (camera.position.z < 2.0) {
        camera.position.z += (2.0 - camera.position.z) / 60.0;
    }
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    var matrix = new THREE.Matrix4();
    matrix.extractRotation(mesh.matrix);

    let ear_vec_3 = new THREE.Vector3(1, 0, 0, 0);
    ear_vec_3.applyMatrix4(matrix);

    let ear_vec = new THREE.Vector4(ear_vec_3.x, ear_vec_3.y, ear_vec_3.z, 0);

    for (let i = 0; i < n_dimensions; i++) {
        let dot = ear_vec.dot(audio_src_vecs[i]);
        pans[i].pan.value = dot;
    }
}

function rand_int(max) {
    return Math.floor(Math.random() * max);
}

function arr_eq(a, b) {
    if (a.length != b.length) {
        return false;
    }
    for (const i in a) {
        if (a[i] != b[i]) {
            return false;
        }
    }
    return true;
}

var start_rot = [0, 0];
var target_rot = [0, 0];
var go_to_target = false;
var rot = [0, 0];       // rotation in divs
var ang_vel = [0, 0];   // angular velocity in divs per second
let song_beat_prev = 0;
function update_demo(paused, song_time, ch_amps) {
    const div = 512;    // # of divisions per pi radians
    const float_rate = 1;
    const track_rate = 2;
    const snap_mult = 64;

    const beats_per_sec = bpm / 60.0;
    const song_beat = Math.floor(song_time * beats_per_sec);

    if (song_beat != song_beat_prev && song_beat % 2 == 0) {// && rand_int(2) == 0) {
        if (go_to_target) {
            const manhattan_dist = Math.abs(target_rot[0] - rot[0]) +
                Math.abs(target_rot[1] - rot[1], );
            if (manhattan_dist <= 8) {
                go_to_target = false;
            }
        }
        if (!go_to_target) {
            for (var i = 0; i < 2; i++) {
                start_rot[i] = Math.round(rot[i] / snap_mult) * snap_mult;
            }
            let motion_idx = rand_int(8);   // -1, 0, 1 about 2 axes, but no 0, 0
            if (motion_idx > 3) {
                motion_idx += 1;            // make it 0-8 (9 options) for ease
            }
            let rot_dirs = [motion_idx % 3 - 1, Math.floor(motion_idx / 3) - 1];
            target_rot = [(Math.round(start_rot[0] / snap_mult) + rot_dirs[0]) * snap_mult,
                (Math.round(start_rot[1] / snap_mult) + rot_dirs[1]) * snap_mult];
            go_to_target = true;
            move_clock.start();
        }
    }

    if (go_to_target) {
        const num_track_beats = 2;
        let elapsed = move_clock.getElapsedTime();
        console.log(elapsed);
        for (var i = 0; i < 2; i++) {
            const full_time = 1.0 / beats_per_sec * num_track_beats;
            ang_vel = (target_rot[i] - start_rot[i]) * 1.0 / full_time;
            const sign_before = Math.sign(target_rot[i] - rot[i]);
            rot[i] = start_rot[i] + ang_vel * elapsed;
            const sign_after = Math.sign(target_rot[i] - rot[i]);
            if (sign_after != sign_before) {
                rot[i] = target_rot[i];
            }
        }
        if (arr_eq(rot, target_rot)) {
            /*for (var i = 0; i < 2; i++) {
                rot[i] = target_rot[i];
            }*/
            go_to_target = false;
        }
    }

    if (!paused) {
        for (let i in demo.robots) {
            let ch_idx = 0;
            let robot = demo.robots[i];
            for (let foot = 0; foot < 2; foot++) {
                robot.meshes[RobotParts.FEET[foot]].position.y = -2 + 0.75 * ch_amps[ch_idx++];
                robot.meshes[RobotParts.FEET[foot]].position.z = -0.5 + ch_amps[ch_idx++];
            }
        }
    }
    //demo.cubes_group.rotation.y = Math.pow((1 - Math.sin((song_time / 60.0 * 110 * 2) * Math.PI)) / 2, 2) * Math.PI / 32;
    demo.all_group.rotation.x = rot[0] * Math.PI / div;
    demo.all_group.rotation.y = rot[1] * Math.PI / div;
    //total_elapsed += 1;
    song_beat_prev = song_beat;
}

var scene_names = ['cube', 'demo'];
var init_funcs = [init_demo];
var update_funcs = [update_demo];

function animate() {
    stellated.frame(update_funcs);
    window.requestAnimationFrame(animate);
}

var tracks = ["p16-b"];
var player = populate_tracks(tracks, false)[0];

player.on("pause", stellated.pause);
player.on("play", stellated.play);
player.on("playing", stellated.play);
player.on("seeked", stellated.seeked);
player.on("waiting", stellated.pause);
player.on("timeupdate", stellated.time_update);

stellated.init(tracks, init_funcs);

if (stellated.webgl_available()) {
    animate();
}
