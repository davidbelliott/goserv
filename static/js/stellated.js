const max_ampl = 32767;
const canvas = document.getElementById("stellated");
const video_latency = 0.07; // how much the video typically lags the audio

var scenes = null;
const camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );

var renderer = null;
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
    constructor(oreq, index) {
        this.oreq = oreq;
        this.index = index;
    }
    handleEvent(oevent) {
        var arraybuffer = this.oreq.response;
        if (arraybuffer) {
            envelopes[this.index] = new Int16Array(arraybuffer);
        }
    }
}

function init() {
    load_envelopes();
    scenes = Array(tracks.length).fill(null);
    num_chs = Array(tracks.length).fill(0);
    for (var i = 0; i < tracks.length; i++) {
        scenes[i] = new THREE.Scene();
        if (init_funcs[i] != null) {
            num_chs[i] = init_funcs[i](scenes[i], camera);
        }
    }
    renderer = new THREE.WebGLRenderer({ "canvas": canvas, "antialias": false });
    renderer.setClearColor("lightyellow");
    renderer.setPixelRatio( window.devicePixelRatio );
}

function load_envelopes() {
    envelopes = Array(tracks.length).fill(null);
    for (var i = 0; i < tracks.length; i++) {
        if (init_funcs[i] != null) {
            var oreq = new XMLHttpRequest();
            oreq.open("GET", "/static/wav/" + tracks[i] + ".bin", true);
            oreq.responseType = "arraybuffer";
            oreq.addEventListener("load", new LoadEnvelopeCallback(oreq, i));
            oreq.send();
        }
    }
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
    let val = envelope[ch_offset + Math.floor(song_time * 126)];
    if (val == 0) {
        return val;
    }
    let scaled = 0.5 * Math.log(val) / Math.log(max_ampl) +
                    0.5 * val / max_ampl;
    return scaled;
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
    const height = 0.5*width;//canvas.clientHeight;

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
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.stop();
    paused = true;
}

function stellated_play() {
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.start();
    paused = false;
}

function stellated_time_update() {
    if (!paused) {
        last_known_song_time = all_players[now_playing_idx].audio.currentTime;
        clock.start();
    }
}

function stellated_seeked() {
    last_known_song_time = all_players[now_playing_idx].audio.currentTime;
    clock.start();
}

const animate = function () {
    requestAnimationFrame( animate );
    if (!paused) {
        var song_time_raw = clock.getElapsedTime() + last_known_song_time;
        song_time = Math.min(Math.max(song_time_raw + video_latency, 0.0), all_players[now_playing_idx].audio.duration);
    }

    resizeCanvasToDisplaySize();
    if (num_chs[now_playing_idx] != 0) {
        var ch_amps = Array(num_chs[now_playing_idx]).fill(0);
        for (var i = 0; i < num_chs[now_playing_idx]; i++) {
            ch_amps[i] = get_ampl(song_time, i);
        }
        update_funcs[now_playing_idx](paused, song_time, ch_amps);
        renderer.render( scenes[now_playing_idx], camera );
        last_visualized_song_idx = now_playing_idx;
    } else {
        update_funcs[last_visualized_song_idx](true, 0.0, Array(num_chs[0]).fill(0));
        renderer.render(scenes[last_visualized_song_idx], camera);
    }
};
