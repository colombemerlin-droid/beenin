import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3-geo';
import { feature } from 'topojson-client';

// Vendored from the world-atlas npm package (countries-110m.json) so the map
// doesn't depend on a CDN being reachable at runtime.
const ATLAS = '/countries-110m.json';

interface GeoGeometry {
  type: string;
  properties?: { name?: string };
  [key: string]: unknown;
}

interface Topology {
  type: 'Topology';
  objects: Record<string, unknown>;
  [key: string]: unknown;
}

const ALIAS: Record<string, string> = {
  'United States': 'United States of America',
  UK: 'United Kingdom',
  Czechia: 'Czech Republic',
  'Ivory Coast': "Côte d'Ivoire",
  Bosnia: 'Bosnia and Herz.',
  'Dominican Rep.': 'Dominican Republic',
};

let featuresPromise: Promise<GeoGeometry[]> | null = null;

function getFeatures(): Promise<GeoGeometry[]> {
  if (!featuresPromise) {
    featuresPromise = fetch(ATLAS)
      .then((r) => r.json())
      .then((topo: Topology) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = topo.objects.countries as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (feature(topo as any, obj) as any).features as GeoGeometry[];
      });
  }
  return featuresPromise;
}

interface WorldMapProps {
  logged: string[];
  fill?: string;
  empty?: string;
  hairline?: string;
}

interface PathDatum {
  name: string;
  d: string;
  feature: GeoGeometry;
}

export function WorldMap({ logged, fill = '#E2725B', empty = '#E8E1D7', hairline = '#DAD0C2' }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<PathDatum[]>([]);
  const [sphereD, setSphereD] = useState('');
  const geoRef = useRef<d3.GeoPath<unknown, d3.GeoPermissibleObjects> | null>(null);
  const prevLoggedRef = useRef<Set<string> | null>(null);
  const rippleHostRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      setSize({ w: Math.round(box.width), h: Math.round(box.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h) return;
    let cancelled = false;
    getFeatures().then((features) => {
      if (cancelled) return;
      const sphere = { type: 'Sphere' as const };
      const proj = d3.geoNaturalEarth1().fitExtent(
        [
          [5, 5],
          [size.w - 5, size.h - 5],
        ],
        sphere
      );
      const geo = d3.geoPath(proj);
      geoRef.current = geo;
      setSphereD(geo(sphere) || '');
      setPaths(
        features.map((f) => ({
          name: (f.properties && (f.properties as { name?: string }).name) || '',
          d: geo(f as unknown as d3.GeoPermissibleObjects) || '',
          feature: f,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [size.w, size.h]);

  const loggedSet = new Set(logged.map((n) => ALIAS[n] || n));

  useEffect(() => {
    const host = rippleHostRef.current;
    const geo = geoRef.current;
    if (!host || !geo) {
      prevLoggedRef.current = loggedSet;
      return;
    }
    const prev = prevLoggedRef.current;
    if (prev) {
      paths.forEach((p) => {
        if (loggedSet.has(p.name) && !prev.has(p.name)) {
          let c: [number, number] | null = null;
          try {
            c = geo.centroid(p.feature as unknown as d3.GeoPermissibleObjects) as [number, number];
          } catch {
            c = null;
          }
          if (!c || Number.isNaN(c[0])) return;
          const NS = 'http://www.w3.org/2000/svg';
          const el = document.createElementNS(NS, 'circle');
          el.setAttribute('cx', String(c[0]));
          el.setAttribute('cy', String(c[1]));
          el.setAttribute('r', '2');
          el.setAttribute('fill', 'none');
          el.setAttribute('stroke', fill);
          el.setAttribute('stroke-width', '2');
          host.appendChild(el);
          const anim = el.animate(
            [
              { r: 2, opacity: 0.65, strokeWidth: 2 },
              { r: 34, opacity: 0, strokeWidth: 0.5 },
            ] as Keyframe[],
            { duration: 520, easing: 'cubic-bezier(0.22,1,0.36,1)' }
          );
          anim.onfinish = () => el.remove();
        }
      });
    }
    prevLoggedRef.current = loggedSet;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged.join(','), paths]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`} style={{ display: 'block', overflow: 'visible' }}>
        <path d={sphereD} fill="none" stroke={hairline} strokeWidth={1} />
        {paths.map((p) => (
          <path
            key={p.name || Math.random()}
            d={p.d}
            fill={loggedSet.has(p.name) ? fill : empty}
            stroke={hairline}
            strokeWidth={0.5}
            style={{ transition: 'fill 480ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        ))}
        <g ref={rippleHostRef} />
      </svg>
    </div>
  );
}
