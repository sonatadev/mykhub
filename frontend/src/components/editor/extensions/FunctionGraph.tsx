import { useEffect, useMemo, useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { compile, formatTick, latexToExpression, niceStep, pathFor, type View } from '@/lib/plot';
import MathField from '../MathField';
import { renderMath } from './MathBlock';
import { cn } from '@/lib/utils';

/**
 * A plotted function, drawn to look like the screenshot of a graphing app it
 * replaces: white paper, a pale grid, black axes with numbers, one coloured
 * curve per function. Everything is computed in the browser from the
 * expression, so the note stays small and stays searchable.
 */

const CURVES = 4;
const DEFAULT_VIEW: View = { xMin: -6, xMax: 6, yMin: -4, yMax: 4 };

/** The functions of a graph, kept in one attribute as `;`-separated LaTeX. */
function splitExpressions(value: string) {
  return value.split(';').map((part) => part.trim());
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    functionGraph: {
      /** Drop a graph into the page, ready to have its function typed in. */
      insertFunctionGraph: (expressions?: string) => ReturnType;
    };
  }
}

interface GraphAttrs {
  expressions: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
}

function readView(attrs: GraphAttrs): View {
  const view = { xMin: attrs.xMin, xMax: attrs.xMax, yMin: attrs.yMin, yMax: attrs.yMax };
  return Number.isFinite(view.xMin) && view.xMax > view.xMin && view.yMax > view.yMin ? view : DEFAULT_VIEW;
}

