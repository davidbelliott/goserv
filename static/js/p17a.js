import * as stellated from '/static/js/stellated.js';
import * as p17a from '/static/js/songs/p17a.js';


const tracks = ["p17-a"];
const init_funcs =    [p17a.init];
const update_funcs =  [p17a.updt];

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
