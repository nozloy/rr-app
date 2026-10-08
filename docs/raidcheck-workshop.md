# Raid check workshop

The /raidcheck page shares WorkshopHeader, WorkshopFooter and the Roboto Condensed font with the homepage. The existing import parser, server action, character details, bookmarks, filters and results table are retained.

## Composition

- Independent environment, title sign, goblin, button, panel frame, crates and ready emblem.
- All seven assets were created **from scratch** with the built-in image_gen tool. No reference image or existing image was supplied to any selected generation. The supplied mockup was only a visual guide for the implementation.
- WebP quality 95, alpha quality 100; native dimensions preserved without enlargement. Originals remain in the generated-image directory.
- The square border uses CSS nine-slice scaling, keeping the corners intact as the panels grow. Text, inputs, states, table and button label remain HTML. The illustrated Russian title has a semantic h1; English uses an HTML title over the same sign.
- Desktop uses two hero columns and two workbench columns. At 1050px and below, the hero and workbench stack. At 600px and below, features and settings stack; the subtitle moves below the sign. At 380px, the goblin becomes smaller so it cannot cover the addon copy.
- Decorative layers never accept pointer input. Foreground crates move behind results and mobile layouts. Wide result tables use ScrollArea with a visible horizontal scrollbar.

## Assets and generation prompts

### environment.webp

Path: public/raidcheck/workshop/environment.webp

Native size: 1672 × 941; alpha: false. Generation: exec-595635d3-7402-4a7d-b50c-b33170225c49.

Create entirely from scratch, from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, warm amber lantern light, acid green alchemy glow, with royal purple accents. No blur, no smeared detail, no photorealism, no artifacts. Asset: a wide 16:9 environment layer for a raid preparation web page. An elaborate goblin workshop seen straight on: enormous riveted pipes and luminous green alchemical cylinders at far left, warm orange lanterns, overhead wooden beams and chains, a distant purple carnival skyline visible through a small opening high in the center, a few engineering rockets against the far-right wall, dark scuffed workshop floor at the bottom. The middle 75% stays dark and visually quiet for future interface panels. Foreground sides frame the scene. Every wood grain, rivet and edge sharply resolved in deep focus. Absolutely NO user interface, cards, panels, buttons, words, signs, characters or foreground crates. This is environment artwork only.

### title-sign.webp

Path: public/raidcheck/workshop/title-sign.webp

Native size: 2098 × 749; alpha: true. Generation: exec-667fddb8-8a99-4dfe-a908-3c4f7b286d4c.

Create entirely from scratch, from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, warm amber lantern light, acid green alchemy glow, with royal purple accents. No blur, no smeared detail, no photorealism, no artifacts. Asset: one independent wide 2.8:1 two-tier hanging title sign. Front-on and perfectly level. Top tier: a wide battered black wooden board encased in heavy rusty brass and iron riveted brackets, a green lamp on the left, an amber lamp on the right, short suspension chains above. Large confident hand-painted angular Cyrillic title on a straight baseline reads EXACTLY 'ПРОВЕРКА КД РЕЙДА' in one line; warm ochre letters on the left transition to vibrant acid green toward the right. Spell correctly, no extra or malformed letters. Beneath it hangs a narrower dark steel subtitle plaque, EMPTY with no text, large enough for two lines of real HTML subtitle. Detailed beveled bolts and scratches, balanced overall silhouette, generous horizontal title space. True transparent background around the entire object and through chain gaps, 3% safe margins. No other writing, no environment, no characters, no UI mockup.

### addon-goblin.webp

Path: public/raidcheck/workshop/addon-goblin.webp

Native size: 1254 × 1254; alpha: true. Generation: exec-8823de61-603d-49d1-aaab-2a69f9ec7974.

Create entirely from scratch, from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, warm amber lantern light, acid green alchemy glow, with royal purple accents. No blur, no smeared detail, no photorealism, no artifacts. Asset: one isolated female goblin mechanic bust, square 1:1 transparent canvas. Invent and draw her cleanly from scratch: friendly mischievous grin, bright green skin, long pointed ears, turquoise ponytail swept upward, brass brown engineering goggles with luminous green lenses, leather mechanical gloves and broad brown armored shoulders. She looks at the viewer while leaning slightly toward the left, raises a large steel wrench in her right hand on image left, and rests her other gloved forearm along an implied horizontal edge near the bottom. Include complete hair, both ears, wrench and hands with 5% safe space around the silhouette. Fine illustrated details, anatomically coherent fingers and expression. True alpha outside the character. NO frame or panel, no environment, no words, no crates, no rockets.

### submit-button.webp

Path: public/raidcheck/workshop/submit-button.webp

Native size: 2172 × 724; alpha: true. Generation: exec-dbb0005d-7f68-469e-8b32-87dbb252b371.

