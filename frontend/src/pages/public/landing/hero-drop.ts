/**
 * Gota 3D da página inicial, desenhada em WebGL num <canvas> transparente.
 *
 * Não há modelo 3D nem biblioteca: a forma é uma função matemática (a silhueta
 * da gota girada em torno do eixo vertical) e cada pixel "caminha" por um raio
 * até encostar nela (ray marching). O símbolo das duas pessoas é uma textura
 * projetada na frente da gota, e por isso gira junto com ela.
 *
 * Se o navegador não tiver WebGL 2 com aceleração por hardware, a função
 * devolve null e a página mostra o símbolo plano (SVG) no lugar.
 */
import { SYMBOL_FIGURES_PATH, SYMBOL_VIEWBOX } from '@/components/brand/symbol-paths';

const VERTEX = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uRotY;
uniform float uRotX;
uniform sampler2D uEmblem;
out vec4 o;

const float CAM_Z = 5.3;       // distância da câmera
const float TAN_HALF = 0.2493; // tangente de metade do ângulo de visão (14 graus)

mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., s, 0., 1., 0., -s, 0., c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, -s, 0., s, c); }

// Raio da gota em cada altura (y de -1, embaixo, a 1, na ponta).
float profile(float y) {
  float t = acos(clamp(y, -1., 1.));
  return 0.889 * sin(t) * pow(sin(0.5 * t), 1.3);
}

mat3 toLocal; // desfaz o giro: do mundo para o espaço da gota

// Distância (aproximada) do ponto até a superfície da gota.
float map(vec3 p) {
  vec3 q = toLocal * p;
  return max((length(q.xz) - profile(q.y)) * 0.72 - 0.006, abs(q.y) - 1.0);
}

vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1., -1.);
  const float e = 0.0015;
  return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) +
                   k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
}

// Painel de luz retangular do "estúdio" refletido na gota.
float panel(vec3 r, vec3 dir, vec2 size, float soft) {
  vec3 up = normalize(cross(dir, vec3(1., 0., 0.)));
  vec3 rt = normalize(cross(up, dir));
  float d = dot(r, dir);
  if (d <= 0.) return 0.;
  vec2 q = abs(vec2(dot(r, rt), dot(r, up)) / d) - size;
  return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}

vec3 studio(vec3 r) {
  vec3 c = mix(vec3(0.42, 0.38, 0.36), vec3(0.98, 0.96, 0.94), smoothstep(-0.35, 0.45, r.y));
  c += vec3(5.2, 5.0, 4.8) * panel(r, normalize(vec3(-0.55, 0.55, 0.62)), vec2(0.42, 0.20), 0.06);
  c += vec3(2.0, 2.2, 2.5) * panel(r, normalize(vec3(0.85, 0.15, 0.45)), vec2(0.10, 0.50), 0.05);
  c += vec3(1.6, 1.4, 1.3) * panel(r, normalize(vec3(0.0, 0.25, -1.0)), vec2(0.8, 0.18), 0.2);
  return c;
}

vec3 toneMap(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }

vec3 shade(vec3 p, vec3 rd) {
  vec3 n = normalAt(p);
  vec3 v = -rd;
  vec3 q = toLocal * p;
  vec3 nl = toLocal * n;
  // Símbolo: só na metade da frente da gota (no espaço dela, então gira junto).
  vec2 uv = vec2(q.x / 1.299 + 0.5, (1.0 - q.y) * 0.5);
  float emblem = texture(uEmblem, uv).a * smoothstep(0.05, 0.35, nl.z);
  float ndv = clamp(dot(n, v), 0., 1.);
  vec3 key = normalize(vec3(-0.55, 0.75, 0.6));
  vec3 fill = normalize(vec3(0.9, 0.2, 0.4));
  vec3 back = normalize(vec3(0.25, 0.35, -1.0));
  vec3 albedo = mix(vec3(0.40, 0.004, 0.008), vec3(0.80, 0.79, 0.81), emblem);
  float d1 = clamp((dot(n, key) + 0.15) / 1.15, 0., 1.);
  d1 = d1 * d1 * (3.0 - 2.0 * d1);
  float d2 = clamp((dot(n, fill) + 0.1) / 1.1, 0., 1.);
  vec3 col = albedo * (0.10 + 1.15 * d1 * vec3(1.0, 0.97, 0.94) + 0.30 * d2 * vec3(0.85, 0.9, 1.0));
  // Luz atravessando o líquido: bordas e parte de baixo mais vivas.
  float thin = pow(1.0 - ndv, 2.2);
  float through = pow(clamp(dot(v, -back) * 0.5 + 0.5, 0., 1.), 2.0);
  col += (1.0 - emblem) * vec3(0.85, 0.03, 0.05) * (0.45 * thin + 0.30 * through * thin);
  float under = clamp(dot(n, normalize(vec3(0.2, -0.9, 0.4))) * 0.5 + 0.5, 0., 1.);
  col += (1.0 - emblem) * vec3(0.75, 0.02, 0.04) * pow(under, 3.0) * 0.35;
  // Reflexo do estúdio e brilhos (superfície envernizada).
  float fresnel = 0.045 + 0.955 * pow(1.0 - ndv, 5.0);
  col += studio(reflect(rd, n)) * mix(fresnel * 0.95 + 0.022, fresnel * 0.5 + 0.02, emblem);
  col += vec3(1.0) * pow(clamp(dot(n, normalize(key + v)), 0., 1.), 220.0) * 2.2;
  col += vec3(0.9, 0.95, 1.0) * pow(clamp(dot(n, normalize(fill + v)), 0., 1.), 90.0) * 0.6;
  return col;
}

