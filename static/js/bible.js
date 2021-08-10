function set_version(book, ch) {
    var version = document.getElementById('version').value;
    window.location.href = "/bible/" + book + "/" + ch + "?v=" + version;
}

function add_version(book, ch) {
    var version = document.getElementById('version').value;
    var url_no_target = window.location.href.split(/#(.+)/)[0]
    var url_target = window.location.href.split(/#(.+)/)[1]
    var new_href = url_no_target + "&v=" + version;
    if (url_target) {
        new_href += "#" + url_target;
    }
    window.location.href = new_href;
}

function goto_location(disp_vers) {
    var book = document.getElementById('book').value;
    var ch = document.getElementById('chapter').value;
    window.location.href = "/bible/" + book + "/" + ch + "?v=" + disp_vers.join("&v=");
}

function update_chapter_select(ch, select_default) {
    var book = document.getElementById('book').value;
    var options = [];
    for (var i = 0; i < book_num_chaps[book]; i++) {
        let option_str = "<option value='" + (i + 1) + "'"
        if ((i + 1).toString() == ch && select_default) {
            option_str += " selected";
        }
        option_str += ">" + (i + 1) + "</option>";
        options.push(option_str);
    }
    document.getElementById('chapter').innerHTML = options.join();
}
