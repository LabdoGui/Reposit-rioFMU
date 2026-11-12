import { useEffect, useRef, type RefObject } from 'react';
import { CalendarCheck, ClipboardCheck, Medal, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  SYMBOL_DROP_PATH,
  SYMBOL_FIGURES_PATH,
  SYMBOL_VIEWBOX,
} from '@/components/brand/symbol-paths';
import { createDropRenderer, type DropRenderer } from './hero-drop';
import './hero-art.css';

/** Etiquetas que flutuam em volta da gota: o que o app faz, sem números nem pessoas fictícias. */
const CHIPS: Array<{ icon: LucideIcon; title: string; text: string; slot: 'a' | 'b' | 'c' }> = [
  { icon: ClipboardCheck, title: 'Pré-triagem', text: 'antes de sair de casa', slot: 'a' },
  { icon: CalendarCheck, title: 'Agendamento', text: 'unidade, dia e horário', slot: 'b' },
  { icon: Medal, title: 'Reconhecimento', text: 'cada doação conta', slot: 'c' },
];

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Resoluções da gota 3D, da melhor para a mais leve (ver o medidor de ritmo em useHeroMotion). */
const QUALITY_STEPS = [1, 0.6, 0.38];

/**
 * Dá vida à cena: ela acompanha o ponteiro do mouse.
 *
 * A posição do ponteiro (de -1 a 1, em relação ao centro da cena) vai para as
 * variáveis CSS --mx e --my, que inclinam a cena e deslocam cada camada conforme
 * a profundidade (hero-art.css), e para a gota 3D, que gira na mesma direção.
 * O movimento é suavizado quadro a quadro e só roda com a cena visível. Quem
 * pediu menos movimento no sistema vê a cena parada.
 */
function useHeroMotion(
  sceneRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  useEffect(() => {
    const scene = sceneRef.current;
    const canvas = canvasRef.current;
    if (!scene || !canvas) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let drop: DropRenderer | null = null;
    let started = false;
    let visible = false;
    let frame = 0;
    let last = 0;
    let time = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    // Medidor de ritmo: quadros contados, quantos atrasaram e o nível de resolução atual.
    let frames = 0;
    let slow = 0;
    let quality = 0;
    let spinning = true;

    const draw = () => {
      scene.style.setProperty('--mx', x.toFixed(4));
      scene.style.setProperty('--my', y.toFixed(4));
      if (!spinning) return;
      // Balanço lento (a gota nunca fica totalmente parada) somado à direção do ponteiro.
      drop?.render(Math.sin(time * 0.6) * 0.18 - x * 0.5, Math.sin(time * 0.45) * 0.05 - y * 0.25);
    };

    /**
     * Se o aparelho não acompanha (mais da metade dos quadros abaixo de ~30 por
     * segundo), a gota perde resolução; no último nível, ela para de girar e só
     * a cena em camadas (leve) continua acompanhando o mouse.
     */
    const watchPace = (seconds: number) => {
      frames++;
      if (frames <= 20) return; // os primeiros quadros incluem o carregamento da página
      if (seconds > 0.034) slow++;
      if (frames < 80) return;
      if (slow > 30) {
        quality++;
        if (quality < QUALITY_STEPS.length) drop?.setQuality(QUALITY_STEPS[quality]);
        else spinning = false;
      }
      frames = 20;
      slow = 0;
    };

    const tick = (now: number) => {
      if (drop && spinning) watchPace((now - last) / 1000);
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += elapsed;
      // Aproximação suave do alvo, igual em telas de 60 ou 120 quadros por segundo.
      const ease = 1 - Math.exp(-elapsed * 5);
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!started) {
        // O WebGL só é criado quando a cena aparece (em telas pequenas ela fica escondida).
        started = true;
        drop = createDropRenderer(canvas);
        if (drop) {
          drop.resize();
          scene.dataset.drop = '3d';
        }
        draw();
      }
      if (!still && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      targetX = clamp((event.clientX - rect.left - rect.width / 2) / (window.innerWidth / 2));
      targetY = clamp((event.clientY - rect.top - rect.height / 2) / (window.innerHeight / 2));
    };
    const onPointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    });
    observer.observe(scene);
    const resizer = new ResizeObserver(() => {
      drop?.resize();
      if (started) draw();
    });
    resizer.observe(canvas);
    if (!still) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      observer.disconnect();
      resizer.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      drop?.dispose();
      delete scene.dataset.drop;
    };
  }, [sceneRef, canvasRef]);
}

/**
 * Ilustração decorativa do hero: a gota do SangueConecta em 3D, flutuando entre
 * anéis e etiquetas, numa cena em camadas que acompanha o mouse. Sem WebGL, a
 * gota é o símbolo plano (SVG), e a cena se move do mesmo jeito.
 */
export function HeroArt({ className }: { className?: string }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useHeroMotion(sceneRef, canvasRef);

  return (
    <div ref={sceneRef} aria-hidden="true" className={cn('hero-scene', className)}>
      <div className="hero-scene__stage">
        <div className="hero-scene__layer hero-scene__glow" />
        <svg className="hero-scene__layer hero-scene__rings" viewBox="0 0 400 360" fill="none">
          <circle cx="200" cy="180" r="172" />
          <circle cx="200" cy="180" r="128" />
          <circle cx="200" cy="180" r="86" className="hero-scene__disc" />
        </svg>
        <div className="hero-scene__layer hero-scene__shadow" />
        <div className="hero-scene__layer hero-scene__drop">
          <div className="hero-scene__float">
            <svg className="hero-scene__flat" viewBox={SYMBOL_VIEWBOX}>
              <path d={SYMBOL_DROP_PATH} className="fill-marca-vermelho" />
              <path d={SYMBOL_FIGURES_PATH} className="fill-marca-claro" />
            </svg>
            <canvas ref={canvasRef} className="hero-scene__canvas" />
          </div>
        </div>
        <span className="hero-scene__layer hero-scene__dot hero-scene__dot--a" />
        <span className="hero-scene__layer hero-scene__dot hero-scene__dot--b" />
        <span className="hero-scene__layer hero-scene__dot hero-scene__dot--c" />
        {CHIPS.map(({ icon: Icon, title, text, slot }) => (
          <div
            key={slot}
            className={`hero-scene__layer hero-scene__chip hero-scene__chip--${slot}`}
          >
            <div className="hero-scene__float hero-scene__card">
              <span className="hero-scene__icon">
                <Icon className="size-5" />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
