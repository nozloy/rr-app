# Layered workshop homepage

The homepage follows the supplied fantasy workshop reference. Artwork is separated
from layout: the page uses a normal responsive grid, and each illustrated object
keeps its own aspect ratio. Text, links, menus, feature icons and panels are HTML,
SVG icons and CSS. Only the Russian brand lettering is part of an image.

## Production assets

All files live in `public/home/workshop/`. The built-in imagegen tool redrew
them from the reference. WebP conversion uses quality 95 and alpha quality 100.
These are the actual generated pixel dimensions; no image was upscaled.

| File | Native pixels | Transparency | Maximum foreground display width |
| --- | --- | --- | --- |
| environment.webp | 1672 × 941 | No | Background center, kept at native size |
| workshop-wall.webp | 1086 × 1448 | No | Background side, 600 px |
| carnival-wall.webp | 1086 × 1448 | No | Background side, 600 px |
| goblin.webp | 1122 × 1402 | Yes | 450 px |
| title-sign.webp | 1690 × 931 | Yes | 700 px |
| check-button.webp | 1774 × 887 | Yes | 517 px |
| forecast-button.webp | 1774 × 887 | Yes | 517 px |
| oracle-prop.webp | 1086 × 1448 | Yes | 380 px |

Foreground artwork has at least 2.4 native pixels per CSS pixel at its largest
desktop size. Each image retains its proportions at every breakpoint. WebP files
are served directly to avoid an additional image optimization pass at a lower
default quality. The original PNG generations remain in Codex's generated-images
directory. The earlier flattened plate is archived outside the application at
`D:/RaidRemainder/artifacts/workshop-home-v1-scene.webp`.

## Layout

- Above 1100 px: three columns, with the goblin and oracle prop flanking the
  central title, two actions and four-column feature panel.
- 641–1100 px: a wider central layout, two actions side by side, four features.
  Side props and side environment panels are hidden.
- Up to 640 px: actions stack, features use two columns, navigation uses a menu.
- Navigation collapses below 1251 px independently of the content layout.
- Main content and the environment composition stop growing at 1920 px.
  Tall desktops reposition the background composition alongside the content.
- Short windows scroll naturally; no fixed page aspect ratio or compressed text.
- Only each action's own label and the title's own subtitle use local coordinates
  inside an illustration. No interactive element is positioned against a
  flattened screenshot.
- The illustrated skin and its breakpoints live in `workshop.css`, scoped to
  workshop classes. Other pages do not receive the homepage's layout.

## Components and behavior

- `home-page.tsx` composes the modules, loads locale and reuses the existing
  header user resolver.
- `workshop-environment.tsx` composes the three background images.
- `workshop-scenery.tsx` contains independent character and oracle cutouts.
- `hero-section.tsx` contains the illustrated sign and real subtitle text.
- `hero-actions.tsx` links to `/raidcheck` and `/kogda-raid`.
- `workshop-header.tsx` preserves the Battle.net flow, account links and
  shadcn navigation/dialogs. Raids link to `/events`.
- `workshop-features.tsx` uses scalable SVG icons and selectable text.
- `workshop-footer.tsx` uses the existing Russian/English switch.
- `workshop-copy.ts` supplies both languages. The painted Russian brand is
  retained in both locales.
- The status dot is a static welcome indicator, not an invented online count.
- Homepage metadata and its dedicated footer remain in `src/app/page.tsx`
  and `conditional-site-footer.tsx`; other routes retain their design.

## Validation

Targeted ESLint and TypeScript diagnostics cover changed home modules.
Browser inspection covers 320, 390, 768, 1024, 1440, 1920 and 2560 px widths,
image loading, label fit, horizontal overflow, the mobile menu, tools anchor,
about dialog and both locales. Final screenshots are saved under
`D:/RaidRemainder/artifacts/`.

Full build was skipped according to project instructions.

## Generation prompts

Prompts request high detail; requested dimensions are advisory. The actual output
dimensions are recorded in the table above.

### environment

Transparent background: no.

