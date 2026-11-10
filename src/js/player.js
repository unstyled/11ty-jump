(function () {
  var dataEl = document.getElementById("listen-data");
  var root = document.querySelector("[data-player]");
  if (!dataEl || !root) return;

  var data = JSON.parse(dataEl.textContent);
  var episodes = [];
  data.shows.forEach(function (show) {
    show.episodes.forEach(function (ep) {
      episodes.push(Object.assign({}, ep, { show: show }));
    });
  });

  var SPEEDS = [1, 1.25, 1.5, 2, 0.75];
  var state = { index: 0, time: 0, playing: false, speed: 1, tab: "chapters" };
  var audio = new Audio();
  audio.preload = "metadata";
  var timer = null;
  var lastTick = 0;

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = String(s % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + sec : m + ":" + sec;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function current() { return episodes[state.index]; }
  function hasAudio(ep) { return !!ep.audio; }
  function duration(ep) { return hasAudio(ep) && audio.duration ? audio.duration : ep.duration; }

  function activeIndex(list, key, t) {
    var idx = 0;
    for (var i = 0; i < list.length; i++) { if (list[i][key] <= t) idx = i; else break; }
    return idx;
  }

  // --- playback (real audio when `audio` is set, otherwise a simulated clock) ---
  function startClock() {
    stopClock();
    lastTick = performance.now();
    timer = setInterval(function () {
      var now = performance.now();
      state.time += ((now - lastTick) / 1000) * state.speed;
      lastTick = now;
      if (state.time >= current().duration) { state.time = current().duration; ended(); return; }
      update();
    }, 250);
  }
  function stopClock() { if (timer) clearInterval(timer); timer = null; }

  function play() {
    var ep = current();
    state.playing = true;
    if (hasAudio(ep)) {
      audio.playbackRate = state.speed;
      audio.play().catch(function () { state.playing = false; render(); });
    } else {
      startClock();
    }
    render();
  }
  function pause() {
    state.playing = false;
    audio.pause();
    stopClock();
    render();
  }
  function seek(t) {
    var ep = current();
    state.time = Math.min(Math.max(0, t), duration(ep));
    if (hasAudio(ep)) audio.currentTime = state.time;
    update();
  }
  function ended() {
    stopClock();
    if (state.index < episodes.length - 1) load(state.index + 1, true);
    else { state.playing = false; state.time = 0; render(); }
  }
  function load(i, autoplay) {
    pause();
    state.index = i;
    state.time = 0;
    var ep = current();
    if (hasAudio(ep)) { audio.src = ep.audio; } else { audio.removeAttribute("src"); }
    mediaSession();
    render();
    if (autoplay) play();
  }

  audio.addEventListener("timeupdate", function () {
    if (hasAudio(current())) { state.time = audio.currentTime; update(); }
  });
  audio.addEventListener("loadedmetadata", update);
  audio.addEventListener("ended", ended);

  function mediaSession() {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    var ep = current();
    navigator.mediaSession.metadata = new MediaMetadata({ title: ep.title, artist: ep.show.name });
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("seekbackward", function () { seek(state.time - 15); });
    navigator.mediaSession.setActionHandler("seekforward", function () { seek(state.time + 30); });
  }

  // --- rendering ---
  var refs = {};

  function button(label, cls, onClick, text) {
    var b = el("button", cls, text);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }

  function render() {
    var ep = current();
    root.hidden = false;
    root.textContent = "";
    root.style.setProperty("--art", ep.show.colour);

    var top = el("div", "player__top");
    var art = el("div", "art art--lg" + (state.playing ? " is-playing" : ""), ep.show.initials);
    art.setAttribute("aria-hidden", "true");
    var bars = el("span", "art__bars");
    for (var b = 0; b < 4; b++) bars.appendChild(el("i"));
    art.appendChild(bars);

    var info = el("div", "player__info");
    info.appendChild(el("p", "player__show", ep.show.name + " · Episode " + ep.number));
    info.appendChild(el("h2", "player__title", ep.title));
    refs.chapter = el("p", "player__chapter");
    info.appendChild(refs.chapter);
    top.appendChild(art);
    top.appendChild(info);
    root.appendChild(top);

    // scrubber with chapter ticks
    var scrub = el("div", "scrubber");
    refs.range = el("input", "scrubber__range");
    refs.range.type = "range";
    refs.range.min = 0;
    refs.range.max = duration(ep);
    refs.range.step = 1;
    refs.range.value = state.time;
    refs.range.setAttribute("aria-label", "Seek");
    refs.range.addEventListener("input", function () { seek(Number(refs.range.value)); });
    var ticks = el("div", "scrubber__ticks");
    ep.chapters.forEach(function (c, i) {
      if (!i) return;
      var tick = el("span", "scrubber__tick");
      tick.style.left = (c.start / duration(ep)) * 100 + "%";
      ticks.appendChild(tick);
    });
    scrub.appendChild(ticks);
    scrub.appendChild(refs.range);
    root.appendChild(scrub);

    var times = el("div", "player__times");
    refs.now = el("span", null, fmt(state.time));
    refs.left = el("span");
    times.appendChild(refs.now);
    times.appendChild(refs.left);
    root.appendChild(times);

    // controls
    var controls = el("div", "player__controls");
    controls.appendChild(button("Previous episode", "ctl", function () { if (state.index > 0) load(state.index - 1, state.playing); }, "⏮"));
    controls.appendChild(button("Back 15 seconds", "ctl", function () { seek(state.time - 15); }, "−15"));
    refs.play = button(state.playing ? "Pause" : "Play", "ctl ctl--play", function () { state.playing ? pause() : play(); }, state.playing ? "❚❚" : "▶");
    controls.appendChild(refs.play);
    controls.appendChild(button("Forward 30 seconds", "ctl", function () { seek(state.time + 30); }, "+30"));
    controls.appendChild(button("Next episode", "ctl", function () { if (state.index < episodes.length - 1) load(state.index + 1, state.playing); }, "⏭"));
    controls.appendChild(button("Playback speed", "ctl ctl--speed", function () {
      state.speed = SPEEDS[(SPEEDS.indexOf(state.speed) + 1) % SPEEDS.length];
      audio.playbackRate = state.speed;
      this.textContent = state.speed + "×";
    }, state.speed + "×"));
    root.appendChild(controls);

    // tabs
    var tabs = el("div", "tabs");
    tabs.setAttribute("role", "tablist");
    ["chapters", "transcript", "about"].forEach(function (name) {
      var t = el("button", "tabs__tab", name.charAt(0).toUpperCase() + name.slice(1));
      t.type = "button";
      t.setAttribute("role", "tab");
      t.setAttribute("aria-selected", state.tab === name);
      t.addEventListener("click", function () { state.tab = name; render(); });
      tabs.appendChild(t);
    });
    root.appendChild(tabs);

    refs.panel = el("div", "panel");
    refs.panel.setAttribute("role", "tabpanel");
    refs.rows = [];
    if (state.tab === "chapters") {
      ep.chapters.forEach(function (c) {
        var row = el("button", "row");
        row.type = "button";
        row.appendChild(el("span", "row__time", fmt(c.start)));
        row.appendChild(el("span", "row__text", c.title));
        row.addEventListener("click", function () { seek(c.start); if (!state.playing) play(); });
        refs.panel.appendChild(row);
        refs.rows.push(row);
      });
    } else if (state.tab === "transcript") {
      ep.transcript.forEach(function (l) {
        var row = el("button", "row row--line");
        row.type = "button";
        row.appendChild(el("span", "row__time", fmt(l.t)));
        row.appendChild(el("span", "row__text", l.text));
        row.addEventListener("click", function () { seek(l.t); });
        refs.panel.appendChild(row);
        refs.rows.push(row);
      });
    } else {
      refs.panel.appendChild(el("p", "panel__about", ep.summary));
      refs.panel.appendChild(el("p", "panel__about panel__about--muted", ep.show.tagline));
    }
    root.appendChild(refs.panel);

    document.querySelectorAll("[data-episode]").forEach(function (b) {
      b.classList.toggle("is-current", b.getAttribute("data-episode") === ep.id);
    });
    update();
  }

  function update() {
    var ep = current();
    var d = duration(ep);
    if (!refs.range) return;
    refs.range.value = state.time;
    refs.range.style.setProperty("--progress", (state.time / d) * 100 + "%");
    refs.now.textContent = fmt(state.time);
    refs.left.textContent = "−" + fmt(d - state.time);
    refs.chapter.textContent = ep.chapters[activeIndex(ep.chapters, "start", state.time)].title;

    var list = state.tab === "chapters" ? ep.chapters : state.tab === "transcript" ? ep.transcript : null;
    if (!list) return;
    var key = state.tab === "chapters" ? "start" : "t";
    var active = activeIndex(list, key, state.time);
    refs.rows.forEach(function (row, i) {
      var on = i === active;
      if (on && !row.classList.contains("is-active") && state.playing && state.tab === "transcript") {
        refs.panel.scrollTo({ top: row.offsetTop - refs.panel.clientHeight / 3, behavior: "smooth" });
      }
      row.classList.toggle("is-active", on);
    });
  }

  document.querySelectorAll("[data-episode]").forEach(function (b) {
    b.addEventListener("click", function () {
      var i = episodes.findIndex(function (e) { return e.id === b.getAttribute("data-episode"); });
      if (i === state.index) { state.playing ? pause() : play(); } else { load(i, true); }
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space" || /^(INPUT|BUTTON|TEXTAREA)$/.test(e.target.tagName)) return;
    e.preventDefault();
    state.playing ? pause() : play();
  });

  load(0, false);
})();
