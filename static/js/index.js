import * as stellated from '/static/js/stellated.js';
import * as p13a from '/static/js/songs/p13a.js';
/*var kick_cubes = [];
var kick_cubes_base_y = [-2.5, 2.5];
var kick_rect_prism = null;
var snare_pyramids = [];
var snare_pyramids_base_x = [-2.25, 2.25];
var snare_rect_prisms = [];
var cubes_group = null;

var icos = null;

function p13a_init(scene, camera) {
    cubes_group = new THREE.Group();
    for (const i in kick_cubes_base_y) {
        let geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        let wireframe = new THREE.EdgesGeometry(new THREE.BoxGeometry());
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1} );
        const basic_mat = new THREE.MeshBasicMaterial( { color: "purple" } );
        let mesh = new THREE.Mesh(geometry, basic_mat);
        mesh.add(new THREE.LineSegments(wireframe, wireframe_mat));
        mesh.position.set(0, kick_cubes_base_y[i], 0);
        kick_cubes.push(mesh);
        cubes_group.add(mesh);
    }
    for (const i in snare_pyramids_base_x) {
        let geometry = new THREE.ConeGeometry(1, 0.5, 4);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1} );
        let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
        mesh.position.set(snare_pyramids_base_x[i] + 2 * i - 1, 0, 0);
        mesh.rotation.set(0, 0, Math.PI / 2 * (i * -2 + 1));
        snare_pyramids.push(mesh);
        cubes_group.add(mesh);
    }
    {
        let dim = kick_cubes_base_y[1] - kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(2, dim, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1} );
        kick_rect_prism = new THREE.LineSegments(wireframe, wireframe_mat);
        cubes_group.add(kick_rect_prism);
    }
    {
        let dim = kick_cubes_base_y[1] - kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(dim, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1} );
        big_snare_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        cubes_group.add(big_snare_cube);
    }
    {
        let geometry = new THREE.BoxGeometry(2, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthTest: false} );
        center_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        cubes_group.add(center_cube);
    }
    {
        let geometry = new THREE.IcosahedronGeometry();
        const basic_mat = new THREE.MeshBasicMaterial( { color: "red" } );
        let wireframe = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5));
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthTest: false} );
        icos = new THREE.Mesh(geometry, basic_mat);
        icos.add(new THREE.LineSegments(wireframe, wireframe_mat));
    }
    scene.add(icos);
    scene.add(cubes_group);

    camera.position.set(0, 0, 5);
    return 5;
}

function p13a_updt(paused, song_time, ch_amps) {
    if (!paused) {
        cubes_group.rotation.y += 0.02;
        cubes_group.rotation.z += 0.005;
        for (let i = 0; i < 2; i++) {
            kick_cubes[i].position.y = kick_cubes_base_y[i] + ch_amps[0] * (i * 2 - 1);
        }
        kick_rect_prism.scale.set(1.0, ch_amps[4], 1.0);
        snare_pyramids[0].position.x = snare_pyramids_base_x[0] - ch_amps[2];
        snare_pyramids[1].position.x = snare_pyramids_base_x[1] + ch_amps[3];

        icos.scale.set(1 - ch_amps[0], 1 - ch_amps[0], 1 - ch_amps[0]);

        if (ch_amps[1]) {
            document.body.style.backgroundColor = "blue";
        } else {
            document.body.style.backgroundColor = "black";
        }
    } else {
        cubes_group.rotation.y += 0.005;
    }
    icos.rotation.y = cubes_group.rotation.y;
}*/

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
