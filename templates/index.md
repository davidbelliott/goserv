+++
template: layout.html
css: index.css
+++

# `0xDEADFACADE`

<canvas id="stellated" class="outline"></canvas>
<p></p>
<div id="tracks"></div>

<html>

<script src="/static/js/three.js"></script>
<script src="/static/js/microne.js"></script>
<script src="/static/js/stellated.js"></script>
<script>
    tracks = ["p10-a"];
    var player = populate_tracks(tracks, false)[0];
    player.on("pause", stellated_pause);
    player.on("play", stellated_play);
    player.on("playing", stellated_play);
    player.on("seeked", stellated_seeked);
    player.on("waiting", stellated_pause);
    player.on("timeupdate", stellated_time_update);
</script>
<script src="/static/js/load_components.js"></script>

</html>


Welcome to my home on the World Wide Web.

|||
|:--|:--|
|[Glen Canyon Archive](glen)|Documenting the now-submerged Glen Canyon|
|[Music](music)|Music|
|[Matrix Homeserver](matrix)|Self-hosted chatrooms using the Matrix protocol|
|[Repositories](git)|Self-hosted `git` repositories|
|[Hardware](hardware)|Hardware|
|[Software](software)|Software|
|Handheld Hymn Generator|A portable and durable hymn-generation device|
|Hymn Log|A log of generated hymns|
|Caltech BBS|A bulletin-board system for Caltech and others|