Use case: stylized-concept. Asset type: a standalone background environment for a responsive fantasy game website. Input image is STYLE and SETTING REFERENCE ONLY. Redraw from scratch in ultra-detailed 3840x2160 landscape, full-bleed 16:9. A richly detailed goblin engineering workshop opening to a dark moonlit fantasy carnival: tarnished bronze pipes and rivets along sides, timber beams, amber lanterns, emerald alchemical machinery on the left, purple-lit carnival architecture and a glowing stylized eye on a distant tent on the right. A wide empty wooden workbench across the bottom quarter. Center is an open, moderately dark workshop interior with detailed walls so separate title and controls can later be composited in front. Preserve the reference's green/amber/violet palette and polished hand-painted Warcraft-inspired 3D game art. CRITICAL: sharp texture detail at full 4K, deep focus everywhere, crisp objects, no bokeh, no depth-of-field blur, no motion blur, no fog or muddy soft gradients. This must be ONLY environment: NO goblin or other characters, NO central hanging sign, NO title letters, NO text, NO navigation, NO buttons, NO UI panels, NO footer, NO crystal ball. Do not reconstruct a flattened website. High-quality distinct background asset.

### goblin

Transparent background: yes.

Use case: background-extraction / stylized-concept. Asset type: standalone foreground character, with genuine alpha transparency. Use the goblin woman at the left of the reference as character and style reference. REDRAW her at 2048x2560 portrait, extremely crisp high-resolution game illustration. Friendly mischievous green-skinned female goblin engineer with turquoise ponytail hair, brass and glowing emerald goggles, long pointed ears, brown leather work gloves, ochre and brass armor/apron, holding a large steel wrench up in her right hand. Same face, expression, colors and clothing as the reference. Waist-up or three-quarter body composition facing slightly toward the viewer, with a small rugged wooden tool crate and red rocket tips along the bottom left foreground to finish her silhouette. Entire ears, hair, wrench, hands and crate inside frame, generous 5 percent transparent margin, no crop. Character occupies most of canvas and is the only subject. Genuine transparent background and sharp clean alpha edges; NO background, NO rectangular backdrop, NO floor, NO text, NO UI, NO poster. Sharp material detail, no blur, no soft-focus. Match the reference's warm amber and green workshop lighting.

### title-sign

Transparent background: yes.

Use case: stylized-concept. Asset type: standalone high-resolution hanging title sign for a website, genuine transparent background. Input image is reference only. REDRAW the giant central title sign by itself at 2560x1408 landscape, with exceptionally crisp detailed metalwork. Rusty bronze and dark iron industrial sign, irregular chunky riveted corners, bolt heads, a small cog at the upper right, two short heavy chains entering from the top edge and attaching to the upper corners. Big raised chunky green metal Cyrillic letters on first line, big raised gold metal Cyrillic letters on second line. Text exactly: first line "РЕЙДОВАЯ", second line "МАСТЕРСКАЯ". Make Cyrillic letters perfectly legible and exact, match the reference's compact thick beveled uppercase letters, dark metal surface, scratches, embossed depth and aged warm bronze frame. Under the main sign attach a narrow EMPTY smaller dark bronze subtitle plaque with a few bolts, no text in the subtitle plaque. Main sign and lower empty plaque form one compact coherent object. Isolate only the sign, plaque and chains. No character, no clock, no buildings, no pipes outside frame, no background, no navigation or buttons. True transparent alpha around the whole irregular object, no opaque rectangular plate behind it, minimal transparent margins 4 percent. Very sharp AAA game UI rendering, no blur.

### check-button

Transparent background: yes.

Use case: stylized-concept. Asset type: one standalone game UI button frame, genuine transparent alpha. Use the GREEN engineering button from the reference as the design to redraw. Render a wide compact 2048x1024 landscape isolated asset at extremely high detail. Dark emerald-green blank rectangular face with chamfered corners, heavy scratched steel and bronze border, many rivets, short copper pipes around the edge with glowing green fluid, a chunky lime green gear icon INSIDE THE LEFT QUARTER of the button face. Leave the remaining 70 percent of the face COMPLETELY EMPTY and dark green for real HTML text later. No words, no letters, no numbers, no arrows. The main button face is horizontally centered and located between approximately 35 percent and 75 percent of the image height; clear and spacious for text. All pipes and outer decorations fit inside the canvas with 4 percent transparent margin. Clean front-on camera, symmetrical readable silhouette, tight well-controlled green accents, warm metal lighting, authentic detailed fantasy goblin machinery as in reference. Entire canvas outside the button silhouette must have genuine alpha transparency: no workbench, no environment, no background, no shadow rectangle, no other controls, no blur. Redraw at native high resolution, do not upscale a crop.

