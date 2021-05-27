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
    orig_wireframe: null,
    cube_geom: null,
    cubes: null,
    cubes_orig: null,
    cubes_last_scale: [],
    last_overall_scale: 0
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

    p8b.cube_geom = new THREE.BoxGeometry(0.5);//0.5, 0.5, 0.5);
    const cube_mat = new THREE.MeshBasicMaterial( { color: "black", transparent: true, opacity: 1.0} );
    p8b.cubes = new THREE.InstancedMesh(p8b.cube_geom, cube_mat, 64);
    for (let i = 0; i < 64; i++) {
        let phi = Math.random() * Math.PI * 2;  // 0-360
        let theta = Math.random() * Math.PI;    // 0-180
        let r = Math.random() * 1 + 2;
        let x = r * Math.sin(theta) * Math.cos(phi);
        let y = r * Math.sin(theta) * Math.sin(phi);
        let z = r * Math.cos(theta);
        let pos = new THREE.Vector3(x, y, z);
        let scale = new THREE.Vector3(1, 1, 1);
        let quat = new THREE.Quaternion();
        quat.identity();
        let pos_mat = new THREE.Matrix4().compose(pos, quat, scale);
        p8b.cubes.setMatrixAt(i, pos_mat);
    }
    p8b.cubes_last_scale = Array(64).fill(0)
    p8b.cubes_orig = p8b.cubes.clone();
    scene.add(p8b.cubes);

    camera.position.z = 2;

    return 4;
}

function p8b_updt(paused, song_time, ch_amps) {
    if (!paused) {
        p8b.poly.rotation.x = Math.floor(song_time / 60 * 110);
        p8b.poly.rotation.y += 0.02;
        p8b.cubes.rotation.y += 0.005;
        const positions = p8b.geometry.attributes.position.array;
        const orig_positions = p8b.orig_geom.attributes.position.array;
        const orig_wireframe_positions = p8b.orig_wireframe.attributes.position.array;

        let freqs = get_freqs(song_time);
        let overall_scale = 0.95 * p8b.last_overall_scale + 0.05 * ch_amps[2];
        p8b.last_overall_scale = overall_scale;
        for (let i = 0; i < 64; i++) {
            let mat = new THREE.Matrix4();
            p8b.cubes_orig.getMatrixAt(i, mat);
            let pos = new THREE.Vector3();
            let quat = new THREE.Quaternion();
            let scale = new THREE.Vector3();
            mat.decompose(pos, quat, scale);

            let new_scale_val = 0.1;
            if (freqs.includes(i)) {
                new_scale_val = 0.5;
                //p8b.cubes.setColorAt(i, new THREE.Color("red"));
            }
            let scale_val = 0.8 * p8b.cubes_last_scale[i] + 0.2 * new_scale_val;
            p8b.cubes_last_scale[i] = scale_val;
            scale.set(scale_val, scale_val, scale_val);
            let mat_new = new THREE.Matrix4();
            pos.multiplyScalar(overall_scale);
            mat_new.compose(pos, quat, scale);

            p8b.cubes.setMatrixAt(i, mat_new);
        }
        p8b.cubes.instanceMatrix.needsUpdate = true;

        let val = Math.max(ch_amps[0], 0.1) * 2;
        for (let i = 0; i < positions.length; i++) {
            positions[i] = orig_positions[i] * val;
        }
        p8b.geometry.attributes.position.needsUpdate = true;
        const positions2 = p8b.wireframe.attributes.position.array;
        for (let i = 0; i < positions2.length; i++) {
            positions2[i] = orig_wireframe_positions[i] * Math.max(ch_amps[1],0.1) * 2;
        }
        p8b.wireframe.attributes.position.needsUpdate = true;
    } else {
        p8b.cubes.rotation.y += 0.001;
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
