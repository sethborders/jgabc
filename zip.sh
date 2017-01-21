#!/bin/bash
uglifyjs jgabc.full.js -cmo jgabc.js
rm web-app-jgabc.zip
zip -9 web-app-jgabc.zip icon/* psalms/* fonts/* css/smoothness/* css/smoothness/images/* gabc/* patterns/* jquery-ui-1.10.3.custom.min.js caeciliae-staffless-webfont.ttf caeciliae-staffless-print.ttf jgabc.js jgabc.full.js jquery.min.js jquery.autosize-min.js moment.min.js moment.easter.js manifest.json readings.html readings.js psalmtone.html psalmtone.html.js psalmtone.js transcriber.html transcriber.html.js style.css faq.html sink.js audiolet.js jszip.js versiculum.ttf propers.js propersdata.js propersdatanovus.js ordinarydata.js propers.html jquery.hypher.js FileSaver.js exsurge.min.js util.js