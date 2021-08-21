var scenes = null;
var cur_scene_idx = 0;
//const camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );
const camera = new THREE.OrthographicCamera( 7, -7, 7, -7, -7, 1000);

var canvas = null;
var renderer = null;
const clock = new THREE.Clock(false);

var mesh = null;
var cube_started = false;

// audio
var audioCtx = null;
var oscs = null;
var audio_src_vecs = null;
var pans = null;
var gain = null;

var n_dimensions = null;

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

const demo = {
    cubes: [new BoxDef([0, 1, 0], [3, 2, 1]),                   // torso
            new BoxDef([-0.75, -1, 0], [0.5, 1.5, 1.0]),        // legs
            new BoxDef([0.75, -1, 0], [0.5, 1.5, 1.0]),
            new BoxDef([0, 2.75, 0], [2.0, 1.0, 2.0]),          // head
            new BoxDef([-1.25, 1.5, 2.75], [0.5, 1, 1]),             // hands
            new BoxDef([1.25, 1.5, 2.75], [0.5, 1, 1]),
            new BoxDef([-0.75, -2, 0], [1.5, 0.5, 2.0]),     // feet
            new BoxDef([0.75, -2, 0], [1.5, 0.5, 2.0]),
            new BoxDef([-1.75, 1.5, 1.75], [0.5, 0.5, 2.0]),         // arms
            new BoxDef([1.75, 1.5, 1.75], [0.5, 0.5, 2.0]),
            new BoxDef([0, 2.75, 0.875], [1.5, 0.25, 0.25]),    // eyes
    ],
    lines: [//new LineDef([[-0.75, 3.25, 1], [0.75, 2.50, 1]]),
            //new LineDef([[-0.75, 2.50, 1], [0.75, 3.25, 1]]),
            /*new LineDef([[-0.70, 3.50, 1], [-0.20, 3.00, 1]]),
            new LineDef([[-0.70, 3.00, 1], [-0.20, 3.50, 1]]),
            new LineDef([[0.70, 3.50, 1], [0.20, 3.00, 1]]),
            new LineDef([[0.70, 3.00, 1], [0.20, 3.50, 1]]),*/
    ],
    cubes_group: null,
    all_group: null,
}

function init_demo(scene, camera) {
    demo.cubes_group = new THREE.Group();
    demo.all_group = new THREE.Group();
    for (const i in demo.cubes) {
        let mesh = demo.cubes[i].create();
        demo.cubes_group.add(mesh);
    }
    for (const i in demo.lines) {
        let line = demo.lines[i].create();
        demo.cubes_group.add(line);
    }
    const curve = new THREE.EllipseCurve(
        0, 0,
        0.75, 0.5,
        0, Math.PI,
        true,
        0
    );
    const points = curve.getPoints( 8 );
    const geometry = new THREE.BufferGeometry().setFromPoints( points );

    const material = new THREE.LineBasicMaterial( { color : "yellow" } );

    // Create the final object to add to the scene
    const ellipse = new THREE.Line( geometry, material );
    ellipse.position.set(0, 3.0, 1);
    //demo.cubes_group.add(ellipse);


    /*let geometry = new THREE.ConeGeometry(0.5, 0.25, 4, 1, false, Math.PI / 8);
    let wireframe = new THREE.EdgesGeometry(geometry);
    const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1 } );
    let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    mesh.position.set(0, 2.825, 0.125);
    mesh.scale.set(2, 1, 1);
    demo.cubes_group.add(mesh);*/

    /*for (const i in demo.snare_pyramids_base_x) {
        let geometry = new THREE.ConeGeometry(1, 0.5, 4);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
        mesh.position.set(demo.snare_pyramids_base_x[i] + 2 * i - 1, 0, 0);
        mesh.rotation.set(0, 0, Math.PI / 2 * (i * -2 + 1));
        demo.snare_pyramids.push(mesh);
        demo.cubes_group.add(mesh);
    }
    {
        let dim = demo.kick_cubes_base_y[1] - demo.kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(2, dim, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        demo.kick_rect_prism = new THREE.LineSegments(wireframe, wireframe_mat);
        demo.cubes_group.add(demo.kick_rect_prism);
    }
    {
        let dim = demo.kick_cubes_base_y[1] - demo.kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(dim, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        big_snare_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        demo.cubes_group.add(big_snare_cube);
    }
    {
        let geometry = new THREE.BoxGeometry(2, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth} );
        center_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        demo.cubes_group.add(center_cube);
    }
    {
        let geometry = new THREE.IcosahedronGeometry();
        const basic_mat = new THREE.MeshBasicMaterial( { color: "red", depthFunc: THREE.LessEqualDepth } );
        let wireframe = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5));
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        demo.icos = new THREE.Mesh(geometry, basic_mat);
        demo.icos.add(new THREE.LineSegments(wireframe, wireframe_mat));
    }
    scene.add(demo.icos);*/
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let clone = demo.cubes_group.clone();
            const spacing = 7;
            clone.position.set((i - 1) * spacing, 0, (j - 1) * spacing);
            demo.all_group.add(clone);
        }
    }
    //demo.all_group.add(demo.cubes_group);
    scene.add(demo.all_group);

    camera.position.set(0, 0, 8);
    return 5;
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

