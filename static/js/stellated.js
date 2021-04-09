const canvas = document.getElementById("stellated");
const video_latency = 0.07; // how much the video typically lags the audio

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ "canvas": canvas, "antialias": false });
const clock = new THREE.Clock(false);
renderer.setClearColor("lightyellow");
renderer.setPixelRatio( window.devicePixelRatio );

const geometry = new THREE.IcosahedronGeometry();
//const geometry = new THREE.OctahedronGeometry();
const orig_geom = geometry.clone();
const basic_mat = new THREE.MeshBasicMaterial( { color: "red" } );
const wireframe = new THREE.EdgesGeometry(geometry);
const orig_wireframe = wireframe.clone();
const wireframe_mat = new THREE.LineBasicMaterial( { color: "black", linewidth: 1, depthTest: false} );
const multi_mat = [basic_mat, wireframe_mat];
const poly = new THREE.Mesh(geometry, basic_mat);
poly.add(new THREE.LineSegments(wireframe, wireframe_mat));
scene.add( poly );

const cube_geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const cube_mat = new THREE.MeshBasicMaterial();
const cubes = new THREE.InstancedMesh(cube_geom, cube_mat, 4);
for (let i = 0; i < 4; i++) {
    let pos_mat = new THREE.Matrix4();
    let x = (i & 0x1) * 2 - 1;
    let y = (i & 0x2) - 1;
    pos_mat.makeTranslation(x, y, 0);
    cubes.setMatrixAt(i, pos_mat);
    cubes.setColorAt(i, new THREE.Color("black"));
}
//scene.add(cubes);

camera.position.z = 2;

var paused = true;
var last_known_song_time = 0.0;
var clock_time_when_known = 0.0;

const num_chs = 4;
const max_ampl = 32767;
var envelope = null;

var oreq = new XMLHttpRequest();
oreq.open("GET", "/static/wav/p10-a.bin", true);
oreq.responseType = "arraybuffer";
oreq.addEventListener("load", function (oevent) {
    var arraybuffer = oreq.response;
    if (arraybuffer) {
        envelope = new Int16Array(arraybuffer);
    }
} );
oreq.send();

function get_ampl(song_time, ch) {
    if (envelope != null) {
        let ch_offset = Math.floor(envelope.length * ch / num_chs);
        let val = envelope[ch_offset + Math.floor(song_time * 126)];
        if (val == 0) {
            return val;
        }
        let scaled = 0.5 * Math.log(val) / Math.log(max_ampl) +
                        0.5 * val / max_ampl;
        return scaled;
    }
    return 0;
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
    const height = canvas.clientHeight;

    // adjust displayBuffer size to match
    if (canvas.width !== width || canvas.height !== height) {
        // you must pass false here or three.js sadly fights the browser
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // update any render target sizes here
    }
}

function stellated_pause() {
    last_known_song_time = player.audio.currentTime;
    clock.stop();
    paused = true;
}

function stellated_play() {
    last_known_song_time = player.audio.currentTime;
    clock.start();
    paused = false;
}

function stellated_time_update() {
    if (!paused) {
        console.log("updating time");
        last_known_song_time = player.audio.currentTime;
        clock.start();
    }
}

function stellated_seeked() {
    last_known_song_time = player.audio.currentTime;
    clock.start();
}

const animate = function () {
    requestAnimationFrame( animate );
    if (!paused) {
        poly.rotation.x += 0.02;
        poly.rotation.y += 0.02;
        var song_time = clock.getElapsedTime() + last_known_song_time;
        var song_time_comp = Math.min(Math.max(song_time + video_latency, 0.0), player.audio.duration);
        const positions = geometry.attributes.position.array;
        const orig_positions = orig_geom.attributes.position.array;
        const orig_wireframe_positions = orig_wireframe.attributes.position.array;
        if (envelope != null) {
            let ampl = get_ampl(song_time_comp, 0);
            for (let i = 0; i < positions.length; i++) {
                positions[i] = orig_positions[i] * Math.max(ampl,0.1) * 2;
            }
            geometry.attributes.position.needsUpdate = true;
            ampl = get_ampl(song_time_comp, 2);
            const positions2 = wireframe.attributes.position.array;
            for (let i = 0; i < positions2.length; i++) {
                positions2[i] = orig_wireframe_positions[i] * Math.max(ampl,0.1) * 2;
            }
            wireframe.attributes.position.needsUpdate = true;

            ampl = get_ampl(song_time_comp, 1) * 1.5;
            cubes.scale.set(ampl, ampl, ampl);
            cubes.rotation.z -= ampl * 0.1;
        }
    } else {
        poly.rotation.x += 0.005;
        poly.rotation.y += 0.005;
        cubes.rotation.z -= 0.005;
    }

    resizeCanvasToDisplaySize();
    renderer.render( scene, camera );
};

if (webgl_available()) {
    animate();
}
