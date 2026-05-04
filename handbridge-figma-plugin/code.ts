import uiHtml from './ui.html';
import buildVersion from './build-version.json';

const PLUGIN_BUILD_VERSION = String(buildVersion.version ?? '?');

type GestureTarget = {
  path: string;
  property: string;
  value: unknown;
};

function setSolidFill(nodes: SceneNode[], r: number, g: number, b: number) {
  const paint: SolidPaint = {
    type: 'SOLID',
    color: { r, g, b },
  };
  for (const n of nodes) {
    // Do not use Array.isArray(fills): default / mixed fills are symbols, not arrays.
    if ('fills' in n) (n as GeometryMixin).fills = [paint];
  }
}

const LEGACY_BINDING_KEYS = ['handlab.bindings.v2', 'handlab.bindings.v1'];

function normalizedSegments(path: string): string[] {
  return path
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

function nodeName(node: BaseNode): string {
  return 'name' in node ? (node as BaseNode & { name: string }).name : '';
}

async function childNodesAsync(node: BaseNode): Promise<readonly BaseNode[]> {
  if (node.type === 'PAGE' && 'loadAsync' in node) {
    await (node as PageNode).loadAsync();
  }
  return 'children' in node ? (node as BaseNode & ChildrenMixin).children : [];
}

function findPathChild(nodes: readonly BaseNode[], segment: string): BaseNode[] {
  const exact = nodes.filter((n) => nodeName(n) === segment);
  if (exact.length) return exact;
  const needle = segment.toLowerCase();
  return nodes.filter((n) => nodeName(n).toLowerCase() === needle);
}

type PathResolution =
  | { ok: true; node: SceneNode }
  | { ok: false; reason: string };

async function resolveNodeByPathDetailed(path: string): Promise<PathResolution> {
  const segments = normalizedSegments(path);
  if (!segments.length) return { ok: false, reason: 'Empty path.' };

  const pages = [...figma.root.children];
  const first = segments[0];
  const exactPage = pages.filter((p) => p.name === first);
  const pageMatches = exactPage.length ? exactPage : pages.filter((p) => p.name.toLowerCase() === first.toLowerCase());
  const roots = pageMatches.length ? pageMatches : [figma.currentPage];
  const startIdx = pageMatches.length ? 1 : 0;

  let frontier: BaseNode[] = [...roots];
  for (let i = startIdx; i < segments.length; i++) {
    const seg = segments[i];
    const next: BaseNode[] = [];
    const parentNames = new Set<string>();
    for (const node of frontier) {
      const children = await childNodesAsync(node);
      if (!children.length) continue;
      for (const child of children) parentNames.add(nodeName(child));
      next.push(...findPathChild(children, seg));
    }
    if (!next.length) {
      const sample = [...parentNames].filter(Boolean).slice(0, 8).join(', ');
      return {
        ok: false,
        reason: `Missing segment "${seg}" at position ${i + 1}/${segments.length}. Candidates here: ${sample || '(none)'}`,
      };
    }
    frontier = next;
  }

  for (const n of frontier) {
    if (n.type !== 'DOCUMENT' && n.type !== 'PAGE') return { ok: true, node: n as SceneNode };
  }
  return { ok: false, reason: 'Path resolves to non-scene node.' };
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  }
  return null;
}

function parseOpacity(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
  }
  return null;
}

function parseNumber01(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseHexColor(value: unknown): { r: number; g: number; b: number } | null {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const num = Number.parseInt(hex, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return { r, g, b };
}

function parseGestureTarget(raw: unknown): GestureTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.path !== 'string' || typeof o.property !== 'string') return null;
  const path = o.path.trim();
  const property = o.property.trim();
  if (!path || !property) return null;
  return { path, property, value: o.value };
}

async function ensureTextNodeEditable(node: TextNode): Promise<void> {
  const fonts = node.getRangeAllFontNames(0, node.characters.length);
  for (const font of fonts) {
    if (font !== figma.mixed) await figma.loadFontAsync(font);
  }
}

function parseVariants(value: unknown): Record<string, string | boolean> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!k.trim()) continue;
      if (typeof v === 'string' || typeof v === 'boolean') out[k.trim()] = v;
    }
    return Object.keys(out).length ? out : null;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      return parseVariants(parsed);
    } catch {
      return null;
    }
  }

  const out: Record<string, string | boolean> = {};
  const pairs = raw.split(/[;,]/);
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const valRaw = pair.slice(idx + 1).trim();
    if (!key || !valRaw) continue;
    const b = parseBoolean(valRaw);
    out[key] = b == null ? valRaw : b;
  }
  return Object.keys(out).length ? out : null;
}

