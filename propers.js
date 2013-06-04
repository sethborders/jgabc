var selDay,selPropers,sel={
  tractus:{},
  offertorium:{},
  introitus:{},
  graduale:{},
  communio:{},
  alleluia:{}
}
var partAbbrev = {
  tractus:'Tract.',
  offertorium:'Offert.',
  introitus:'Intr.',
  graduale:'Grad.',
  communio:'Comm.'
};
$(function(){
  var removeDiacritics=function(string) {
    return string.replace(/á/g,'a').replace(/é|ë/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ý/g,'y').replace(/æ|ǽ/g,'ae').replace(/œ/g,'oe').replace(/[,.;?“”‘’"':]/g,'');
  };
  var getGabcForPropers=function(propers,part,text){
    var id = propers[part + 'ID'];
    if(id) { return id; }
    var proper = text || propers[part];
    var ids = chantID[part];
    var properLines = proper.split('\n');
    var i=0;
    var firstLine = properLines[i];
    while(firstLine[0]=='!') {
      firstLine = properLines[++i];
    }
    firstLine = firstLine.replace(/^v.\s+/i,'');
    firstLine = removeDiacritics(firstLine.toLowerCase());
    firstWords = firstLine.split(/\s+/);
    var n = 1;
    while(!id) {
      id = ids[firstWords.slice(0,n++).join(' ')];
      if(n > firstWords.length) return;
    }
    if(id.psalm) {
      var psalm = properLines[++i];
      while(psalm.slice(0,3)!='!Ps') {
        psalm = properLines[++i];
      }
      psalm = properLines[++i];
      psalm = removeDiacritics(psalm.toLowerCase());
      psalmWords = psalm.split(/\s+/);
      n = 1;
      var idd;
      while(!idd) {
        idd = id.psalm[psalmWords.slice(0,n++).join(' ')];
        if(n > psalmWords.length) return;
      }
      id = idd;
    }
    if(id.Solesmes) id = id.Solesmes;
    if(id.Vatican) id = id.Vatican;
    console.info(id);
    return id.id;
  };
  var parseGraduale = function(graduale) {
    graduale = graduale.replace(/lleluia/g,'llelúja');
    var match = /^([^}]*?)Allelúja, allelúja[.,]?\s+([^}]*)/.exec(graduale);
    var result = {};
    if(match) {
      if(match[1]) result.graduale = match[1];
      result.alleluia = match[2];
    } else {
      match = /(![^\n]+[^}]+)\n(![^}]+)/.exec(graduale);
      if(!match) return {graduale:graduale};
      result.graduale = match[1];
      result.tractus = match[2];
    }
    return result;
  }
  var updatePart = function(part) {
    var id = selPropers[part+'ID'];
    var capPart = part[0].toUpperCase()+part.slice(1);
    var $div = $('#div'+capPart);
    if(id) {
      var $txt = $('#txt'+capPart);
      $($txt.prop('labels')).find('a').attr('href','http://gregobase.selapa.net/chant.php?id='+id);
      $div.show();
      $.get('gabc/'+id+'.gabc',function(gabc){
        gabc = gabc.replace(/\s+$/,'');
        var header = getHeader(gabc);
        header.annotation = partAbbrev[part] || header.mode || '';
        gabc = header + gabc.slice(header.original.length);
        sel[part].gabc = gabc;
        sel[part].mode = header.mode;
        sel[part].text = versify(decompile(gabc,true));
        updateTextAndChantForPart(part);
      });
    } else {
      $div.hide();
    }
  }
  var selectedDay = function(e){
    selDay = $(this).val();
    selPropers = proprium[selDay];
    if(selPropers) {
      updatePart('introitus');
      updatePart('graduale');
      updatePart('alleluia');
      updatePart('tractus');
      updatePart('offertorium');
      updatePart('communio');
    }
  };
  
  
  var splitGabc = function(gabc,offset) {
    var gSyl = [];
    regexGabc.exec('');
    while((match = regexGabc.exec(gabc))) {
      var tone,tones=[];
      regexTones.exec('');
      while((tone=regexTones.exec(match[1]))){
        tones.push(tone[0]);
      }
      gSyl.push({match: match,
                 hasSyllable: match[5],
                 gabc: '(' + match[1] + ')',
                 isClef: match[4],
                 isBar: match[3],
                 tones: tones,
                 index: match.index + offset
                });
    }
    return gSyl;
  };
  var decompile = function(mixed,ignoreSyllablesOnDivisiones) {
    regexOuter.exec('');
    var curClef;
    var regRep=/^[cf]b?[1-4]\s*|(\s+)[`,;:]+\s*/gi;
    var text=[];
    var gabc='';
    var match;
    var ws;
    var tws='';
    var verses=[];
    var hasElisions=false;
    var lastVerseI=0;
    var lastClef='';
    var verseHasClef=false;
    var lastVerse=function(){return verses[verses.length-1]||null;}
    var match=regexOuter.exec(mixed);
    var verseReps=0;
    while(match) {
      ws=match[rog.whitespace]||'';
      var m=undefined;
      var syl=match[rog.syl];
      if(gabc.length==0) {
        regexGabc.exec('');
        m=regexGabc.exec(match[rog.gabc]);
        if(m && m[4]) {
          lastClef=m[4];
          if(gabc.length==0)verseHasClef=true;
        }
      }
      if(tws==' '&&!syl) {
        regexGabc.exec('');
        m=regexGabc.exec(match[rog.gabc]);
        if(!m||m[4])text.push(tws);
      } else {
        text.push(tws);
      }
      if(ignoreSyllablesOnDivisiones) {
        if(match[rog.gabc].indexOf('::')>=0) text.push('~');
        else if(match[rog.gabc].indexOf(':')>=0) text.push(' % ');
        else if(match[rog.gabc].indexOf(';')>=0) text.push(' | ');
      }
      if(syl && (!ignoreSyllablesOnDivisiones || !match[rog.gabc].match(/^[:;,\s]*$/))){
        var sylR=syl.replace(/<i>([aeiouy])<\/i>/ig,'($1)');
        hasElisions = hasElisions||(syl!=sylR);
        text.push(sylR);
      }
      gabc+=match[rog.gabc] + (ws.replace(/[^\n]*\n[^\n]*/g,'\n')||" ");
      var nextMatch=regexOuter.exec(mixed);
      if(match[rog.gabc]=='::' || !nextMatch) {
        if(nextMatch && lastVerseI>0) {
          text.splice(lastVerseI,0,'\n\n');
          text[lastVerseI-1] = text[lastVerseI-1].replace(/^\s+|\s+$/,'');
          text[lastVerseI+1] = text[lastVerseI+1].replace(/^\s+|\s+$/,'');
        }
        if(!hasElisions) {
          var tempVerse=gabc.replace(/^\s+|\s+$/,'');
          var temp2=tempVerse.replace(regRep,'$1');
          var lastV=lastVerse();
          if(verseHasClef) {
            temp2 = temp2.slice(lastClef.length).replace(/^\s+/,'');
          }
          if(!lastV || temp2!=lastV.replace(regRep,'$1')) {
            if(!verseHasClef && verses.length==0)tempVerse = lastClef + ' ' + tempVerse;
            if(verseReps==1){
              verses.push(verses.pop()+"\n"+tempVerse);
            } else {
              verses.push(tempVerse);
              if(lastVerseI>0) {
                text[lastVerseI]='\n--\n';
              }
              verseReps=1;
            }
          } else {
            if(lastV.match(/^[cf]b?[1-4]/i)) {
              if(!verseHasClef && lastClef)tempVerse = lastClef + ' ' + tempVerse;
            }
            if(tempVerse.length>lastV.length) {
              verses[verses.length-1] = tempVerse;
            }
            ++verseReps;
          }
          lastVerseI=text.length;
        }
        verseHasClef=hasElisions=false;
        gabc='';
      }
      tws=ws;
      match=nextMatch;
    }
    if(tws)text.push(tws);
    regexGabc.exec('');
    var gs =verses.join('\n--\n');
    gSyl=[];
    var offset = 0;
    verses.forEach(
      function(a,b){
        gSyl.push(splitGabc(a,offset));
        offset += a.length + 4;
      });

    //gSyl = splitGabc(gs);
    var s = text.join('').replace(/\s+/g,' ').replace(/^\s+|\s+$|[*{}-]/g,'');
    var index=s.indexOf(' ');
    if(index>1) {
      // make the rest of the first word minuscule
      s=s[0] + s.slice(1,index).toLowerCase() + s.slice(index);
    }
    s = s.replace(/\s*~\s*/g,'\n').replace(/%/g,'*').replace(/(\|\s*)*(\*\s*)+(\|\s*)*/g,'* ');
    return s;
  };
  var getSylCount = function(splitArray) {
    var syls=[];
    for(var j=0; j<splitArray.length; ++j) {
      syls[j] = (splitArray[j].match(reVowels) || []).length;
    }
    return syls;
  }
  
  var reFullBarsWithNoPunctuation = /([^;:,.!?\s])\s*\*/g;
  var reHalfBarsWithNoPunctuation = /([^;:,.!?\s])\s*\|/g;
  var reBarsWithNoPunctuation = /([^;:,.!?\s])\s*[|*]/g;
  var reFullBars = /\*/g;
  var reHalfBars = /\|/g;
  var reCommaWords = /[,]\s/g;
  var reFullStops = /[.:;!?]\s/g;
  var reVowels = /[aeiouyáéíóúýæǽœ]/ig;
  var splitIntoVerses = function(line){
    var fullbars = line.match(reFullBars);
    var halfbars = line.match(reHalfBars);
    if(!fullbars && !halfbars) {
      line = line.replace(reCommaWords,function(a){return a + '| '})
                 .replace(reFullStops,function(a){return a + '* '});
      fullbars = line.match(reFullBars);
      halfbars = line.match(reHalfBars);
    }
    var split;
    if(fullbars) {
      verses = [];
      split = line.split(reFullBars);
      var i=0;
      for(var j=1; j<=split.length; ++j) {
        var left = split.slice(i,j).join('*');
        var normalizedLeft = normalizeMediant(left).split('*');
        var segmentsRemaining = split.length - j;
        if(normalizedLeft.length == 2 && Math.min.apply(null,getSylCount(normalizedLeft))>=7) {
          if (segmentsRemaining == 1) {
            //Check to make sure the one remaining segment can also be split.
            var right = split[j];
            var normalizedRight = normalizeMediant(right).split('*');
            if(normalizedRight.length != 2 || Math.min.apply(null,getSylCount(normalizedRight))<7) {
              j++;
            }
          }
          verses.push(split.slice(i,j).join('*'));
          i = j;
        }
        if(j == split.length && j>i) {
          verses.push(split.slice(i,j).join('*'));
        }
      }
      return verses;
    } else {
      return [line];
    }
  }
  var sum = function(array){
    var result = 0;
    for(var i=array.length-1; i>=0; --i){
      result += array[i];
    }
    return result;
  }
  var makeVerse = function(arrayVerse) {
    var syls = getSylCount(arrayVerse);
    for(var i=1;i<arrayVerse.length; ++i) {
      var left = sum(syls.slice(0,i));
      var right = sum(syls.slice(i));
      if(left >= right || i==(arrayVerse.length-1)) {
        var result = (arrayVerse.slice(0,i).join('') + '*' + arrayVerse.slice(i)).replace(/\s*\|\s*|\s+/g,' ').replace(/^\s+|\s+$/g,'');
        return result[0].toUpperCase() + result.slice(1);
      }
    }
    return "";
  }
  var normalizeMediant = function(verse){
    var fullBars = verse.match(reFullBars);
    if(fullBars && fullBars.length >= 1) {
      return makeVerse(verse.split(reFullBars));
    }
    var halfBars = verse.match(reHalfBars);
    if(halfBars && halfBars.length >= 1) {
      return makeVerse(verse.split(reHalfBars));
    }
    return verse;
  }
  var versify = function(text){
    var lines = text.replace(reBarsWithNoPunctuation,function(a,b){return b;}).split('\n');
    var result = '';
    for(var i=0; i<lines.length; ++i) {
      var line = lines[i];
      var verses = splitIntoVerses(line);
      for(var j=0; j<verses.length; ++j) {
        result += normalizeMediant(verses[j]) + '\n';
      }
    }
    return result.replace(/^\s+|\s+$/,'');
  }
  
  var updateStyle = function(part,style){
    if(sel[part].style != style) {
      sel[part].style = style;
      updateTextAndChantForPart(part);
    }
  }
  
  var capitalizeForBigInitial = function(text) {
    m = text.match(regexLatin);
    m = m && m[0].match(/^[a-z]+/i);
    if(m) {
      m = m[0];
      result = m[0].toUpperCase();
      if(m[1]) {
        result += m[1].toUpperCase();
        if(m[2] && m.length==3 && (text[3]==' ' || text[3]==',')) {
          result += m[2].toUpperCase();
        }
      }
    }
    return result + text.slice(result.length);
  }
  
  var getPsalmToneForPart = function(part){
    var tone;
    var header = getHeader(sel[part].gabc);
    if(part=='introitus' || part=='alleluia') {
      tone = g_tones['Introit ' + header.mode];
    } else {
      tone = g_tones[header.mode + '.'];
    }
    _clef = tone.clef;
    var gMediant = tone.solemn || tone.mediant;
    var gTermination = tone.termination;
    if(!gTermination) {
      for(i in tone.terminations) { gTermination = tone.terminations[i]; break; }
    }
    var gabc;
    var lines;
    if(part=='alleluia') {
      var match = sel[part].gabc.match(/\([^):]*::[^)]*\)/);
      gabc = sel[part].gabc.slice(0,match.index+match[0].length)+'\n';
      lines = sel[part].text.split('\n');
      lines.splice(0,1);
    } else {
      gabc = header + '(' + tone.clef + ') ';
      lines = capitalizeForBigInitial(sel[part].text).split('\n');
    }
    
    var firstVerse = true;
    var asGabc = true;      // Right now this is hard coded, but perhaps I could add an option to only do the first verse, and just point the rest.
    for(var i=0; i<lines.length; ++i) {
      var line = splitLine(lines[i]);
      if(firstVerse || asGabc) {
        var result={shortened:false};
        gabc += applyPsalmTone({
          text: line[0].trim(),
          gabc: gMediant,
          useOpenNotes: false,
          useBoldItalic: false,
          onlyVowel: false,
          format: bi_formats.gabc,
          verseNumber: i+1,
          prefix: !firstVerse,
          suffix: false,
          italicizeIntonation: false,
          result: result,
          favor: 'intonation'
        }) + (line.length == 1? "" : bi_formats.gabc.nbsp + gabcStar + "(:) " +
          applyPsalmTone({
            text: line[1].trim(),
            gabc: gTermination,
            useOpenNotes: false,
            useBoldItalic: false,
            onlyVowel: false,
            format: bi_formats.gabc,
            verseNumber: i+1,
            prefix: false,
            suffix: true,
            italicizeIntonation: false,
            favor: 'termination'
          })) + " (::)\n";
        if(i==0) {
          //if(!repeatIntonation)gMediant=removeIntonation($.extend(true,{},gMediant));
          flex = (line[0].indexOf(sym_flex) >= 0);
        }
        if(!result.shortened)firstVerse=false;
      } /*else {
        if(gabc && !flex) {
          var flexI = line[0].indexOf(sym_flex);
          if(flexI >= 0) {
            var syls = getSyllables(line[0].slice(0,flexI));
            var index = syls.length - 1;
            syls[index].punctuation += ' ' + sym_flex;
            syls[index].space = "";
            var sylcount = syls[index].word.length;
            index -= sylcount - 1;
            while((syls.length - index) < 3) {
              --index;
              sylcount = syls[index].word.length;
              index -= sylcount - 1;
            }
            syls.splice(0,index);
            gabc += "<i>Flex :</i>() " + applyPsalmTone({
              text: syls,
              gabc: getFlexGabc(medTones),
              useOpenNotes: false,
              useBoldItalic: false,
              onlyVowel: onlyVowels,
              format: gabcFormat
            });
            gabc = gabc.slice(0,-1) + new Array(4).join(" " + medTones.toneTenor) + "  ::)";
            flex = true;
          }
        }
        var tempString=addBoldItalic(line[0], medTones.accents, medTones.preparatory, medTones.afterLastAccent, useFormat, onlyVowels, useNovaVulgata?"":i+1,true)
            + (line.length == 1? "" : ((((useFormat in bi_formats)&&bi_formats[useFormat])||bi_formats.gabc).nbsp) + "* " + addBoldItalic(line[1], terTones.accents, terTones.preparatory, terTones.afterLastAccent, useFormat, onlyVowels,useNovaVulgata?"":i+1,false,true));
        vr += tempString + '\n';
        r += "<p style='line-height:100%;margin: 6pt 0px;'>"
          + tempString
          + "</p>";
      } */
    }
    
    
    return gabc;
  }
  
  var updateTextAndChantForPart = function(part) {
    var gabc,
        capPart = part[0].toUpperCase()+part.slice(1),
        $div = $('#div'+capPart),
        $txt = $('#txt'+capPart),
        $preview = $('#'+part+'-preview');
    switch(sel[part].style) {
      case 'full':
        $txt.val(sel[part].gabc);
        gabc = sel[part].gabc;
        break;
      case 'psalm-tone':
        $txt.val(sel[part].text);
        gabc = getPsalmToneForPart(part);
        break;
      default:
        return;
    }
    updateChant(gabc,$preview[0],true);
    $txt.css('min-height',$preview.parents('.chant-parent').height() - $($txt.prop('labels')).height() - 3).trigger('autosize');
  }

  
  var $selDay = $('#selDay').change(selectedDay);
  $.each(sundayKeys,function(i,o){
    var $temp = $('<option>'+ o.title +'</option>');
    $temp.val(o.key);
    $selDay.append($temp);
  });
  $('textarea').autosize().keydown(internationalTextBoxKeyDown);
  $('select[id^=selStyle]').change(function(e){
    var style=this.value;
    if(this.id=='selStyle') {
      if(style!='mixed') {
        $('select[id^=selStyle]:not(#selStyle)').val(style).each(function(i,o){updateStyle(o.id.slice(8).toLowerCase(),style);});
      }
    } else {
      updateStyle(this.id.slice(8).toLowerCase(),style);
      $('select[id^=selStyle]:not(#selStyle)').each(function(i,o){if(style!=o.value){style='mixed';return false;}});
      $('#selStyle').val(style);
    }
  });
  $('#selStyle').change();
});