import * as THREE from '/static/js/three.js/build/three.module.js';

export const MAX_ATTR_BITWIDTH = 8;
export const NUM_BYTES = 32;

class Attribute {
    possible_values;    // map of value -> likelihood (range within bit_width)
    bit_width;          // num bits used to decide value (max MAX_ATTR_BITWIDTH)
    instantiated_value;

    // Value will be obtained by passing the bit sequence as the
    // argument of the CDF based on probability of obtaining binned values.
    constructor(possible_values, bit_width) {
        if (bit_width > MAX_ATTR_BITWIDTH) {
            throw('Too many bits specified for attribute');
        }
        this.bit_width = bit_width;
        let sum_prob = 0;
        for (let [val, prob] of possible_values) {
            sum_prob += prob;
        }
        if (sum_prob != Math.pow(2, bit_width)) {
            throw('Probability sum ' + sum_prob + ' does not match width for attribute');
        }
        this.possible_values = possible_values;
        this.instantiated_value = null;
    }

    get_val() {
        return this.instantiated_value;
    }

    instantiate(seed_bits) {    // bits we care about in low part of seed_bits
        const mask = Math.pow(2, this.bit_width) - 1;
        const mbits = seed_bits & mask;
        let acc = 0;
        let value = null;
        for (let [val, prob] of this.possible_values) {
            acc += prob;
            if (acc > mbits) {
                value = val;
                break;
            }
        }
        if (value == null) {
            throw('Failed to instantiate value for attribute');
        }
        console.log("instantiating: " + value);
        this.instantiated_value = value;
    }

    get_rarity() {      // gets the rarity score, one minus norm prob
        return 1.0 - this.possible_values[this.instantiated_value] / 
            Math.pow(2, this.bit_width);
    }
}

function get_bits(byte_array, start_bit_idx, n_bits) {
    let byte_idx = Math.floor(start_bit_idx / 8);
    let bit_idx = start_bit_idx % 8;
    let result = 0;
    let bit_idx_in_result = 0;
    while (n_bits > 0) {
        const bits_to_take = Math.min(n_bits, 8 - bit_idx);
        const mask = Math.pow(2, bits_to_take) - 1;

        let b = (byte_array[byte_idx] >> bit_idx) & mask;
        result |= b << bit_idx_in_result;

        n_bits -= bits_to_take;
        bit_idx += bits_to_take;
        bit_idx_in_result += bits_to_take;
        while (bit_idx >= 8) {
            byte_idx++;
            bit_idx -= 8;
        }
    }
    return result;
}

function to_bin_str(byte_array) {
    let str = "";
    for (let i in byte_array) {
        str += byte_array[i].toString(2).padStart(8, '0') + ' ';
    }
    return str;
}

function inst_attrs_from_bytes(attrs, byte_array) {
    let cur_bit_idx = 0;
    for (let [name, attr] of attrs) {
        const the_bits = get_bits(byte_array, cur_bit_idx, attr.bit_width);
        cur_bit_idx += attr.bit_width;
        attr.instantiate(the_bits);
    }
    return cur_bit_idx;
}

function print_attrs(attrs) {
    console.log(attrs);
}

const COLORS = new Map();
COLORS.set("black",     0x000000);
COLORS.set("red",       0xFF0000);
COLORS.set("green",     0x00FF00);
COLORS.set("blue",      0x0000FF);
COLORS.set("yellow",    0xFFFF00);
COLORS.set("magenta",   0xFF00FF);
COLORS.set("cyan",      0x00FFFF);
COLORS.set("white",     0xFFFFFF);
COLORS.set("lavendar",  0xE6E6FA);