async function applyTargetToNode(node: SceneNode, target: GestureTarget): Promise<string> {
  if (!target.path) throw new Error('Target path is empty.');
  if (!target.property) throw new Error('Target property is empty.');
  const prop = target.property;
  if (prop === 'x' || prop === 'y') {
    const v = parseNumber01(target.value);
    if (v == null) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
    if (!('x' in node) || !('y' in node)) throw new Error(`Node "${node.name}" has no position properties.`);
    if (prop === 'x') node.x = v;
    else node.y = v;
    return `Applied ${prop}=${v} on "${node.name}".`;
  }
  if (prop === 'width' || prop === 'height') {
    const v = parseNumber01(target.value);
    if (v == null || v < 0) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
    if (!('resize' in node)) throw new Error(`Node "${node.name}" is not resizable.`);
    const width = prop === 'width' ? v : node.width;
    const height = prop === 'height' ? v : node.height;
    (node as SceneNode & LayoutMixin).resize(width, height);
    return `Applied ${prop}=${v} on "${node.name}".`;
  }
  if (prop === 'visible') {
    const v = parseBoolean(target.value);
    if (v == null) throw new Error(`Invalid visible value: ${String(target.value)}`);
    node.visible = v;
    return `Applied ${prop}=${v} on "${node.name}".`;
  }
  if (prop === 'opacity') {
    const v = parseOpacity(target.value);
    if (v == null) throw new Error(`Invalid opacity value: ${String(target.value)}`);
    if (!('opacity' in node)) throw new Error(`Node "${node.name}" has no opacity property.`);
    (node as SceneNode & BlendMixin).opacity = v;
    return `Applied ${prop}=${v.toFixed(3)} on "${node.name}".`;
  }
  if (prop === 'color' || prop === 'fillHex') {
    const rgb = parseHexColor(target.value);
    if (!rgb) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
    if (!('fills' in node)) throw new Error(`Node "${node.name}" has no fills property.`);
    setSolidFill([node], rgb.r, rgb.g, rgb.b);
    return `Applied ${prop}=${String(target.value)} on "${node.name}".`;
  }
  if (prop === 'textContent') {
    if (node.type !== 'TEXT') throw new Error(`Node "${node.name}" is not a text node.`);
    if (typeof target.value !== 'string') throw new Error(`Invalid textContent value: ${String(target.value)}`);
    await ensureTextNodeEditable(node);
    node.characters = target.value;
    return `Applied ${prop} on "${node.name}".`;
  }
  if (prop === 'variants') {
    if (node.type !== 'INSTANCE') throw new Error(`Node "${node.name}" is not a component instance.`);
    const properties = parseVariants(target.value);
    if (!properties) throw new Error(`Invalid variants value: ${String(target.value)}`);
    node.setProperties(properties);
    return `Applied ${prop} on "${node.name}".`;
  }
  throw new Error(`Unsupported property "${prop}".`);
}

function toast(msg: string) {
  figma.notify(msg, { timeout: 1600 });
}

figma.showUI(uiHtml, { width: 380, height: 500, title: 'Hand Bridge' });

const initReady = (async () => {
  // Remove old binding-based behavior so target-driven updates are the only path.
  for (const key of LEGACY_BINDING_KEYS) {
    await figma.clientStorage.setAsync(key, []);
  }
})();

initReady.catch((e) => {
  console.error(e);
  toast(`Init error: ${e?.message ?? e}`);
});

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg !== 'object') return;
  await initReady;

  if (msg.type === 'request_version') {
    figma.ui.postMessage({ type: 'plugin_version', version: PLUGIN_BUILD_VERSION });
    return;
  }

  if (msg.type === 'dry_run_target') {
    const target = parseGestureTarget(msg.target);
    if (!target) {
      figma.ui.postMessage({ type: 'dry_run_result', ok: false, message: 'Invalid target payload.' });
      return;
    }
    const resolved = await resolveNodeByPathDetailed(target.path);
    if (!resolved.ok) {
      figma.ui.postMessage({ type: 'dry_run_result', ok: false, message: `Path error: ${resolved.reason}` });
      return;
    }
    try {
      const outcome = await applyTargetToNode(resolved.node, target);
      figma.viewport.scrollAndZoomIntoView([resolved.node]);
      figma.ui.postMessage({
        type: 'dry_run_result',
        ok: true,
        message: `Preview applied: ${outcome}`,
      });
    } catch (e) {
      figma.ui.postMessage({
        type: 'dry_run_result',
        ok: false,
        message: `Dry run failed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
    return;
  }

  if (msg.type === 'gesture_match') {
    const name = msg.gesture?.name;
    if (typeof name !== 'string' || !name.trim()) return;

    const target = parseGestureTarget(msg.target);
    if (!target) {
      toast(`Gesture "${name.trim()}" has no valid target.`);
      return;
    }
    const resolved = await resolveNodeByPathDetailed(target.path);
    if (!resolved.ok) {
      toast(`Path error: ${resolved.reason}`);
      return;
    }
    const node = resolved.node;
    try {
      const outcome = await applyTargetToNode(node, target);
      toast(outcome);
    } catch (e) {
      toast(`Apply failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return;
  }
};
