function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf('img') > -1;
  var jeYoutube = sporocilo.indexOf('iframe') > -1;
  if (jeSmesko || jeYoutube || jeSlika) {
    sporocilo = sporocilo.replace(/\</g, '&lt;')
    .replace(/\>/g, '&gt;')
    .replace('&lt;img', '<img')
    .replace('png\' /&gt;', 'png\' />')
    .replace(/&lt;div/gi,'<div')
    .replace(/&lt;/gi,'<')
    .replace(/&lt;iframe/gi,'<iframe')
    .replace(/&lt;\/iframe&gt;/gi,'</iframe>')
    .replace(/&lt;\/div&gt;/gi,'</div>')
    .replace(/&gt;/gi,'>');

    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);

  var sistemskoSporocilo;
  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    ugotoviNaslov(sporocilo);
    ugotoviYoutube(sporocilo);
    for(var i = 0 ; i < potDoSlike.length; i++)
    {
      sporocilo += " <img style='width:200px; margin-left: 20px;' src='"+potDoSlike[i]+"' /> ";
    }

    for(var j = 0 ; j < YoutubeLinki.length; j++)
    {
      sporocilo+= " <iframe src='https://www.youtube.com/embed/"+YoutubeLinki[j]+"'  style='margin-left: 20px; width: 200px; height: 150px;' allowfullscreen></iframe>"
    }            
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    YoutubeLinki = [];
    potDoSlike=[];
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});
var YoutubeLinki= [];
function ugotoviYoutube(vhod) {
  var povezava = "https://www.youtube.com/watch?v=";
  var nizi= [];
  var stevec = 0;
  nizi = vhod.split(" ");
  for(var i in nizi) {
    if(nizi[i].substring(0,povezava.length) == povezava)
    {
      YoutubeLinki[stevec] = nizi[i].substring(povezava.length, nizi[i].length);
      stevec++;
    }
    
  }
  
}
function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);
  $('#vsebina').jrumble();
  socket.on('dregljaj', function(rezultat) {
    $("#vsebina").trigger('startRumble');
    var ustaviSe = setTimeout(function(){
      $("#vsebina").trigger('stopRumble');
       }, 1500);   
  }); 

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
     $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val("/zasebno "+$(this).text()+" ");
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});
var potDoSlike = [];
function ugotoviNaslov(vhod) {
  var nizi = [];
    nizi = vhod.split(' ');
  var stevec=0;
  for(var i = 0; i < nizi.length; i++)
  {
    if(nizi[i].substr(0,7) == "http://" || nizi[i].substr(0,8) == "https://")
    {
      var koncnica = nizi[i].substring(nizi[i].length-4, nizi[i].length);
      if(koncnica == ".png" || koncnica == ".jpg" || koncnica == ".gif")
      {
        potDoSlike[stevec] = nizi[i];
        stevec++;
      }
    }
  }
  
}
function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