Create entirely from scratch, from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, warm amber lantern light, acid green alchemy glow, with royal purple accents. No blur, no smeared detail, no photorealism, no artifacts. Asset: one wide 3:1 blank engineering action button on genuine transparency. Horizontal weathered bronze and iron rectangular frame with heavy beveled golden upper rail, machined bolts and little clamps. The broad center is vivid luminous lime/acid green enamel with subtle fine scratches, intended for black real HTML lettering. A small chunky green metal gear emblem occupies the left quarter of the face; all center and right face area stays EMPTY, no letters or arrows. The face is centered at about 45% canvas height. A heavy black U-shaped pipe with brass couplings runs below the frame and connects at the sides, occupying lower third of canvas. Perfectly straight frontal view, crisp edges, 3% transparent margins. Genuine alpha around and between pipes. No text, no UI screenshot, no other objects.

### panel-frame.webp

Path: public/raidcheck/workshop/panel-frame.webp

Native size: 1254 × 1254; alpha: true. Generation: exec-4f5e9bb2-772b-47ce-bd3a-02794ceba516.

Create entirely from scratch from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, amber highlights, acid green alchemy glow. No blur, smears, photorealism or artifacts. Asset: one square 1:1 empty UI panel BORDER for CSS nine-slice scaling. A front-facing dark iron square frame with a thin rusty brass bevel along the inside edge, weathered hammered texture, compact metal angle brackets with three rivets at each corner. Four straight level sides of consistent thickness about 6% of canvas side, corner detail only in outer 10%. Just 1% transparent outer margin. Entire central rectangle is truly TRANSPARENT empty space, NO texture or background fill. Only border metal visible. No perspective, title bar, lettering, symbols, lights, ornaments, buttons, mockup or panel interior. Symmetrical straight geometry suitable for border-image slicing.

### crates.webp

Path: public/raidcheck/workshop/crates.webp

Native size: 1448 × 1086; alpha: true. Generation: exec-62d7262d-b382-46f5-87df-1e006d35a05e.

Create entirely from scratch from a blank canvas, a crisp high-detail fantasy goblin engineering game illustration. Hand-painted Warcraft-like aesthetic, angular expressive craftsmanship, dark iron, worn brass, amber highlights, acid green alchemy glow. No blur, smears, photorealism or artifacts. Asset: one separate bottom-right decorative cluster of scuffed wooden engineering crates with heavy bronze edge bands and rivets, a few glowing green potion bottles, dark chains and three upright red-tipped rockets. Landscape 4:3 transparent canvas. Low on left and stacked higher on right. All crates, bottles and rocket tips fully inside canvas with safe transparent margins. A front-facing battered board has small hand-painted red graffiti 'WORK HARDER' on two lines and 'LOOT FASTER' below, correctly spelled, incidental to the objects. Crisp illustrated wood grain and chipped paint. True transparent background around and between objects. No floor, environment, characters, UI panels or other lettering.

### ready-emblem.webp

Path: public/raidcheck/workshop/ready-emblem.webp

Native size: 1254 × 1254; alpha: true. Generation: exec-dd78d29f-40e6-4678-b8de-7cbdfc7bc9af.

Create an entirely original illustration from a blank canvas, no input image. One isolated emblem for a fantasy goblin workshop interface, square 1:1 canvas with genuinely transparent background. A heavy dark weathered iron cog with 10 clearly machined teeth, chipped brass bevels on the lower edges and two silver steel open-ended spanners crossed diagonally across its face. The spanners form a balanced X. Crisp small bolts, metallic highlights, hand-painted Warcraft-style angular game art matching worn dark steel and aged bronze. A few tiny acid-green sparks sit just beside left and right sides of the gear, subtle green rim light from below, but no large haze or fog. Entire emblem centered within 15% transparent safe margins on all sides. High detail at 128px display size, strong clean silhouette. No text, no letters, no square panel, no background, no supporting floor, no border, no perspective tilt, no blur.

## Animated submit button (v2)

The submit button now uses two newly generated transparent images. The existing single-image button is retained as the original design. Both new assets were created from scratch with the built-in `image_gen` tool, then encoded as WebP at quality 95 / alpha quality 100 without resizing.

### submit-button-frame-v2.webp

Path: public/raidcheck/workshop/submit-button-frame-v2.webp

Native size: 2172 × 724; alpha: true. Generation: exec-fe03be7b-4e1e-4752-bcf6-22786a8feab0.

