/**
 * Interactive Circuit Board Canvas Animation
 * Renders glowing PCB circuit traces, microprocessor IC nodes, and pulsing electron packets
 */
(function() {
  const canvas = document.getElementById('circuit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width, height;
  let nodes = [];
  let traces = [];
  let pulses = [];
  let mouse = { x: -1000, y: -1000, radius: 150 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initCircuit();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  class Node {
    constructor(x, y, type = 'normal') {
      this.x = x;
      this.y = y;
      this.type = type; // 'normal', 'chip', 'via'
      this.radius = type === 'chip' ? 6 : type === 'via' ? 3 : 2;
      this.color = type === 'chip' ? '#00f0ff' : type === 'via' ? '#a855f7' : '#334155';
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      if (this.type === 'chip') {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  class Trace {
    constructor(startNode, endNode, color = 'rgba(30, 41, 59, 0.4)') {
      this.start = startNode;
      this.end = endNode;
      this.color = color;
      this.width = 1.5;
    }

    draw() {
      ctx.beginPath();
      ctx.moveTo(this.start.x, this.start.y);

      // PCB 45-degree or 90-degree trace routing
      const midX = this.end.x;
      const midY = this.start.y;
      ctx.lineTo(midX, midY);
      ctx.lineTo(this.end.x, this.end.y);

      // Distance to mouse for interactive glow
      const dist = Math.hypot((this.start.x + this.end.x) / 2 - mouse.x, (this.start.y + this.end.y) / 2 - mouse.y);
      if (dist < mouse.radius) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  class Pulse {
    constructor(trace) {
      this.trace = trace;
      this.progress = 0;
      this.speed = 0.005 + Math.random() * 0.01;
      const colors = ['#00f0ff', '#a855f7', '#f59e0b', '#10b981', '#ec4899'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = 2.5;
    }

    update() {
      this.progress += this.speed;
      if (this.progress > 1) {
        this.progress = 0;
      }
    }

    draw() {
      const p = this.progress;
      let px, py;
      const midX = this.trace.end.x;
      const midY = this.trace.start.y;

      if (p < 0.5) {
        // traveling along horizontal trace
        const subP = p / 0.5;
        px = this.trace.start.x + (midX - this.trace.start.x) * subP;
        py = this.trace.start.y;
      } else {
        // traveling along vertical trace
        const subP = (p - 0.5) / 0.5;
        px = midX;
        py = midY + (this.trace.end.y - midY) * subP;
      }

      ctx.beginPath();
      ctx.arc(px, py, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function initCircuit() {
    nodes = [];
    traces = [];
    pulses = [];

    const gridSize = 80;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);

    // Create sparse grid nodes
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (Math.random() > 0.45) {
          const x = i * gridSize + (Math.random() * 30 - 15);
          const y = j * gridSize + (Math.random() * 30 - 15);
          const type = Math.random() > 0.85 ? 'chip' : Math.random() > 0.5 ? 'via' : 'normal';
          nodes.push(new Node(x, y, type));
        }
      }
    }

    // Connect adjacent nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < gridSize * 1.6 && Math.random() > 0.4) {
          const trace = new Trace(nodes[i], nodes[j]);
          traces.push(trace);
          if (Math.random() > 0.65) {
            pulses.push(new Pulse(trace));
          }
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    for (let trace of traces) {
      trace.draw();
    }

    for (let node of nodes) {
      node.draw();
    }

    for (let pulse of pulses) {
      pulse.update();
      pulse.draw();
    }

    requestAnimationFrame(animate);
  }

  resize();
  animate();
})();
