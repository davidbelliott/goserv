import * as THREE from '/static/js/three.js/build/three.module.min.js';

const p13a = {
    kick_cubes: [],
    kick_cubes_base_y: [-2.5, 2.5],
    kick_rect_prism: null,
    snare_pyramids: [],
    snare_pyramids_base_x: [-2.25, 2.25],
    snare_rect_prisms: [],
    cubes_group: null,
    icos: null
}

export function init(scene) {
    var camera = new THREE.PerspectiveCamera( 75, 2, 0.1, 1000 );
    //renderer.context.disable(renderer.context.DEPTH_TEST);
    p13a.cubes_group = new THREE.Group();
    for (const i in p13a.kick_cubes_base_y) {
        let geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        let wireframe = new THREE.EdgesGeometry(new THREE.BoxGeometry());
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        const basic_mat = new THREE.MeshBasicMaterial( { color: "purple", depthFunc: THREE.LessEqualDepth } );
        let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
        mesh.add(new THREE.Mesh(geometry, basic_mat));
        mesh.position.set(0, p13a.kick_cubes_base_y[i], 0);
        p13a.kick_cubes.push(mesh);
        p13a.cubes_group.add(mesh);
    }
    for (const i in p13a.snare_pyramids_base_x) {
        let geometry = new THREE.ConeGeometry(1, 0.5, 4);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        let mesh = new THREE.LineSegments(wireframe, wireframe_mat);
        mesh.position.set(p13a.snare_pyramids_base_x[i] + 2 * i - 1, 0, 0);
        mesh.rotation.set(0, 0, Math.PI / 2 * (i * -2 + 1));
        p13a.snare_pyramids.push(mesh);
        p13a.cubes_group.add(mesh);
    }
    {
        let dim = p13a.kick_cubes_base_y[1] - p13a.kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(2, dim, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        p13a.kick_rect_prism = new THREE.LineSegments(wireframe, wireframe_mat);
        p13a.cubes_group.add(p13a.kick_rect_prism);
    }
    {
        let dim = p13a.kick_cubes_base_y[1] - p13a.kick_cubes_base_y[0] - 1;
        let geometry = new THREE.BoxGeometry(dim, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        let big_snare_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        p13a.cubes_group.add(big_snare_cube);
    }
    {
        let geometry = new THREE.BoxGeometry(2, 2, 2);
        let wireframe = new THREE.EdgesGeometry(geometry);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "cyan", linewidth: 1, depthFunc: THREE.LessEqualDepth} );
        let center_cube = new THREE.LineSegments(wireframe, wireframe_mat);
        p13a.cubes_group.add(center_cube);
    }
    {
        let geometry = new THREE.IcosahedronGeometry();
        const basic_mat = new THREE.MeshBasicMaterial( { color: "red", depthFunc: THREE.LessEqualDepth } );
        let wireframe = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5));
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "yellow", linewidth: 1, depthFunc: THREE.LessEqualDepth } );
        p13a.icos = new THREE.Mesh(geometry, basic_mat);
        p13a.icos.add(new THREE.LineSegments(wireframe, wireframe_mat));
    }
    scene.add(p13a.icos);
    scene.add(p13a.cubes_group);

    camera.position.set(0, 0, 5);
    return [5, camera];
}

export function updt(paused, song_time, ch_amps) {
    if (!paused) {
        p13a.cubes_group.rotation.y += 0.02;
        p13a.cubes_group.rotation.z += 0.005;
        for (let i = 0; i < 2; i++) {
            p13a.kick_cubes[i].position.y = p13a.kick_cubes_base_y[i] + ch_amps[0] * (i * 2 - 1);
        }
        p13a.kick_rect_prism.scale.set(1.0, ch_amps[4], 1.0);
        p13a.snare_pyramids[0].position.x = p13a.snare_pyramids_base_x[0] - ch_amps[2];
        p13a.snare_pyramids[1].position.x = p13a.snare_pyramids_base_x[1] + ch_amps[3];

        p13a.icos.scale.set(1 - ch_amps[0], 1 - ch_amps[0], 1 - ch_amps[0]);

        if (ch_amps[1]) {
            document.body.style.backgroundColor = "blue";
        } else {
            document.body.style.backgroundColor = "black";
        }
    } else {
        p13a.cubes_group.rotation.y += 0.005;
    }
    p13a.icos.rotation.y = p13a.cubes_group.rotation.y;
}