```text
Use case: stylized-concept. Asset type: production raster artwork for one website action button, genuine transparent alpha.
Create an entirely NEW design from a blank canvas: one wide 3:1 goblin engineering button BODY ONLY. High quality hand-painted Warcraft-like fantasy game UI art, sharp clean metal edges and crisp small details. Worn golden brass and dark gunmetal, beveled riveted corner plates, compact angular clamps, short black pipes with brass couplings running neatly below the face, tiny purple fittings at the sides. A broad luminous lime/acid green enamel face with subtle fine scratches and a calm evenly lit center, dark enough for near-black HTML lettering to remain readable. Mechanical, substantial, polished game interface rather than photorealism.
Strict straight-on orthographic view, perfectly horizontal. Canvas aspect 3:1. Entire silhouette including pipes fits in the canvas with 3 percent transparent margins. The main green face occupies roughly x=10% to 91%, y=17% to 72%; its vertical center is y=44%. On the LEFT at x=20%, y=44%, place a simple dark circular recessed mounting plate, diameter 16% of canvas width (48% of canvas height), ready to receive a SEPARATE animated gear image later. This mounting plate has no teeth, no spokes and NO GEAR on it. The area from x=31% to 84% on the face must remain clear green for real HTML text. Below the face, use a compact low pipe assembly in the lower quarter with transparent gaps.
The panel and mounting plate are opaque; all canvas outside the object and between the pipes is truly transparent, no checkerboard or black background. No letters, no words, no numbers, no arrows, no logos, no drawn gear, no characters, no environment, no UI mockup. No blur, no haze, no detached floating fragments. The object is a single clean separate button body.
```

### submit-button-gear-v2.webp

Path: public/raidcheck/workshop/submit-button-gear-v2.webp

Native size: 1254 × 1254; alpha: true. Generation: exec-8f1bdf05-49dc-4e5a-8c0d-b3f5f6e9b011.

```text
Use case: stylized-concept. Asset type: production raster sprite for a rotating website button gear, genuine transparent alpha.
Create from a blank canvas ONE perfectly centered, strictly front-facing circular goblin engineering GEAR on a square 1:1 canvas. High quality hand-painted Warcraft-like fantasy game interface art. Match this material palette: vivid lime/acid green enamel on the gear face, worn golden brass bevels around the edges and teeth, dark gunmetal inner ring, round aged brass central hub. Eight evenly spaced sturdy mechanical teeth, crisp machined edges, tasteful small scratches and evenly spaced small rivets around the hub. The outline must be mechanically circular and radially balanced, never oval or tilted. All rings, teeth and hub share the exact canvas center. The complete outer silhouette occupies 84% of the square width and height, with equal transparent 8% padding on all four sides.
This sprite will continuously rotate around its center: use balanced soft frontal lighting with restrained radial highlights, no strong directional cast shadow, no perspective, no extrusion projecting to one side. Make the gear legible at 60 to 100 CSS pixels, bold clean teeth, richly painted metal texture without clutter.
True transparent alpha outside the entire gear and through the gaps between its teeth. No square background, no mounting plate, no rectangular button, no pipes, no letters, no numbers, no arrow, no spark particles, no glow cloud, no tools, no environment, no other objects, no blur. Deliver only the isolated green-and-brass gear.
```

The gear wrapper positions the sprite over the circular mount; only the nested image rotates. A persistent 1.5-second clockwise CSS animation starts paused and runs while the button has `aria-busy="true"`. Pausing preserves the current angle between requests. Reduced-motion mode disables rotation while retaining the localized loading label and busy state. The right arrow stays static, and the native submit button blocks repeated activation while pending.

### v2 verification

- The existing three `RaidCheckForm` tests pass.
- The actual local `/raidcheck` page was checked in headless Chrome at 320, 768 and 1440 CSS pixels in both Russian and English. Idle and pending text fits between the gear and arrow; button dimensions remain stable and the page has no horizontal overflow.
- Browser-only mocked server-action responses covered a 150 ms success, a 2.2 s success and an error. The gear advances while pending, pauses at the current animation time after success or error, and resumes without resetting. Repeated activation during a pending request sends only one action.
- Reduced-motion mode shows the busy label without rotation. The right arrow remains static; no browser page errors were observed. Both WebP files preserve genuine alpha transparency. No real character data was requested during these checks.
- No production build or broad test suite was run.

## Verification

- Targeted ESLint passed for the changed route, shared shell, form, UI primitives, illustration modules and Next image configuration.
- git diff --check passed. No production build or broad test suite was run.
- Browser layout checks: 320, 390, 768, 1100, 1672 and 1920 CSS pixels. No horizontal page overflow; long result tables scroll inside their panel.
- Invalid import is rejected. A synthetic two-character roster enabled settings and submission; the server returned two not-found rows. Loading state, search, class filtering and clearing stale results when difficulty changes were checked.
- Russian and English labels and the footer language switch were checked. The language was restored to Russian and the synthetic input cleared.
- The homepage and raid page each render one shared header and one shared footer. Navigation from the homepage to /raidcheck was verified.

Full build was skipped according to project instructions.
