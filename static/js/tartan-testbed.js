//import * as THREE from '/static/js/three.js/build/three.module.js';
import * as tartan from '/static/js/tartan.js';

let crypto_obj = window.crypto || window.msCrypto;
let tx_bytes = new Uint8Array(tartan.NUM_BYTES);

let t = null;
let canvas = document.getElementById("tartan");
let ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function gen_tartan() {
    tx_bytes = crypto_obj.getRandomValues(tx_bytes);
    if (t != null) {
        t.destroy();
    }
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 320, 320);
    t = new tartan.Tartan(ctx, tx_bytes);

    let tx = document.getElementById("tx");

    let rarity = document.getElementById("rarity");
    rarity.innerHTML = '';
    rarity.appendChild(document.createTextNode(t.get_rarity()));

    let attrs = document.getElementById("attrs");
    attrs.innerHTML = '';
    tartan.print_attrs(t, attrs);
}

document.getElementById("gen-tartan-button").onclick = gen_tartan;

let colors = document.getElementById("colors");
for (let [col_name, col_val] of tartan.COLORS) {
    let cdiv = document.createElement("div");
    cdiv.style = `background-color: ${tartan.get_color_hex_str(col_val)}; display: inline-block; width: 20px; height: 1rem`;
    let t = document.createTextNode(col_name);
    colors.appendChild(t);
    colors.appendChild(cdiv);
}

gen_tartan();
