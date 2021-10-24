+++
css: index.css
+++

<html>

# Tartan

<script type="module" src="/static/js/tartan-testbed.js"></script>

<button id="gen-tartan-button">gen tartan</button>
<p></p>
<canvas id="tartan" width="320" height="320" style="image-rendering: pixelated; width: unset"></canvas>
<p></p>

## Attributes

Overall rarity score: <span id="rarity"></span>/32

Rarity score is calculated by taking the sum of individual attribute rarities, then normalizing so that maximum possible rarity = 32.

Each attribute's rarity is the position of its probability of occurrence in a sorted list of value probabilities, normalized to [0, 1]. For example, if attribute A has value 1 with probability 0.5, 2 with probability 0.3, and 3 with probability 0.1, then the rarity of 1 is 0, the rarity of 2 is 0.5,  and the rarity of 3 is 1.

<div id="attrs"></div>

## Full Pallette

<div id="colors"></div>

</html>
