var CanvasVideoPlayer = function(options) {
  
  var self = this;
  var i;

  this.options = {
    framesPerSecond: 25,
    hideVideo: true,
  };

  for (i in options) {
    this.options[i] = options[i];
  }
  
  this.canvas = document.querySelectorAll(this.options.canvasSelector)[0];

  if (!this.options.videoSelector) {
    console.error('No "videoSelector" property, or the element is not found');
    return;
  }

  if (!this.options.canvasSelector || !this.canvas) {
    console.error('No "canvasSelector" property, or the element is not found');
    return;
  }
  
  var videoelement = document.createElement("video");
  videoelement.setAttribute("id", "video1");
  videoelement.setAttribute("class", "video js-video");
  videoelement.setAttribute("muted", true);
  var sourceWEBM = document.createElement("source"); 
  sourceWEBM.type = "video/mp4";
  sourceWEBM.src = options.videoUrl;
  videoelement.appendChild(sourceWEBM);
  
  document.querySelectorAll(this.options.videoSelector)[0].appendChild(videoelement);
  this.video = document.getElementById('video1');
  
  this.ctx = this.canvas.getContext('2d');

  this.playing = false;

  this.resizeTimeoutReference = false;
  this.RESIZE_TIMEOUT = 1000;

  if (typeof AudioContext !== "undefined") {
    this.audioCtx = new AudioContext();
  } 
  else if (typeof webkitAudioContext !== "undefined") {
    this.audioCtx = new webkitAudioContext();
  } 
  else {
    throw new Error('AudioContext not supported. :(');
  }
  
  this.audioSource;  
  this.audioBuffer;
  this.audioAnalyzer = this.audioCtx .createAnalyser();
  this.loadAudio (options.audioUrl, function (err) {
    if (err) {
      alert ("Error loading audio: ", err);
    }
    else {
      
      self.audioSource.connect (self.audioAnalyzer);
      self.audioAnalyzer.connect (self.audioCtx.destination);
      
      self.init();
      self.bind();
    }
  });
  
};

CanvasVideoPlayer.prototype.init = function() {
  this.video.load();

  this.setCanvasSize();

  if (this.options.hideVideo) {
    this.video.style.display = 'none';
  }
};

CanvasVideoPlayer.prototype.loadAudio = function (url, callback) {
 
  // Load buffer asynchronously
  var self = this;
  var request = new XMLHttpRequest();
  request.open ("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    self.audioCtx.decodeAudioData (
      request.response,
      function (buffer) {
        if (!buffer) {
            alert('error decoding file data: ' + url);
            return;
        }
        self.audioBuffer        = buffer;
        self.audioSource        = self.audioCtx.createBufferSource();
        self.audioSource.buffer = self.audioBuffer;
        callback (null);
        console.log ("Audio loaded");
      }
    );
  }

  request.onprogress = function (evt) {
    if (evt.lengthComputable) {
      console.log  ("Loading..."+evt.loaded+" / "+evt.total);
    }
  }

  request.onerror = function(e) {
    callback (e);    
  }

  request.send();
  
}

CanvasVideoPlayer.prototype.bind = function() {
  var self = this;

  // Playes or pauses video on canvas click
  this.canvas.addEventListener('click', function canvasClickHandler() {
    self.playPause();
  });

  // On every time update draws frame
  this.video.addEventListener('timeupdate', function videoTimeUpdateHandler() {
    self.drawFrame();
  });

  // Draws first frame
  this.video.addEventListener('canplay', function videoCanPlayHandler() {
    self.drawFrame();
  });

  // Cache canvas size on resize (doing it only once in a second)
  window.addEventListener('resize', function windowResizeHandler() {
    clearTimeout(self.resizeTimeoutReference);

    self.resizeTimeoutReference = setTimeout(function() {
      self.setCanvasSize();
      self.drawFrame();
    }, self.RESIZE_TIMEOUT);
  });

  this.unbind = function() {
    this.canvas.removeEventListener('click', canvasClickHandler);
    this.video.removeEventListener('timeupdate', videoTimeUpdateHandler);
    this.video.removeEventListener('canplay', videoCanPlayHandler);
    window.removeEventListener('resize', windowResizeHandler);
  };
};

CanvasVideoPlayer.prototype.setCanvasSize = function(first_argument) {
  this.width = this.canvas.clientWidth;
  this.height = this.canvas.clientHeight;

  this.canvas.setAttribute('width', this.width);
  this.canvas.setAttribute('height', this.height);
};

CanvasVideoPlayer.prototype.play = function() {
  this.lastTime = Date.now();
  this.playing = true;
  this.audioSource.start();
  this.loop();
};

CanvasVideoPlayer.prototype.pause = function() {
  this.playing = false;
  this.audioSource.stop();
};

CanvasVideoPlayer.prototype.playPause = function() {
  if (this.playing) {
    this.pause();
  }
  else {    
    this.play();
  }
};

CanvasVideoPlayer.prototype.loop = function() {
  var self = this;

  var time = Date.now();
  var elapsed = (time - this.lastTime) / 1000;

  // Render
  if(elapsed >= (1 / this.options.framesPerSecond)) {
    //this.video.currentTime = this.video.currentTime + elapsed;
    this.lastTime = time;
    this.video.currentTime = this.audioCtx.currentTime;
  }

  // If we are at the end of the video stop
  if (this.video.currentTime >= this.video.duration) {
    this.playing = false;
  }

  if (this.playing) {    
    this.animationFrame = requestAnimationFrame(function(){
      self.loop();
    });
  }
  else {
    cancelAnimationFrame(this.animationFrame);
  }
};

CanvasVideoPlayer.prototype.drawFrame = function() {
  this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
};
