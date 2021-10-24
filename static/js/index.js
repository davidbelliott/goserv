import * as stellated from '/static/js/stellated.js';
import * as p13a from '/static/js/songs/p13a.js';

const tracks = ["p13-a"];
const init_funcs =    [p13a.init];
const update_funcs =  [p13a.updt];

const player = populate_tracks(tracks, false)[0];

player.on("pause", stellated.pause);
player.on("play", stellated.play);
player.on("playing", stellated.play);
player.on("seeked", stellated.seeked);
player.on("waiting", stellated.pause);
player.on("timeupdate", stellated.time_update);

stellated.init(tracks, init_funcs);

function animate() {
    stellated.frame(update_funcs);
    window.requestAnimationFrame(animate);
}

if (stellated.webgl_available()) {
    animate();
}