function GraphSvg({ expressions, view, width, height }: { expressions: string; view: View; width: number; height: number }) {
  const parts = splitExpressions(expressions).filter(Boolean);

  const toX = (x: number) => ((x - view.xMin) / (view.xMax - view.xMin)) * width;
  const toY = (y: number) => height - ((y - view.yMin) / (view.yMax - view.yMin)) * height;

  const stepX = niceStep(view.xMax - view.xMin, Math.max(4, Math.round(width / 90)));
  const stepY = niceStep(view.yMax - view.yMin, Math.max(3, Math.round(height / 70)));
  const ticksX: number[] = [];
  for (let v = Math.ceil(view.xMin / stepX) * stepX; v <= view.xMax; v += stepX) ticksX.push(v);
  const ticksY: number[] = [];
  for (let v = Math.ceil(view.yMin / stepY) * stepY; v <= view.yMax; v += stepY) ticksY.push(v);

  // The axes stay visible along the edge when the origin is out of view.
  const axisY = Math.min(Math.max(toY(0), 0), height);
  const axisX = Math.min(Math.max(toX(0), 0), width);

  const curves = parts.map((part, index) => {
    const fn = compile(latexToExpression(part));
    return { index, d: fn ? pathFor(fn, view, width, height) : '' };
  });

  return (
    <svg
      className="function-graph__svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={parts.length ? `Grafico di ${parts.join(', ')}` : 'Grafico vuoto'}
    >
      <rect className="fg-paper" x={0} y={0} width={width} height={height} />

      <g className="fg-grid" strokeWidth={1}>
        {ticksX.map((v) => (
          <line key={`gx${v}`} x1={toX(v)} y1={0} x2={toX(v)} y2={height} />
        ))}
        {ticksY.map((v) => (
          <line key={`gy${v}`} x1={0} y1={toY(v)} x2={width} y2={toY(v)} />
        ))}
      </g>

      <g className="fg-axis" strokeWidth={1.2}>
        <line x1={0} y1={axisY} x2={width} y2={axisY} />
        <line x1={axisX} y1={0} x2={axisX} y2={height} />
      </g>
      <g className="fg-axis-fill">
        <polygon points={`${width},${axisY} ${width - 7},${axisY - 3.5} ${width - 7},${axisY + 3.5}`} />
        <polygon points={`${axisX},0 ${axisX - 3.5},7 ${axisX + 3.5},7`} />
      </g>

      <g className="fg-labels" fontSize={11} fontFamily="ui-sans-serif, system-ui, sans-serif">
        {ticksX.map((v) =>
          Math.abs(v) < stepX / 1000 || toX(v) < 14 || toX(v) > width - 14 ? null : (
            <g key={`tx${v}`}>
              <line className="fg-axis" x1={toX(v)} y1={axisY - 3} x2={toX(v)} y2={axisY + 3} strokeWidth={1.2} />
              <text x={toX(v)} y={Math.min(axisY + 15, height - 3)} textAnchor="middle">
                {formatTick(v, stepX)}
              </text>
            </g>
          )
        )}
        {ticksY.map((v) =>
          Math.abs(v) < stepY / 1000 || toY(v) < 12 || toY(v) > height - 8 ? null : (
            <g key={`ty${v}`}>
              <line className="fg-axis" x1={axisX - 3} y1={toY(v)} x2={axisX + 3} y2={toY(v)} strokeWidth={1.2} />
              <text x={Math.max(axisX - 6, 4)} y={toY(v) + 3.5} textAnchor="end">
                {formatTick(v, stepY)}
              </text>
            </g>
          )
        )}
        <text x={width - 12} y={axisY - 7} textAnchor="end" fontStyle="italic">
          x
        </text>
        <text x={axisX + 8} y={12} fontStyle="italic">
          y
        </text>
      </g>

      {curves.map((curve) =>
        curve.d ? (
          <path
            key={curve.index}
            className={`fg-curve fg-curve--${curve.index % CURVES}`}
            d={curve.d}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null
      )}
    </svg>
  );
}

function FunctionGraphView({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const attrs = node.attrs as GraphAttrs;
  const parts = splitExpressions(attrs.expressions);
  // Which field to put the caret in: the one just added, and nothing on load.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [view, setView] = useState<View>(() => readView(attrs));
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null);
  // Where the pan has got to. State lags a render behind the gesture, and it
  // is this value that has to be written to the document when it ends.
  const liveView = useRef(view);
  liveView.current = view;
  const editable = editor.isEditable;

  // Attribute changes from elsewhere (a reload, a collaborator) win while the
  // reader is not the one panning.
  const attrsView = readView(attrs);
  const attrsKey = `${attrsView.xMin},${attrsView.xMax},${attrsView.yMin},${attrsView.yMax}`;
  const lastKey = useRef(attrsKey);
  if (attrsKey !== lastKey.current && !dragRef.current) {
    lastKey.current = attrsKey;
    if (attrsKey !== `${view.xMin},${view.xMax},${view.yMin},${view.yMax}`) setView(attrsView);
  }

  const width = Math.max(220, Math.round(attrs.width || 520));
  const height = Math.max(160, Math.round(attrs.height || 320));

  function commitView(next: View) {
    setView(next);
    updateAttributes({ xMin: next.xMin, xMax: next.xMax, yMin: next.yMin, yMax: next.yMax });
    lastKey.current = `${next.xMin},${next.xMax},${next.yMin},${next.yMax}`;
  }

  function zoom(factor: number, centre?: { x: number; y: number }) {
    const cx = centre?.x ?? (view.xMin + view.xMax) / 2;
    const cy = centre?.y ?? (view.yMin + view.yMax) / 2;
    commitView({
      xMin: cx + (view.xMin - cx) * factor,
      xMax: cx + (view.xMax - cx) * factor,
      yMin: cy + (view.yMin - cy) * factor,
      yMax: cy + (view.yMax - cy) * factor,
    });
  }

  function onPointerDown(event: React.PointerEvent) {
    if (!editable || event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, view };
    // Capture on the frame, not on whatever bit of the drawing was under the
    // pointer: the drawing is redrawn as the view moves, and a captured
    // element that gets replaced stops receiving the rest of the gesture.
    frameRef.current?.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((event.clientX - drag.x) / width) * (drag.view.xMax - drag.view.xMin);
    const dy = ((event.clientY - drag.y) / height) * (drag.view.yMax - drag.view.yMin);
    const next = {
      xMin: drag.view.xMin - dx,
      xMax: drag.view.xMax - dx,
      yMin: drag.view.yMin + dy,
      yMax: drag.view.yMax + dy,
    };
    liveView.current = next;
    setView(next);
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    // Written to the document once, at the end of the gesture, rather than on
    // every frame of it.
    commitView(liveView.current);
  }

  // Registered by hand rather than as a prop: React's wheel listener is
  // passive, so it cannot stop the page scrolling behind the zoom.
  const zoomRef = useRef<(event: WheelEvent) => void>();
  zoomRef.current = (event: WheelEvent) => {
    if (!editable) return;
    event.preventDefault();
    const rect = frameRef.current?.getBoundingClientRect();
    const factor = event.deltaY > 0 ? 1.15 : 1 / 1.15;
    if (!rect) return zoom(factor);
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    zoom(factor, {
      x: view.xMin + px * (view.xMax - view.xMin),
      y: view.yMax - py * (view.yMax - view.yMin),
    });
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => zoomRef.current?.(event);
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => frame.removeEventListener('wheel', onWheel);
  }, []);

  const svg = useMemo(
    () => <GraphSvg expressions={attrs.expressions} view={view} width={width} height={height} />,
    [attrs.expressions, view, width, height]
  );

  return (
    <NodeViewWrapper className="function-graph" data-type="function-graph">
      <div className={cn('function-graph__box', selected && 'function-graph__box--selected')}>
        <div
          ref={frameRef}
          className={cn('function-graph__frame', !editable && 'function-graph__frame--static')}
          style={{ width: `${width}px`, height: `${height}px` }}
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          // Belt and braces with the node's own `draggable: false`: a drag
          // starting here pans the graph, and the browser's drag would cancel
          // the gesture after its first movement.
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseUp={() => {
            // The frame is resized with the CSS handle; store the new size.
            const el = frameRef.current;
            if (!el || !editable) return;
            const w = Math.round(el.getBoundingClientRect().width);
            const h = Math.round(el.getBoundingClientRect().height);
            if (Math.abs(w - width) > 2 || Math.abs(h - height) > 2) updateAttributes({ width: w, height: h });
          }}
        >
          {svg}
          {/* The legend is real maths, drawn over the plot the way a graphing
              app labels its curves — and it prints and shares with it. */}
          {parts.some(Boolean) && (
            <div className="function-graph__legend" aria-hidden="true">
              {parts.map((part, index) =>
                part ? (
                  <div
                    key={index}
                    className={`fg-curve--${index % CURVES}`}
                    dangerouslySetInnerHTML={{
                      __html: renderMath(`f${parts.length > 1 ? `_{${index + 1}}` : ''}(x) = ${part}`, false),
                    }}
                  />
                ) : null
              )}
            </div>
          )}
        </div>

        {editable && (
          <div className="function-graph__controls" contentEditable={false}>
            <div className="function-graph__functions">
              {parts.map((part, index) => (
                <div key={index} className="function-graph__row">
                  <span className={`function-graph__dot fg-curve--${index % CURVES}`} aria-hidden="true" />
                  <span className="function-graph__fx">f{parts.length > 1 ? index + 1 : ''}(x) =</span>
                  <div className="function-graph__field">
                    <MathField
                      value={part}
                      autoFocus={focusIndex === index}
                      onChange={(latex) => {
                        const next = [...parts];
                        next[index] = latex;
                        updateAttributes({ expressions: next.join(';') });
                      }}
                      onLeave={() => setFocusIndex(null)}
                    />
                  </div>
                  {parts.length > 1 && (
                    <button
                      type="button"
                      title="Togli questa funzione"
                      aria-label="Togli questa funzione"
                      onClick={() => updateAttributes({ expressions: parts.filter((_, i) => i !== index).join(';') })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {parts.length < CURVES && (
                <button
                  type="button"
                  className="function-graph__add"
                  onClick={() => {
                    setFocusIndex(parts.length);
                    updateAttributes({ expressions: [...parts, ''].join(';') });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> funzione
                </button>
              )}
            </div>
            <div className="function-graph__view">
            <button type="button" title="Ingrandisci" aria-label="Ingrandisci" onClick={() => zoom(1 / 1.3)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Rimpicciolisci" aria-label="Rimpicciolisci" onClick={() => zoom(1.3)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Vista iniziale"
              aria-label="Vista iniziale"
              onClick={() => commitView(DEFAULT_VIEW)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button type="button" title="Elimina il grafico" aria-label="Elimina il grafico" onClick={() => deleteNode()}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function numberAttr(name: string, fallback: number) {
  return {
    default: fallback,
    parseHTML: (element: HTMLElement) => {
      const raw = Number(element.getAttribute(`data-${name}`));
      return Number.isFinite(raw) ? raw : fallback;
    },
    renderHTML: (attributes: Record<string, unknown>) => ({ [`data-${name}`]: String(attributes[name]) }),
  };
}

export const FunctionGraph = Node.create({
  name: 'functionGraph',
  group: 'block',
  atom: true,
  selectable: true,
  // Not draggable in the document: dragging inside the frame pans the graph,
  // and the browser's own drag would swallow that gesture after one frame.
  draggable: false,

  addAttributes() {
    return {
      expressions: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-expressions') ?? '',
        renderHTML: (attributes) => ({ 'data-expressions': attributes.expressions }),
      },
      xMin: numberAttr('xmin', DEFAULT_VIEW.xMin),
      xMax: numberAttr('xmax', DEFAULT_VIEW.xMax),
      yMin: numberAttr('ymin', DEFAULT_VIEW.yMin),
      yMax: numberAttr('ymax', DEFAULT_VIEW.yMax),
      width: numberAttr('width', 520),
      height: numberAttr('height', 320),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="function-graph"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'function-graph' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FunctionGraphView, {
      // The frame handles its own dragging, zooming and typing.
      stopEvent: () => true,
    });
  },

  addCommands() {
    return {
      insertFunctionGraph:
        (expressions = '') =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { expressions } })
            .run(),
    };
  },
});

export default FunctionGraph;