function start_demo(scene, camera) {
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

var total_elapsed = 0;
var target_rot = [0, 0];
var go_to_target = false;
var rot = [0, 0];
function update_demo(scene, camera) {
    const div = 256;
    const float_rate = 1;
    const track_rate = 2;
    const snap_mult = 64;       // must be multiple of track_rate
    /*let rot = [Math.floor(demo.all_group.rotation.x * div / Math.PI),
        Math.floor(demo.all_group.rotation.x * div / Math.PI)];*/
    if (total_elapsed % div == 0) {// && rand_int(2) == 0) {
        target_rot = [rot[0] + (rand_int(3) - 1) * snap_mult, rot[1] + (rand_int(3) - 1) * snap_mult];
        go_to_target = true;
    }
    if (go_to_target && !arr_eq(rot, target_rot)) {
        rot[0] += Math.sign(target_rot[0] - rot[0]);
        rot[1] += Math.sign(target_rot[1] - rot[1]);
    } else {
        rot[0] += float_rate;
        rot[1] += float_rate;
        go_to_target = false;
    }
    demo.all_group.rotation.x = rot[0] * Math.PI / div;
    demo.all_group.rotation.y = rot[1] * Math.PI / div;
    total_elapsed += 1;
}

scene_names = ['cube', 'demo'];
init_funcs = [init_cube_projection, init_demo];
start_funcs = [start_cube_projection, start_demo];
update_funcs = [update_cube_projection, update_demo];

function init() {
    var canvas_placeholder = document.getElementById("stellated-loading");
    canvas = document.createElement('canvas', id='stellated');
    canvas_placeholder.parentNode.replaceChild(canvas, canvas_placeholder);
    renderer = new THREE.WebGLRenderer({ "canvas": canvas, "antialias": false });
    renderer.setClearColor("black");
    renderer.setPixelRatio( window.devicePixelRatio );
    scenes = Array(init_funcs.length).fill(null);
    for (var i = 0; i < scenes.length; i++) {
        scenes[i] = new THREE.Scene();
        init_funcs[i](scenes[i], camera);
    }
    cur_scene_idx = 0;
}

function webgl_available() {
    try {
        var canvas = document.createElement( 'canvas' );
        return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
    } catch ( e ) {
        return false;
    }
}

function resizeCanvasToDisplaySize() {
    const canvas = renderer.domElement;
    // look up the size the canvas is being displayed
    const width = canvas.clientWidth;
    const height = width;//canvas.clientHeight;

    // adjust displayBuffer size to match
    if (canvas.width !== width || canvas.height !== height) {
        // you must pass false here or three.js sadly fights the browser
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // update any render target sizes here
    }
}

function start_scene(scene_name) {
    cur_scene_idx = scene_names.indexOf(scene_name);
    start_funcs[cur_scene_idx](scenes[cur_scene_idx], camera);
    clock.start();
}

const animate = function () {
    requestAnimationFrame( animate );
    resizeCanvasToDisplaySize();
    update_funcs[cur_scene_idx](scenes[cur_scene_idx], camera);
    renderer.render(scenes[cur_scene_idx], camera);
};

init();

if (webgl_available()) {
    animate();
}
