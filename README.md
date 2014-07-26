This is a web-based 3d editor for eqemu.

The mapjs directory is not included here as it is massive and the scene format is still in flux.
It currently expects a scene file and a model file in typical three.js format with predictable filenames that use the zone short name.

Example:
s_ecommons.js - Scene definition
ecommons.js - Actual map model file

The proposed scene format would load and instance placeables instead of relying on a massive static map.

-------------------------------------------------
This project is released under the GPL.
https://github.com/josheb/eqmaptool

Gnome High Contrast icons are released under the LGPL2.1 license.
http://www.gnome.org/

JQuery and Three.js are released under the MIT license.
http://jquery.com/
http://threejs.org/

Gritter JQuery plugin is dual-licensed GPL/MIT
https://github.com/jboesch/Gritter

Ace syntax highlighting HTML5 text editor is released under the BSD license.
http://ace.c9.io/#nav=about
