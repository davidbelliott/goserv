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
        this.instantiated_value = value;
    }

    get_prob() {      // gets the probability of this attribute having its val
        return this.possible_values.get(this.instantiated_value) /
            Math.pow(2, this.bit_width);
    }

    get_max_rarity() {
        const all_rel_probs = Array.from(this.possible_values.values());
        all_rel_probs.sort(function(a, b){ return a - b });     // sort descending
        return (all_rel_probs.findIndex(p => p == all_rel_probs[all_rel_probs.length - 1])) / this.possible_values.size;
    }

    get_rarity() {
        const this_rel_prob = this.possible_values.get(this.instantiated_value);
        const all_rel_probs = Array.from(this.possible_values.values());
        all_rel_probs.sort(function(a, b){ return b - a });     // sort descending
        return (all_rel_probs.findIndex(p => p == this_rel_prob)) / this.possible_values.size;
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

export function get_color_hex_str(num) {
    return `#${num.toString(16).padStart(6, '0')}`;
}

function byte_arr_to_bin_str(byte_array) {
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

export function print_attrs(tartan, p) {
    const attrs = tartan.attributes;
    let tbl = document.createElement('table');
    let head = tbl.createTHead();
    const header = ["attr", "value", "rarity"];
    for(let i = 0; i < header.length; i++){
        head.appendChild(document.createElement("th")).
            appendChild(document.createTextNode(header[i]));
    }
    for (let [attr_name, attr] of attrs) {
        let tr = tbl.insertRow();
        let td_name = tr.insertCell();
        td_name.appendChild(document.createTextNode(attr_name));
        let td_value = tr.insertCell();
        td_value.appendChild(document.createTextNode(attr.get_val()));
        let td_rarity = tr.insertCell();
        td_rarity.appendChild(document.createTextNode(attr.get_rarity()));
    }
    p.appendChild(tbl);
}

export const COLORS = new Map();
COLORS.set("brown",     0x333333);
COLORS.set("red",       0xFF0000);
COLORS.set("green",     0x00FF00);
COLORS.set("blue",      0x0000FF);
COLORS.set("yellow",    0xFFFF00);
COLORS.set("magenta",   0x330033);
COLORS.set("cyan",      0x00FFFF);
COLORS.set("white",     0xFFFFFF);

export class Tartan {
    attributes;
    ctx;
    group;
    geom;
    constructor(ctx, seed_bytes) {
        this.attributes = new Map();

        const possible_n_colors = new Map();
        possible_n_colors.set(2, 1);
        possible_n_colors.set(3, 2);
        possible_n_colors.set(4, 2);
        possible_n_colors.set(5, 2);
        possible_n_colors.set(6, 1)
        this.attributes.set("n_colors", new Attribute(possible_n_colors, 3));

        const max_num_colors = Math.max(...possible_n_colors.keys());
        const possible_colors = new Map();
        possible_colors.set("brown", 3);
        possible_colors.set("red", 3);
        possible_colors.set("green", 1);
        possible_colors.set("blue", 3);
        possible_colors.set("yellow", 2);
        possible_colors.set("magenta", 1);
        possible_colors.set("cyan", 1);
        possible_colors.set("white", 2);
        for (let i = 0; i < max_num_colors; i++) {
            this.attributes.set(`color_${i}`, new Attribute(possible_colors, 4));
        }

        const possible_setts = new Map();
        possible_setts.set("f", 1);
        possible_setts.set("fb", 2);
        possible_setts.set("fbf", 1);
        this.attributes.set("sett", new Attribute(possible_setts, 2));

        // extra stripes, added to # of colors (so every color can be used)
        const max_n_extra_stripes = 10;
        const possible_n_extra_stripes = new Map();
        possible_n_extra_stripes.set(0, 2);
        possible_n_extra_stripes.set(1, 4);
        possible_n_extra_stripes.set(2, 3);
        possible_n_extra_stripes.set(3, 2);
        possible_n_extra_stripes.set(4, 2);
        possible_n_extra_stripes.set(6, 1);
        possible_n_extra_stripes.set(8, 1);
        possible_n_extra_stripes.set(10, 1);
        this.attributes.set("n_extra_stripes", new Attribute(possible_n_extra_stripes, 4));

        // thread counts taken directly from binary sequence -> binomial dist
        const possible_base_thread_counts = new Map();
        possible_base_thread_counts.set(3, 2);
        possible_base_thread_counts.set(4, 2);
        possible_base_thread_counts.set(5, 2);
        possible_base_thread_counts.set(6, 1);
        possible_base_thread_counts.set(7, 1);
        this.attributes.set("base_thread_count", new Attribute(possible_base_thread_counts, 3));

        let bit_idx = inst_attrs_from_bytes(this.attributes, seed_bytes);

        const n_colors = this.get_attr_val("n_colors");
        for (let i = n_colors; i < max_num_colors; i++) {
            this.attributes.delete(`color_${i}`);
        }

        const n_extra_stripes = this.get_attr_val("n_extra_stripes");
        this.stripes = [];
        for (let i = 0; i < n_colors + n_extra_stripes; i++) {
            const threads_bits = get_bits(seed_bytes, bit_idx, 3);
            bit_idx += 3;
            let threads = (threads_bits + 1) * this.get_attr_val("base_thread_count");
            this.stripes.push([i % n_colors, threads]);
        }

        const rot = Math.PI * get_bits(seed_bytes, bit_idx, 2) / 12.0;
        console.log(rot);
        bit_idx += 2;

        this.ctx = ctx;
        const dim = 2 * Math.min(this.ctx.canvas.clientWidth,
            this.ctx.canvas.clientHeight);
        this.ctx.save();
        let cur_x = 0;
        const secondary_canvas = document.createElement("canvas");
        secondary_canvas.width = dim;
        secondary_canvas.height = dim;
        this.ctx_secondary = secondary_canvas.getContext("2d");
        const sett = this.get_attr_val("sett");
        let curr_sett_dir = sett[0];
        //this.ctx.rotate(rot);
        for(let sett_idx = 0; cur_x < dim; sett_idx++) {
            const next_sett_dir = sett[sett_idx % sett.length];
            if (next_sett_dir != curr_sett_dir) {
                this.stripes.reverse();
            }
            curr_sett_dir = next_sett_dir;
            for (let i in this.stripes) {
                const w = this.stripes[i][1];
                const col_idx = this.stripes[i][0];
                const col_name = this.get_attr_val(`color_${col_idx}`);
                const col_val = COLORS.get(col_name);
                const fill = get_color_hex_str(col_val);
                this.ctx_secondary.fillStyle = fill;
                this.ctx_secondary.fillRect(cur_x, 0, w, dim);
                cur_x += w;
            }
        }
        this.ctx.rotate(rot);
        this.ctx.drawImage(secondary_canvas, 0, -dim / 2);

        this.ctx_secondary.rotate(Math.PI / 4);
        for (let i = 0; i < dim / 2; i++) {
            this.ctx_secondary.fillStyle = "#FFFF00";
            this.ctx_secondary.clearRect(i * 4, -dim, 2, dim * 2);
        }
        this.ctx.rotate(Math.PI / 2);
        this.ctx.drawImage(secondary_canvas, -dim / 2, -dim);
        this.ctx.restore();
    }

    get_attr_val(name) {
        return this.attributes.get(name).get_val();
    }

    get_prob() {
        let prob = 1.0;
        for (let attr of this.attributes.values()) {
            prob *= attr.get_prob();
        }
        return prob;
    }

    get_rarity() {
        let sum = 0.0;
        let max_sum = 0.0;
        for (let attr of this.attributes.values()) {
            sum += attr.get_rarity();
            max_sum += attr.get_max_rarity();
        }
        return Math.round(32 * sum / max_sum);
    }

    destroy() {
    }
}
