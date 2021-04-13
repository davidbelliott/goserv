var poly = null;
var geometry = null;
var orig_geom = null;
var wireframe = null;
var orig_wireframe = null;

function p10a_init(scene, camera) {
    geometry = new THREE.IcosahedronGeometry();
    orig_geom = geometry.clone();
    const basic_mat = new THREE.MeshBasicMaterial( { color: "red" } );
    wireframe = new THREE.EdgesGeometry(geometry);
    orig_wireframe = wireframe.clone();
    const wireframe_mat = new THREE.LineBasicMaterial( { color: "black", linewidth: 1, depthTest: false} );
    poly = new THREE.Mesh(geometry, basic_mat);
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

    return 4;
}

function p10a_updt(paused, song_time, ch_amps) {
    if (!paused) {
        poly.rotation.x += 0.02;
        poly.rotation.y += 0.02;
        const positions = geometry.attributes.position.array;
        const orig_positions = orig_geom.attributes.position.array;
        const orig_wireframe_positions = orig_wireframe.attributes.position.array;

        for (let i = 0; i < positions.length; i++) {
            positions[i] = orig_positions[i] * Math.max(ch_amps[0],0.1) * 2;
        }
        geometry.attributes.position.needsUpdate = true;
        const positions2 = wireframe.attributes.position.array;
        for (let i = 0; i < positions2.length; i++) {
            positions2[i] = orig_wireframe_positions[i] * Math.max(ch_amps[2],0.1) * 2;
        }
        wireframe.attributes.position.needsUpdate = true;
    } else {
        poly.rotation.x += 0.005;
        poly.rotation.y += 0.005;
    }
}

tracks = ["p10-a"];
init_funcs =    [p10a_init];
update_funcs =  [p10a_updt];

var player = populate_tracks(tracks, false)[0];
player.on("pause", stellated_pause);
player.on("play", stellated_play);
player.on("playing", stellated_play);
player.on("seeked", stellated_seeked);
player.on("waiting", stellated_pause);
player.on("timeupdate", stellated_time_update);

init();

if (webgl_available()) {
    animate();
}
