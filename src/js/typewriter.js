(function () {
  'use strict';

  var SPEED = 22;  // ms per character
  var PAUSE = 480; // ms pause between elements

  // If reduced motion, reveal everything immediately and bail
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.home-intro > *, .home-projects').forEach(function (el) {
      el.style.opacity = '1';
    });
    return;
  }

  var intro = document.querySelector('.home-intro');
  if (!intro) return;

  // Cursor element
  var cursor = document.createElement('span');
  cursor.className = 'type-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.textContent = '_';

  // Collect direct children that are text blocks or story cards
  var blocks = Array.from(intro.querySelectorAll('h1, p, .story-card'));

  // Prepare each block
  blocks.forEach(function (el) {
    if (el.classList.contains('story-card')) {
      el.style.animation = 'none'; // cancel the CSS keyframe, JS controls this
    } else {
      el.dataset.typeText = el.textContent.trim();
      el.textContent = '';
      el.style.opacity = '1'; // visible but empty — no layout shift
    }
  });

  // Keep projects hidden until typing finishes
  var projectsSection = document.querySelector('.home-projects');
  if (projectsSection) {
    projectsSection.style.opacity = '0';
    projectsSection.style.transition = 'opacity 0.6s ease';
  }

  var idx = 0;

  function next() {
    if (idx >= blocks.length) {
      // All done — remove cursor and reveal projects
      if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
      if (projectsSection) {
        setTimeout(function () {
          projectsSection.style.opacity = '1';
        }, PAUSE);
      }
      return;
    }

    var el = blocks[idx++];

    if (el.classList.contains('story-card')) {
      // Pause with cursor on previous element, then fade card in
      setTimeout(function () {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '1';
        setTimeout(next, 400);
      }, PAUSE);
    } else {
      typeBlock(el, el.dataset.typeText, next);
    }
  }

  function typeBlock(el, text, onDone) {
    var pos = 0;
    var textNode = document.createTextNode('');
    el.appendChild(textNode);
    el.appendChild(cursor); // cursor sits at end of this element while typing

    function tick() {
      if (pos < text.length) {
        textNode.nodeValue = text.slice(0, pos + 1);
        pos++;
        setTimeout(tick, SPEED);
      } else {
        // Typing done — leave cursor blinking here during pause, then hand off
        setTimeout(function () {
          el.textContent = text; // clean finalise, removes cursor node
          onDone();
        }, PAUSE);
      }
    }

    tick();
  }

  next();
}());
