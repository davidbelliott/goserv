const p10a = {
    poly: null,
    geometry: null,
    orig_geom: null,
    wireframe: null,
    orig_wireframe: null
};

function p10a_init(scene, camera) {
    p10a.geometry = new THREE.IcosahedronGeometry();
    p10a.orig_geom = p10a.geometry.clone();
    const basic_mat = new THREE.MeshBasicMaterial( { color: "red" } );
    p10a.wireframe = new THREE.EdgesGeometry(p10a.geometry);
    p10a.orig_wireframe = p10a.wireframe.clone();
    const wireframe_mat = new THREE.LineBasicMaterial( { color: "black", linewidth: 1, depthTest: false} );
    p10a.poly = new THREE.Mesh(p10a.geometry, basic_mat);
    p10a.poly.add(new THREE.LineSegments(p10a.wireframe, wireframe_mat));
    scene.add( p10a.poly );

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
        p10a.poly.rotation.x += 0.02;
        p10a.poly.rotation.y += 0.02;
        const positions = p10a.geometry.attributes.position.array;
        const orig_positions = p10a.orig_geom.attributes.position.array;
        const orig_wireframe_positions = p10a.orig_wireframe.attributes.position.array;

        for (let i = 0; i < positions.length; i++) {
            positions[i] = orig_positions[i] * Math.max(ch_amps[0],0.1) * 2;
        }
        p10a.geometry.attributes.position.needsUpdate = true;
        const positions2 = p10a.wireframe.attributes.position.array;
        for (let i = 0; i < positions2.length; i++) {
            positions2[i] = orig_wireframe_positions[i] * Math.max(ch_amps[2],0.1) * 2;
        }
        p10a.wireframe.attributes.position.needsUpdate = true;
    } else {
        p10a.poly.rotation.x += 0.005;
        p10a.poly.rotation.y += 0.005;
    }
}

const p8b = {
    poly: null,
    geometry: null,
    orig_geom: null,
    wireframe: null,
    orig_wireframe: null
};

function p8b_init(scene, camera) {
    p8b.geometry = new THREE.DodecahedronGeometry();
    p8b.orig_geom = p8b.geometry.clone();
    const basic_mat = new THREE.MeshBasicMaterial( { color: "salmon" } );
    p8b.wireframe = new THREE.EdgesGeometry(p8b.geometry);
    p8b.orig_wireframe = p8b.wireframe.clone();
    const wireframe_mat = new THREE.LineBasicMaterial( { color: "black", linewidth: 1, depthTest: false} );
    p8b.poly = new THREE.Mesh(p8b.geometry, basic_mat);
    p8b.poly.add(new THREE.LineSegments(p8b.wireframe, wireframe_mat));
    scene.add( p8b.poly );

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

function p8b_updt(paused, song_time, ch_amps) {
    if (!paused) {
        p8b.poly.rotation.x = 10 * Math.floor(song_time / 60 * 110);
        p8b.poly.rotation.y += 0.02;
        const positions = p8b.geometry.attributes.position.array;
        const orig_positions = p8b.orig_geom.attributes.position.array;
        const orig_wireframe_positions = p8b.orig_wireframe.attributes.position.array;

        for (let i = 0; i < positions.length; i++) {
            positions[i] = orig_positions[i] * Math.max(ch_amps[0],0.1) * 2;
        }
        p8b.geometry.attributes.position.needsUpdate = true;
        const positions2 = p8b.wireframe.attributes.position.array;
        for (let i = 0; i < positions2.length; i++) {
            positions2[i] = orig_wireframe_positions[i] * Math.max(ch_amps[1],0.1) * 2;
        }
        p8b.wireframe.attributes.position.needsUpdate = true;
    } else {
        p8b.poly.rotation.y += 0.005;
    }
}

tracks = ["p10-a", "p8-b", "p7-c", "p6-a", "p5-a", "p4-b"];
init_funcs =    [p10a_init, p8b_init];
update_funcs =  [p10a_updt, p8b_updt];

var players = populate_tracks(tracks, true);
players.forEach(player => {
    player.on("pause", stellated_pause);
    player.on("play", stellated_play);
    player.on("playing", stellated_play);
    player.on("seeked", stellated_seeked);
    player.on("waiting", stellated_pause);
    player.on("timeupdate", stellated_time_update);
});

init();

if (webgl_available()) {
    animate();
}
