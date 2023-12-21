import * as stellated from '/static/js/stellated.js';
import * as p13a from '/static/js/songs/p13a.js';
import * as p10a from '/static/js/songs/p10a.js';
import * as p8b from '/static/js/songs/p8b.js';


const tracks = ["p15-b", "p13-a", "p10-a", "p8-b", "p7-c", "p6-a", "p5-a", "p4-b"];
const init_funcs =    [null, p13a.init, p10a.init, p8b.init, null, null, null, null];
const update_funcs =  [null, p13a.updt, p10a.updt, p8b.updt, null, null, null, null];

const players = populate_tracks(tracks, true);

players.forEach(player => {
    player.on("pause", stellated.pause);
    player.on("play", stellated.play);
    player.on("playing", stellated.play);
    player.on("seeked", stellated.seeked);
    player.on("waiting", stellated.pause);
    player.on("timeupdate", stellated.time_update);
});

stellated.init(tracks, init_funcs);

function animate() {
    stellated.frame(update_funcs);
    window.requestAnimationFrame(animate);
}

if (stellated.webgl_available()) {
    animate();
}
