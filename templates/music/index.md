+++
template: layout.html
css: music.css
+++

# Music

![](rocks.jpg)

Music is here

## Asphalt Gomidas

<html>

<div id="tracks"></div>

<script src="/static/js/microne.js"></script>

<script>
    const tracks = ['p10-a', 'p8-b', 'p7-c', 'p6-a', 'p5-a', 'p4-b'];
    tracks_div = document.getElementById('tracks');
    tracks.forEach(function (trackname) {
	var source = '/static/wav/'.concat(trackname, '.wav');
    	var t_div = document.createElement('div');
	var link = document.createElement('a');
	var linktext = document.createTextNode(trackname);
	link.setAttribute('href', source);
	link.appendChild(linktext);
	var player = document.createElement('div');
	player.className = 'player';
	player.id = 'player-'.concat(trackname);
        var m = new Microne(player);
        m.source(source);
	t_div.appendChild(link);
	t_div.appendChild(player);
	tracks_div.appendChild(t_div);
	tracks_div.appendChild(document.createElement('br'));
    })
</script>

</html>

## MIDI Collection
