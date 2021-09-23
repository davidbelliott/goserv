import * as THREE from '/static/js/three.js/build/three.module.js';
import { Tartan, NUM_BYTES } from '/static/js/tartan.js';

let crypto_obj = window.crypto || window.msCrypto;
let tx_bytes = new Uint8Array(NUM_BYTES);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1000);
let renderer = null;
let tartan = null;

function init() {
    tx_bytes = crypto_obj.getRandomValues(tx_bytes);
    if (tartan != null) {
        tartan.destroy();
    }
    tartan = new Tartan(scene, tx_bytes);
    var canvas_placeholder = document.getElementById("tartan-loading");
    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'tartan');
    canvas_placeholder.parentNode.replaceChild(canvas, canvas_placeholder);
    renderer = new THREE.WebGLRenderer({ "canvas": canvas, "antialias": false });
    renderer.setClearColor("black");
    renderer.setPixelRatio( window.devicePixelRatio );
}

function webgl_available() {
    try {
        var canvas = document.createElement( 'canvas' );
        return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) );
    } catch ( e ) {
        return false;
    }
}

function resize_canvas_to_display() {
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

function animate() {
    resize_canvas_to_display();
    renderer.render(scene, camera);
    window.requestAnimationFrame(animate);
}

if (webgl_available()) {
    init();
    animate();
}
