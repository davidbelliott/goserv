import * as THREE from '/static/js/three.js/build/three.module.min.js';

export const MAX_AMPL = 32767;
const VIDEO_LATENCY = 0.07; // how much the video typically lags the audio
const BIN_RES = 126;

var scenes = null;
var camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );

var canvas = null;
export var renderer = null;
const clock = new THREE.Clock(false);

var paused = true;
var last_known_song_time = 0.0;
var num_chs = null;

var envelopes = null;
var song_time = 0;

var last_visualized_song_idx = 0;

class LoadEnvelopeCallback {
    index;
    oreq;
    bigbit;
    constructor(oreq, index, bigbit=false) {
        this.oreq = oreq;
        this.index = index;
        this.bigbit = bigbit;
    }
    handleEvent(oevent) {
        console.log("receive envelope");
        console.log(this.index);
        var arraybuffer = this.oreq.response;
        if (arraybuffer) {
            if (this.bigbit) {
                envelopes[this.index] = new BigUint64Array(arraybuffer);
            } else {
                envelopes[this.index] = new Int16Array(arraybuffer);
            }
        }
    }
}

export function set_cam(cam) {
    camera = cam;
}

export function get_cam() {
    return camera;
}

export function init(tracks, init_funcs) {
    load_envelopes(tracks);
    var canvas_placeholder = document.getElementById("stellated-loading");
    canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'stellated');
    canvas_placeholder.parentNode.replaceChild(canvas, canvas_placeholder);
    renderer = new THREE.WebGLRenderer({ "canvas": canvas, "antialias": false });
    renderer.setClearColor("black");
    renderer.setPixelRatio( window.devicePixelRatio );
    scenes = Array(tracks.length).fill(null);
    num_chs = Array(tracks.length).fill(0);
    for (var i = 0; i < tracks.length; i++) {
        scenes[i] = new THREE.Scene();
        if (init_funcs[i] != null) {
            num_chs[i] = init_funcs[i](scenes[i], camera);
        }
    }
}

function load_envelopes(tracks) {
    envelopes = Array(tracks.length + 1).fill(null);
    for (var i = 0; i < tracks.length; i++) {
        var oreq = new XMLHttpRequest();
        oreq.open("GET", "/static/wav/" + tracks[i] + ".bin");
        oreq.responseType = "arraybuffer";
        oreq.addEventListener("load", new LoadEnvelopeCallback(oreq, i));
        oreq.send();
    }
    var oreq = new XMLHttpRequest();
    oreq.open("GET", "/static/wav/freq.bin");
    oreq.responseType = "arraybuffer";
    oreq.addEventListener("load", new LoadEnvelopeCallback(oreq, tracks.length, true));
    oreq.send();
}

export function get_freqs(song_time) {
    if (envelopes == null) {
        return [];
    }
    var envelope = envelopes[envelopes.length - 1];
    if (envelope == null) {
        return [];
    }
    let duration = all_players[now_playing_idx].audio.duration;
    let idx = Math.floor(song_time / duration * envelope.length);
    let val = envelope[idx];
    var occupied_freqs = [];
    for (let i = 0, bitmask = 1n; i < 64; i++) {
        if (val & bitmask) {
            occupied_freqs.push(i)
        }
        bitmask = bitmask << 1n;
    }
    return occupied_freqs;
}

function get_ampl(song_time, ch) {
    if (envelopes == null) {
        return 0;
    }
    var envelope = envelopes[now_playing_idx];
    if (envelope == null) {
        return 0;
    }
    let ch_offset = Math.floor(envelope.length * ch / num_chs[now_playing_idx]);
    let val = envelope[ch_offset + Math.floor(song_time * BIN_RES)];
    return val / MAX_AMPL;
    /*if (val == 0) {
        return val;
    }*/
    //let scaled = 0.5 * Math.log(val) / Math.log(MAX_AMPL) +
                    //0.5 * val / MAX_AMPL;
    return scaled;
}

export function webgl_available() {
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

export function pause() {
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.stop();
    paused = true;
}

export function play() {
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.start();
    paused = false;
}

export function time_update() {
    if (!paused) {
        last_known_song_time = all_players[now_playing_idx].audio.currentTime;
        clock.start();
    }
    console.log("time update")
}

export function seeked() {
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.start();
}

export function frame(update_funcs, composer) {
    let elapsed = clock.getElapsedTime();
    if (!paused) {
        var song_time_raw = elapsed + last_known_song_time;
        song_time = Math.min(Math.max(song_time_raw + VIDEO_LATENCY, 0.0), all_players[now_playing_idx].audio.duration);
    }

    resizeCanvasToDisplaySize();
    if (num_chs[now_playing_idx] != 0) {
        var ch_amps = Array(num_chs[now_playing_idx]).fill(0);
        for (var i = 0; i < num_chs[now_playing_idx]; i++) {
            ch_amps[i] = get_ampl(song_time, i);
        }
        update_funcs[now_playing_idx](paused, song_time, ch_amps);
        last_visualized_song_idx = now_playing_idx;
    } else {
        update_funcs[last_visualized_song_idx](true, 0.0, Array(num_chs[0]).fill(0));
    }
    renderer.render(scenes[last_visualized_song_idx], camera);
}
