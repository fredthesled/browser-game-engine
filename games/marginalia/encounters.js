// games/marginalia/encounters.js
// Encounter definitions for Marginalia.
// Depends on: nothing.
// Required by: match.js
//
// Each encounter:
//   id, name, room, desc, hp, attack, armor
//   healEvery: heal this many HP every N turns (0 = never)
//   healAmount: HP healed per interval
//   altAttackEvery: every N turns, use altAttackDmg instead (0 = never)
//   altAttackDmg: bypasses all player defense
//   altAttackMsg: flavor string for the alternate attack
//   drawFn(ctx, x, y, w, h, t): draws the enemy into the given region.
//     t = total elapsed seconds; use for subtle idle animation.

var ENCOUNTERS = [
  {
    id: 'ghost_reader',
    name: 'The Ghost Reader',
    room: 'The Reading Room',
    desc: 'It turns pages, but nothing is there.',
    hp: 14, attack: 3, armor: 0,
    healEvery: 0, healAmount: 0,
    altAttackEvery: 0, altAttackDmg: 0, altAttackMsg: '',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w / 2, cy = y + h * 0.42;
      var fl = 0.55 + Math.sin(t * 1.4) * 0.2;
      ctx.save();
      ctx.globalAlpha = fl;
      // Body
      ctx.fillStyle = '#95a5a6';
      ctx.beginPath(); ctx.ellipse(cx, cy, w*0.15, h*0.32, 0, 0, Math.PI*2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.ellipse(cx, cy - h*0.38, w*0.1, h*0.12, 0, 0, Math.PI*2); ctx.fill();
      // Book
      ctx.globalAlpha = fl * 0.7;
      ctx.fillStyle = '#d4b896';
      ctx.fillRect(cx + w*0.08, cy - h*0.06, w*0.2, h*0.16);
      ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.8;
      ctx.strokeRect(cx + w*0.08, cy - h*0.06, w*0.2, h*0.16);
      // Arms
      ctx.globalAlpha = fl * 0.5;
      ctx.strokeStyle = '#95a5a6'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - w*0.15, cy - h*0.05);
      ctx.lineTo(cx - w*0.04, cy + h*0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + w*0.15, cy - h*0.05);
      ctx.lineTo(cx + w*0.11, cy - h*0.02); ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'indexer',
    name: 'The Indexer',
    room: 'The Periodical Archives',
    desc: 'It catalogs everything, including you.',
    hp: 18, attack: 4, armor: 0,
    healEvery: 0, healAmount: 0,
    altAttackEvery: 0, altAttackDmg: 0, altAttackMsg: '',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w / 2, cy = y + h * 0.5;
      var pulse = Math.floor(t * 2) % 2;
      ctx.save();
      // Grid of card drawers
      var cols = 4, rows = 5;
      var dw = w * 0.15, dh = h * 0.1, gap = 3;
      var gw = cols * (dw + gap) - gap, gh = rows * (dh + gap) - gap;
      var ox = cx - gw/2, oy = cy - gh/2;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var dx = ox + c*(dw+gap), dy = oy + r*(dh+gap);
          var isActive = (pulse === 0 && r === 2 && c === 1) ||
                         (pulse === 1 && r === 0 && c === 3);
          ctx.fillStyle = isActive ? '#d4b896' : '#2c1a0a';
          ctx.fillRect(dx, dy, dw, dh);
          ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.5;
          ctx.strokeRect(dx, dy, dw, dh);
          if (isActive) {
            ctx.fillStyle = '#1a1008';
            ctx.fillRect(dx+2, dy+2, dw-4, dh-4);
          }
        }
      }
      // "Eye" handle on center drawer
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'censor',
    name: 'The Censor',
    room: 'The Restricted Collection',
    desc: 'It redacts on sight.',
    hp: 22, attack: 4, armor: 2,
    healEvery: 0, healAmount: 0,
    altAttackEvery: 0, altAttackDmg: 0, altAttackMsg: '',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w/2, cy = y + h*0.48;
      ctx.save();
      // Body: a black rectangular figure
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(cx - w*0.18, cy - h*0.35, w*0.36, h*0.55);
      // Head
      ctx.fillRect(cx - w*0.1, cy - h*0.5, w*0.2, h*0.18);
      // Redaction bars floating around it
      ctx.fillStyle = '#1a1008';
      var bars = [[-0.3,-0.12,0.22,0.07],[0.12,0.06,0.24,0.07],[-0.28,0.15,0.18,0.06]];
      bars.forEach(function(b, i) {
        var ox2 = Math.sin(t * 0.8 + i) * 3;
        ctx.fillRect(cx + w*b[0] + ox2, cy + h*b[1], w*b[2], h*b[3]);
      });
      // Red eyes
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(cx - w*0.055, cy - h*0.42, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + w*0.055, cy - h*0.42, 3, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'archivist',
    name: 'The Archivist',
    room: 'The Special Collections',
    desc: 'It refuses to let anything leave.',
    hp: 26, attack: 5, armor: 0,
    healEvery: 0, healAmount: 0,
    altAttackEvery: 0, altAttackDmg: 0, altAttackMsg: '',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w/2, cy = y + h*0.5;
      ctx.save();
      // Tall figure made of stacked books
      var bookDefs = [
        {bw:w*0.32,bh:h*0.09,color:'#3d2b1a',oy:-0.36},
        {bw:w*0.28,bh:h*0.09,color:'#2c1a0a',oy:-0.26},
        {bw:w*0.34,bh:h*0.09,color:'#4a3520',oy:-0.16},
        {bw:w*0.3, bh:h*0.09,color:'#2c1a0a',oy:-0.06},
        {bw:w*0.28,bh:h*0.09,color:'#3d2b1a',oy:0.04},
        {bw:w*0.36,bh:h*0.09,color:'#1a0f05',oy:0.14}
      ];
      bookDefs.forEach(function(b, i) {
        var sway = Math.sin(t * 0.5 + i * 0.4) * 2;
        ctx.fillStyle = b.color;
        ctx.fillRect(cx - b.bw/2 + sway, cy + h*b.oy, b.bw, b.bh);
        ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.5;
        ctx.strokeRect(cx - b.bw/2 + sway, cy + h*b.oy, b.bw, b.bh);
      });
      // Two bright eyes between the stacks
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.arc(cx - w*0.06, cy - h*0.06, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + w*0.06, cy - h*0.06, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  {
    id: 'borrower',
    name: 'The Borrower',
    room: 'The Reading Alcove',
    desc: 'It keeps taking without returning.',
    hp: 20, attack: 3, armor: 0,
    healEvery: 2, healAmount: 4,
    altAttackEvery: 0, altAttackDmg: 0, altAttackMsg: '',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w/2, cy = y + h*0.5;
      ctx.save();
      // Small quick figure with many arms holding books
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath(); ctx.ellipse(cx, cy, w*0.12, h*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy - h*0.34, w*0.08, h*0.1, 0, 0, Math.PI*2); ctx.fill();
      // Arms at different heights, each holding a book that bobs
      var arms = [[-0.25,-0.1,0.2,0.08],[-0.22,0.06,0.18,0.08],[0.12,-0.08,0.2,0.08],[0.1,0.1,0.16,0.08]];
      arms.forEach(function(a, i) {
        var bob = Math.sin(t * 1.2 + i * 1.1) * 3;
        ctx.fillStyle = ['#2c1a0a','#3d2b1a','#1a0f05','#4a3520'][i];
        ctx.fillRect(cx+w*a[0], cy+h*a[1]+bob, w*a[2], h*a[3]);
        ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.4;
        ctx.strokeRect(cx+w*a[0], cy+h*a[1]+bob, w*a[2], h*a[3]);
      });
      ctx.restore();
    }
  },
  {
    id: 'grand_index',
    name: 'The Grand Index',
    room: 'The Catalog',
    desc: 'Everything ever lost is here. So are you.',
    hp: 40, attack: 6, armor: 0,
    healEvery: 0, healAmount: 0,
    altAttackEvery: 3, altAttackDmg: 8,
    altAttackMsg: 'Cross-reference: ignores all defense.',
    drawFn: function(ctx, x, y, w, h, t) {
      var cx = x + w/2, cy = y + h*0.5;
      ctx.save();
      // Rotating outer ring of cards
      var numCards = 8, r = Math.min(w,h)*0.38;
      for (var i = 0; i < numCards; i++) {
        var angle = (i / numCards) * Math.PI * 2 + t * 0.3;
        var px = cx + Math.cos(angle) * r;
        var py = cy + Math.sin(angle) * r;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle + Math.PI/2);
        ctx.fillStyle = i % 2 === 0 ? '#2c1a0a' : '#1a0f05';
        ctx.fillRect(-7, -10, 14, 20);
        ctx.strokeStyle = '#8a6f4e'; ctx.lineWidth = 0.5;
        ctx.strokeRect(-7, -10, 14, 20);
        ctx.restore();
      }
      // Core: deep pulsing circle
      var pulse = 0.8 + Math.sin(t * 2) * 0.15;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#f39c12';
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w,h)*0.14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(w,h)*0.08, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
];

var ENCOUNTER_ORDER = [
  'ghost_reader','indexer','censor','archivist','borrower','grand_index'
];

function getEncounter(id) {
  return ENCOUNTERS.find(function(e) { return e.id === id; }) || null;
}
