import { describe, it, expect } from 'vitest';
import { Path } from 'konva/lib/shapes/Path';
import {
  libraryCategories,
  objectCatalog,
  objectFromPreset,
  homeOfficeCatalog,
  livingRoomCatalog,
  homeCinemaCatalog,
} from './catalog';
import { createStarterPlan, planObjectSchema } from './plan-document';
import { officeBlueprint } from './office-blueprints';
import { roomKinds } from './room-blueprints';
import {
  attachWindow,
  isWallAttached,
  constrainWindows,
} from './wall-attachment';
import { usePlannerStore } from '../state/planner-store';

const added = objectCatalog.filter((p) =>
  (roomKinds as readonly string[]).includes(p.blueprint!),
);
describe('Expanded room catalogs', () => {
  it('has unique ownership, keeps office furniture, and includes separate dining furniture', () => {
    const all = libraryCategories.flatMap((c) => c.presets ?? []);
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    for (const kind of roomKinds.filter(
      (kind) =>
        !['shower-screen', 'speaker-base', 'hob', 'extractor'].includes(kind),
    ))
      expect(
        added.some((p) => p.blueprint === kind),
        kind,
      ).toBe(true);
    expect(homeOfficeCatalog.some((p) => p.blueprint === 'table')).toBe(true);
    expect(
      homeOfficeCatalog.some((p) => p.blueprint === 'ergonomic-chair'),
    ).toBe(true);
    expect(livingRoomCatalog.some((p) => p.blueprint === 'dining-table')).toBe(
      true,
    );
    expect(all.map((preset) => preset.name)).not.toContain('Hob');
    expect(all.map((preset) => preset.name)).not.toContain('Extractor Hood');
    expect(livingRoomCatalog.some((p) => p.blueprint === 'dining-chair')).toBe(
      true,
    );
    expect(
      homeCinemaCatalog.some(
        (p) => p.blueprint === 'tv' || p.blueprint === 'sofa',
      ),
    ).toBe(false);
  });
  it('offers plant variants from desk pots through large palms', () => {
    const plants = livingRoomCatalog.filter(
      (preset) => preset.blueprint === 'plant',
    );
    expect(plants.map((preset) => preset.name)).toEqual([
      'Plant · Desk Succulent',
      'Plant · Small Desk Plant',
      'Plant · Compact Floor Plant',
      'Plant · Large Leafy Plant',
      'Plant · Small Palm',
      'Plant · Large Palm',
    ]);
    expect(plants.map((preset) => preset.widthMm)).toEqual([
      160, 240, 400, 600, 800, 1200,
    ]);
    expect(plants.map((preset) => preset.heightMm)).toEqual([
      200, 350, 800, 1300, 1700, 2400,
    ]);
  });
  it('saves all profiles and renders every native and extreme aspect ratio within bounds', () => {
    for (const preset of added) {
      const object = objectFromPreset(preset, preset.id, { x: 0, y: 0 });
      expect(
        planObjectSchema.parse(JSON.parse(JSON.stringify(object))),
      ).toEqual(object);
      for (const [w, d] of [
        [preset.widthMm, preset.depthMm],
        [1, 10000],
        [10000, 1],
        [80, 50],
      ]) {
        const paths = officeBlueprint(
          preset.blueprint!,
          w,
          d,
          preset.blueprintProfile,
        );
        expect(paths.length, preset.name).toBeGreaterThan(0);
        for (const part of paths) {
          const path = new Path({ data: part.d });
          const b = path.getSelfRect();
          path.destroy();
          expect(
            Number.isFinite(b.x + b.y + b.width + b.height),
            preset.name,
          ).toBe(true);
          expect(b.x, preset.name).toBeGreaterThanOrEqual(-w / 2 - 0.01);
          expect(b.y, preset.name).toBeGreaterThanOrEqual(-d / 2 - 0.01);
          expect(b.x + b.width, preset.name).toBeLessThanOrEqual(w / 2 + 0.01);
          expect(b.y + b.height, preset.name).toBeLessThanOrEqual(d / 2 + 0.01);
        }
      }
    }
  });
  it('keeps screen image height separate from physical floor depth', () => {
    for (const p of added.filter(
      (p) => p.blueprint === 'tv' || p.blueprint === 'projector-screen',
    )) {
      const profile = p.blueprintProfile!;
      expect(profile.imageWidthMm! / profile.imageHeightMm!).toBeCloseTo(
        16 / 9,
        2,
      );
      expect(p.widthMm).toBeGreaterThan(profile.imageWidthMm!);
      expect(p.depthMm).toBeLessThan(profile.imageHeightMm!);
    }
    const tv = added.find((p) => p.name === 'TV with Stand · 100″')!;
    const parts = officeBlueprint('tv', 100, 20, tv.blueprintProfile);
    const b = new Path({ data: parts[2].d }).getSelfRect();
    expect(b.height).toBeLessThan(5);
  });
  it('attaches panels to the interior wall face', () => {
    const room = createStarterPlan().room;
    const panel = added.find((p) => p.blueprint === 'acoustic-panel')!;
    const object = attachWindow(
      objectFromPreset(panel, 'panel', { x: 1200, y: 0 }),
      room,
    );
    expect(isWallAttached(object)).toBe(true);
    expect(object.positionMm).toEqual({
      x: 1200,
      y: (room.wallThicknessMm + panel.depthMm) / 2,
    });
    const changed = constrainWindows({
      ...createStarterPlan(),
      objects: [object],
      room: { ...room, wallThicknessMm: 200 },
    });
    expect(changed.objects[0].positionMm.y).toBe(150);
  });
  it('changes Sonos models with an undoable persisted model identity', () => {
    const a = added.find((p) => p.name === 'Sonos Speaker · Era 100')!;
    const b = added.find((p) => p.name === 'Sonos Speaker · Era 300')!;
    const object = objectFromPreset(a, 'speaker', { x: 1500, y: 1800 });
    usePlannerStore.setState({
      document: { ...createStarterPlan(), objects: [object] },
      selectedIds: ['speaker'],
      past: [],
      future: [],
      editStart: null,
    });
    usePlannerStore.getState().updateSelectedObject({
      name: b.name,
      blueprintProfile: b.blueprintProfile,
    });
    expect(
      usePlannerStore.getState().document.objects[0].blueprintProfile?.presetId,
    ).toBe(b.id);
    usePlannerStore.getState().undo();
    expect(
      usePlannerStore.getState().document.objects[0].blueprintProfile?.presetId,
    ).toBe(a.id);
  });
});