void main() {
  toLocal = transpose(rotY(uRotY) * rotX(uRotX));
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  vec3 ro = vec3(0., 0., CAM_Z);
  vec3 rd = normalize(vec3(uv * TAN_HALF, -1.0));
  o = vec4(0.0);
  // A gota cabe numa esfera de raio 1,03: fora dela o pixel fica transparente.
  float b = dot(ro, rd);
  float disc = b * b - (dot(ro, ro) - 1.03 * 1.03);
  if (disc <= 0.0) return;
  float s = sqrt(disc);
  float t = max(-b - s, 0.0);
  float tEnd = -b + s;
  float nearest = 1e9;
  float tNearest = t;
  bool hit = false;
  for (int i = 0; i < 72; i++) {
    float d = map(ro + rd * t);
    if (d < nearest) { nearest = d; tNearest = t; }
    if (d < 0.0006 * t) { hit = true; break; }
    t += d;
    if (t > tEnd) break;
  }
  // Borda suave: o pixel que passa raspando entra com transparência parcial.
  float pixel = t * 2.0 * TAN_HALF / uRes.y;
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, pixel * 0.9, nearest);
  if (alpha <= 0.0) return;
  vec3 col = pow(toneMap(shade(ro + rd * (hit ? t : tNearest), rd) * 0.92), vec3(1.0 / 2.2));
  o = vec4(col * alpha, alpha);
}`;

export interface DropRenderer {
  /** Desenha a gota girada (ângulos em radianos). */
  render(rotY: number, rotX: number): void;
  /** Ajusta a resolução ao tamanho do canvas na tela. */
  resize(): void;
  /** Fração da resolução (1 = total). Serve para aliviar aparelhos lentos. */
  setQuality(quality: number): void;
  dispose(): void;
}

/** Textura do símbolo (as duas pessoas), desenhada a partir do mesmo traçado do logotipo. */
function emblemCanvas(): HTMLCanvasElement | null {
  const [, , viewWidth, viewHeight] = SYMBOL_VIEWBOX.split(' ').map(Number);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * viewHeight) / viewWidth);
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof Path2D === 'undefined') return null;
  ctx.scale(canvas.width / viewWidth, canvas.height / viewHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fill(new Path2D(SYMBOL_FIGURES_PATH));
  return canvas;
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

export function createDropRenderer(canvas: HTMLCanvasElement): DropRenderer | null {
  // Sem placa de vídeo (renderização por software), o WebGL ficaria lento: melhor o símbolo plano.
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    failIfMajorPerformanceCaveat: true,
  });
  const emblem = emblemCanvas();
  if (!gl || !emblem) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Um triângulo que cobre a tela inteira: o desenho todo acontece no fragment shader.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emblem);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(gl.getUniformLocation(program, 'uEmblem'), 0);

  const uRes = gl.getUniformLocation(program, 'uRes');
  const uRotY = gl.getUniformLocation(program, 'uRotY');
  const uRotX = gl.getUniformLocation(program, 'uRotX');

  let quality = 1;

  function resize() {
    // Até 2x a resolução da tela: nítido em telas retina sem pesar na placa de vídeo.
    const scale = Math.min(window.devicePixelRatio || 1, 2) * quality;
    const width = Math.max(1, Math.round(canvas.clientWidth * scale));
    const height = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  return {
    resize,
    setQuality(value) {
      quality = value;
      resize();
    },
    render(rotY, rotX) {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uRotY, rotY);
      gl.uniform1f(uRotX, rotX);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