export class Tartan {
    attributes;
    parent_obj;
    group;
    geom;
    constructor(parent_obj, seed_bytes) {
        this.attributes = new Map();

        const possible_n_colors = new Map();
        possible_n_colors.set(2, 2);
        possible_n_colors.set(3, 2);
        possible_n_colors.set(4, 2);
        possible_n_colors.set(5, 1);
        possible_n_colors.set(6, 1);
        this.attributes.set('n_colors', new Attribute(possible_n_colors, 3));

        const max_num_colors = 6;
        const possible_colors = new Map();
        possible_colors.set("black", 1);
        possible_colors.set("red", 1);
        possible_colors.set("green", 1);
        possible_colors.set("blue", 1);
        possible_colors.set("yellow", 1);
        possible_colors.set("magenta", 1);
        possible_colors.set("cyan", 1);
        possible_colors.set("white", 1);
        for (let i = 0; i < max_num_colors; i++) {
            this.attributes.set(`color_${i}`, new Attribute(possible_colors, 3));
        }

        const possible_setts = new Map();
        possible_setts.set("fbfb", 1);
        this.attributes.set("sett", new Attribute(possible_setts, 0));

        // extra stripes, added to # of colors (so every color can be used)
        const max_n_stripes = 10;
        const possible_n_stripes = new Map();
        possible_n_stripes.set(0, 2);
        possible_n_stripes.set(1, 4);
        possible_n_stripes.set(2, 3);
        possible_n_stripes.set(3, 2);
        possible_n_stripes.set(4, 2);
        possible_n_stripes.set(6, 1);
        possible_n_stripes.set(8, 1);
        possible_n_stripes.set(10, 1);
        this.attributes.set("n_stripes", new Attribute(possible_n_stripes, 4));

        // thread counts taken directly from binary sequence -> binomial dist
        const possible_median_thread_counts = new Map();
        possible_median_thread_counts.set(2, 1);
        possible_median_thread_counts.set(4, 2);
        possible_median_thread_counts.set(8, 2);
        possible_median_thread_counts.set(12, 2);
        possible_median_thread_counts.set(16, 1);
        this.attributes.set("median_thread_count", new Attribute(possible_median_thread_counts, 3));

        let bit_idx = inst_attrs_from_bytes(this.attributes, seed_bytes);

        const n_colors = this.get_attr_val("n_colors");
        const n_extra_stripes = this.get_attr_val("n_stripes");
        console.log("n colors:");
        console.log(n_colors);
        this.stripes = [];
        for (let i = 0; i < n_colors + n_extra_stripes; i++) {
            const threads_bits = get_bits(seed_bytes, bit_idx, 3);
            bit_idx += 3;
            let threads = threads_bits *
                this.get_attr_val("median_thread_count") /
                (Math.pow(2, 3) - 1) * 2;
            this.stripes.push([i % n_colors, threads]);
        }

        print_attrs(this.attributes);
        console.log(`Bits used: ${bit_idx}`);

        this.parent_obj = parent_obj;
        this.group = new THREE.Group();

        let cur_x = 0;
        this.unit = new THREE.Group();
        for (let i in this.stripes) {
            console.log("stripe");
            console.log(this.stripes[i]);
            const w = this.stripes[i][1] / 100;
            const geom = new THREE.PlaneGeometry(w, 1);
            const col_idx = this.stripes[i][0];
            const col_name = this.get_attr_val(`color_${col_idx}`);
            const col_val = COLORS.get(col_name);
            console.log(col_name);
            const mat = new THREE.MeshBasicMaterial({color: col_val, side: THREE.DoubleSide});
            const plane = new THREE.Mesh(geom, mat);
            plane.position.set(cur_x + w / 2, 0, 0);
            cur_x += w;
            this.unit.add(plane);
        }
        let w = cur_x;
        cur_x = -1.0;
        while (cur_x < 1.0) {
            let clone = this.unit.clone();
            clone.position.set(cur_x + w / 2, 0, 0);
            this.group.add(clone);
            cur_x += w;
        }


        /*this.geom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const wireframe_mat = new THREE.LineBasicMaterial( { color: "white", linewidth: 1 } );
        const line = new THREE.LineSegments(this.geom, wireframe_mat);
        this.group.add(line);*/
        parent_obj.add(this.group);
    }
    get_attr_val(name) {
        console.log(this.attributes.get(name));
        return this.attributes.get(name).get_val();
    }
    destroy() {
        if (this.parent_obj != null) {
            this.parent_obj.remove(this.group);
        }
    }
}
