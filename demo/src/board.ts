import type { Hit, SegmentId } from "granboard";

/** Dart numbers clockwise from the top of the board. */
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SVG_NS = "http://www.w3.org/2000/svg";
const LED_COUNT = 60;

const pt = (r: number, deg: number): [number, number] => {
  const t = ((deg - 90) * Math.PI) / 180;
  return [+(r * Math.cos(t)).toFixed(2), +(r * Math.sin(t)).toFixed(2)];
};

function wedge(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export interface BoardView {
  show(hit: Hit): void;
  setDimmed(dimmed: boolean): void;
}

/**
 * Draw the board into `svg`. Each scoring area is a button-like target
 * that calls `onThrow` with its segment id, so visitors can simulate throws.
 */
export function drawBoard(svg: SVGSVGElement, onThrow: (id: SegmentId) => void): BoardView {
  svg.setAttribute("viewBox", "-205 -205 410 410");
  const targets = new Map<SegmentId, SVGElement>();
  const leds: SVGCircleElement[] = [];

  const addTarget = (node: SVGElement, id: SegmentId, label: string) => {
    node.dataset.segment = id;
    node.classList.add("target");
    node.setAttribute("tabindex", "-1");
    const title = el("title", {});
    title.textContent = label;
    node.append(title);
    node.addEventListener("click", () => onThrow(id));
    targets.set(id, node);
    svg.append(node);
  };

  const rim = el("circle", { r: 196, class: "rim" });
  addTarget(rim, "MISS", "Miss");

  BOARD_ORDER.forEach((n, i) => {
    const a0 = i * 18 - 9;
    const a1 = a0 + 18;
    const even = i % 2 === 0;
    const single = even ? "seg-dark" : "seg-light";
    const ring = even ? "seg-red" : "seg-green";
    addTarget(el("path", { d: wedge(160, 170, a0, a1), class: ring }), `DBL_${n}` as SegmentId, `Double ${n}`);
    addTarget(el("path", { d: wedge(107, 160, a0, a1), class: single }), `OUTER_${n}` as SegmentId, `Outer single ${n}`);
    addTarget(el("path", { d: wedge(97, 107, a0, a1), class: ring }), `TRP_${n}` as SegmentId, `Triple ${n}`);
    addTarget(el("path", { d: wedge(16, 97, a0, a1), class: single }), `INNER_${n}` as SegmentId, `Inner single ${n}`);
    const [tx, ty] = pt(181, i * 18);
    const label = el("text", { x: tx, y: ty, class: "number", "text-anchor": "middle", "dominant-baseline": "central" });
    label.textContent = String(n);
    svg.append(label);
  });

  addTarget(el("circle", { r: 16, class: "seg-green" }), "BULL", "Bull");
  addTarget(el("circle", { r: 6.4, class: "seg-red" }), "DBL_BULL", "Double bull");

  for (let k = 0; k < LED_COUNT; k++) {
    const [cx, cy] = pt(193, k * 6);
    const dot = el("circle", { cx, cy, r: 2.6, class: "led" });
    leds.push(dot);
    svg.append(dot);
  }

  const lightLeds = (centerDeg: number | "all" | "none") => {
    leds.forEach((dot, k) => {
      let on = centerDeg === "all";
      if (typeof centerDeg === "number") {
        const d = Math.abs(((k * 6 - centerDeg + 540) % 360) - 180);
        on = d <= 12;
      }
      dot.classList.toggle("on", on);
    });
  };

  return {
    show(hit) {
      for (const node of targets.values()) node.classList.remove("hit");
      const node = targets.get(hit.id);
      if (node) {
        node.classList.add("hit");
        // Restart the pulse animation for repeat hits on the same segment.
        node.classList.remove("pulse");
        void (node as unknown as HTMLElement).offsetWidth;
        node.classList.add("pulse");
      }
      if (typeof hit.number === "number" && hit.number <= 20) {
        lightLeds(BOARD_ORDER.indexOf(hit.number) * 18);
      } else if (hit.ring === "bull" || hit.ring === "double_bull") {
        lightLeds("all");
      } else {
        lightLeds("none");
      }
    },
    setDimmed(dimmed) {
      svg.classList.toggle("dimmed", dimmed);
    },
  };
}