### forecast-button

Transparent background: yes.

Use case: stylized-concept. Asset type: one standalone purple oracle UI button frame with genuine alpha transparency. Use the purple eye button in the reference as design/style reference. Redraw only that ornate frame from scratch at 2048x1024 landscape, exceptionally crisp high-quality game UI art. A wide dark purple blank face with gently pointed curved ends, sharp golden filigree and claw-like corner edges, a large vertical slit amber-orange eye centered ABOVE the button, purple fabric banners at both sides, a small hanging violet-and-gold pendant centered below, restrained purple arcane sparks. No words, no letters, no numbers, no arrows. Keep the central 75 percent of the purple face empty and uniformly dark for real HTML text. The usable face should occupy roughly x14%-86%, y46%-76% of the canvas; the eye and pointed purple spires sit above it. Every edge and decoration within frame, 4 percent transparent margins. Front-on camera, crisp metal highlights, rich violet silk texture, beautiful detailed carved gold, no blur. Transparent alpha outside the irregular button and eye silhouette. No background, no table, no crystal ball, no other objects, no opaque rectangular backdrop. Redraw at native high resolution, do not upscale the reference crop.

### oracle-prop

Transparent background: yes.

Use case: stylized-concept. Asset type: standalone foreground decorative prop for a fantasy website, genuine transparent alpha. Use the crystal-ball still life at lower right of the reference for style and composition. Redraw as a high-quality crisp 1536x2048 portrait object. Luminous transparent violet crystal ball with tiny star-like flecks and restrained magical swirls, in an ornate aged bronze/gold claw-foot stand. Below it is a small rugged wooden chest/table draped in dark purple velvet with a gold embroidered stylized eye symbol (no writing). A small closed purple spellbook and two short warm candles rest beside the orb. Compact balanced still life with plenty of clean negative space around the silhouette, all edges fully in canvas. The crystal sphere occupies the upper half, cabinet and velvet the lower half. Sharp detailed glass, leather, wood grain and embroidery; no photographic background blur, no bloom obscuring outlines. Same green/amber/violet fantasy game world as reference. No text, no title sign, no UI button, no character, no background wall or ground plane, only isolated object with genuine transparent alpha and crisp edges.

### workshop-wall

Transparent background: no.

Create a standalone PORTRAIT 3:4 background environment panel, newly redraw the LEFT engineering workshop environment in the reference with the same exact sharp richly painted Warcraft-like fantasy style and warm amber plus acid green colors. This is NOT a cut crop: redraw close-up with fine large-scale detail. Fill this vertical panel with a huge riveted green-glowing alchemy boiler, chains hanging, brass gears, wood beams, lantern in upper left, pipes, spanners, copper fittings. Three-dimensional convincing workshop room. Lively but dark and balanced exposure. Rightmost 20% of this panel becomes dark quiet wooden wall so CSS can blend it into the central dark interface backdrop. Deep focus with every rivet, wood grain, pipe, cog and background edge crisply resolved. No blur or haze, no bokeh, no fog, no tilt shift, no smearing. No people, no characters, no signs, no lettering, no text, no game UI, no buttons, no logo. Portrait 3:4 composition.

### carnival-wall

Transparent background: no.

Create a standalone PORTRAIT 3:4 background environment panel, newly redraw the RIGHT mysterious carnival area in the reference with the same exact sharp richly painted Warcraft-like fantasy style and royal purple with warm gold colors. This is NOT a cut crop: redraw close-up with fine large-scale detail. Fill this vertical panel with a wonderful night carnival seen through wooden workshop arch, an elaborate purple and gold carnival gate with a stylized glowing orange slit eye, pointed purple tents, moon high above, tiny amber lantern string lights, wood beams at sides, crates and purple ribbons. Three-dimensional convincing room opening onto carnival, not a flat poster. Lively but dark and balanced exposure. Leftmost 20% of this panel becomes dark quiet wooden wall so CSS can blend it into the central dark interface backdrop. Deep focus with every wood grain, fabric seam, gold ornament and background edge crisply resolved. No blur or haze, no bokeh, no fog, no tilt shift, no smearing. No people, no characters, no crystal ball, no signs, no lettering, no text, no game UI, no buttons, no logo. Portrait 3:4 composition.

