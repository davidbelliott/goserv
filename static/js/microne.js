var all_players = [];
var now_playing_idx = 0;

function populate_tracks(tracks, dl_link=true) {
    tracks_div = document.getElementById('tracks');
    var players = []
    for (var i = 0; i < tracks.length; i++) {
        trackname = tracks[i];
	var source = '/static/wav/'.concat(trackname, '.mp3');
        var wav = '/static/wav/'.concat(trackname, '.wav');
    	var t_div = document.createElement('div');
	var link = document.createElement('a');
	var linktext = document.createTextNode(trackname);
	link.setAttribute('href', wav);
	link.appendChild(linktext);
	var player = document.createElement('div');
	player.className = 'player';
	player.id = 'player-'.concat(trackname);
        var m = new Microne(player, i);
        m.source(source);
        players.push(m);
        if (dl_link) {
            t_div.appendChild(link);
        }
	t_div.appendChild(player);
	tracks_div.appendChild(t_div);
	tracks_div.appendChild(document.createElement('br'));
    }
    all_players = players;
    return players;
}

function Microne(parent_el, this_idx) {
	this.audio = null
	this._src_ = null
	this._events_ = []
	this.is_playing = false
        this.idx = this_idx

	this.p_char = '>'
	this.s_char = '||'

	this.el = document.createElement('div')
	_apply_style(this.el, {
		width: '100%',
		height: '100%',
		border: '1px solid',
		cursor: 'auto',
		position: 'relative'
	})

	this.fill_el = document.createElement('div')
	_apply_style(this.fill_el, {
		background: 'blue',
		height: '100%',
		width: '0%',
		pointerEvents: 'none'
	})
	this.el.appendChild(this.fill_el)

	this.play_button = document.createElement('a')
        this.play_button.className = 'play-button'
	this.play_button.innerHTML = this.p_char
	_apply_style(this.play_button, {
		cursor: 'pointer',
		fontFamily: 'monospace',
		fontSize: '14px',
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: 'translate(-50%, -50%)',
		textAlign: 'center'
	})
	this.el.appendChild(this.play_button)

	this.init = function () {
		parent_el.appendChild(this.el)
		this.el.addEventListener('click', el_click)
		this.play_button.addEventListener('click', play_click)
	}

	this.source = function (src, preload) {
		this._src_ = src
		if (preload !== false) {
			this.audio = new Audio(src)
			this.audio.addEventListener('timeupdate', time_update)
			this.audio.addEventListener('ended', audio_ended)
		}
	}

	this.play = function () {
		if (!this.audio && this._src_) {
			this.source(this._src_)
			this._apply_events_()
		}
                for (const p of all_players) {
                    p.pause();
                }
                now_playing_idx = this.idx;
		this.is_playing = true
		this.audio.play()
		this.play_button.innerHTML = this.s_char
		this.el.style.cursor = 'pointer'
	}

	this.pause = function () {
		this.is_playing = false
		this.audio.pause()
		this.play_button.innerHTML = this.p_char
		this.el.style.cursor = 'auto'
	}

	this._apply_events_ = function () {
		for (var i in this._events_) {
			this.audio.addEventListener(this._events_[i].e, this._events_[i].h)
		}
		this._events_ = []
	}

	this.on = function (e, h) {
		this._events_.push({e, h})
		if (this.audio) {
			this.audio.addEventListener(e, h)
		}
	}

	var t = this

	function _apply_style(dom_elem, style) {
		Object.assign(dom_elem.style, style)
	}

	function el_click(e) {
		e.preventDefault()

		if (e.target != t.play_button && t.is_playing) {
            var rect = t.el.getBoundingClientRect();
            x = e.pageX - rect.left
			t.audio.currentTime = t.audio.duration * (x * 100 / t.el.offsetWidth) / 100
		}
	}

	function play_click(e) {
		e.preventDefault()

		if (t.is_playing) {
			t.pause()
		} else {
			t.play()
		}
	}

	function time_update(e) {
		var at = (t.audio.currentTime * 100 / t.audio.duration).toFixed(3)
		t.fill_el.style.width = at + '%'
	}

	function audio_ended() {
		t.pause()
		t.audio.currentTime = 0
		t.fill_el.style.width = '0%'
	}

	this.init()
	return this
}
