# Design system

The interface is built on MUBCS, the MeskikCode Unified Brand and Component System, in its **field** theme: the one made for handhelds used outdoors, with gloves, in direct sunlight.

## Tokens

`src/styles/tokens/` holds the system's token files, copied unchanged: colours, typography, spacing, geometry, elevation, motion, semantic roles and base styles. `src/app/globals.css` maps Tailwind's theme onto them, and removes Tailwind's default palette, so a component can only reach a colour the design system defines.

Two files are specific to this application:

- `tokens/field.css` names a few values that the system's field kit uses as literals (tile and border colours on the dark canvas, status inks), so that no component carries a raw colour.
- `fonts.css` declares the font files this application ships (see below).

The only raw colour values outside the token files are the theme colour in the web manifest and the viewport metadata, which cannot read a CSS variable. Both are the field ink token, `#050A14`.

## Field rules applied

| Rule | Where |
| --- | --- |
| Dark canvas, `--field-ink` ground | `<html data-theme="dark">`, `body` |
| 56px targets for gloved hands | Status buttons, shift and date controls, primary actions, language rows |
| 2px borders on tiles | Status buttons, team filter, steppers |
| Radius: 4px chips, 6px controls, 10px cards, 14px dialogs. No pills | Throughout |
| Press feedback `scale(.97)` in 80ms; no decorative motion | `press` utility; `prefers-reduced-motion` honoured |
| Focus is never removed: 3px cyan ring | `:focus-visible` from the base tokens |
| Cyan marks interactive intent only; one primary action per view | Export is the only filled cyan button |
| Status by colour and icon, never emoji | Green present, blue half day, amber late, red absent |
| Hazard yellow reserved for hazard actions | Not used: this application has none |
| Uppercase is structural: labels, badges, field actions | `caps` utility |
| Numbers mono, tabular, left to right in every language | `num` utility |
| Offline is a state, not an error | Status bar rule turns red; a calm notice, no blocking |

## Components

`src/components/ui/` ports the system's components from inline styles to Tailwind classes over the tokens, keeping their documented variants and sizes: `Button` (including the `field` size), `IconButton`, `Badge`, `Alert`, `Dialog`, `FormField`, `Input`, `Select`. `FieldStatusBar` follows the system's component of the same name.

Changes made in the port:

- **Logical properties throughout.** The originals position some parts with `left` and `right`; here everything uses `start` and `end`, so the layout mirrors in Arabic.
- **`Dialog` uses the native `<dialog>` element**, which gives the focus trap, Escape to close and an inert page behind. On phones it is a sheet attached to the bottom edge, within thumb reach; from 640px it is the system's centred 480px panel.
- **The status bar is 56px tall**, not 46px, so that the language button inside it is a full-size target.
- **A five-language picker** replaces the system's three-way `LangSwitch`, which is too small for five entries on a gloved screen.

## Typography and scripts

| Script | Family | Source |
| --- | --- | --- |
| Latin, display | Chakra Petch | MUBCS |
| Latin, interface | Montserrat | MUBCS |
| Numbers and identifiers | JetBrains Mono | MUBCS |
| Arabic | IBM Plex Sans Arabic | MUBCS |
| Tifinagh | Noto Sans Tifinagh | **Extension** |

Tifinagh is not covered by the four families of the design system. Noto Sans Tifinagh was added for Tamazight; this is an extension of MUBCS made for this application, documented here so it can be taken back into the system.

Arabic and Tifinagh have no letter case and never carry letter-spacing: under `lang="ar"` and `lang="zgh"` the label tracking is zero and the line height is looser. Noto Sans Tifinagh exists in one weight, and `font-synthesis: none` prevents the browser from faking a bold.

All fonts are self-hosted and bundled, limited to the subsets and weights the application renders (about 270 KB for five scripts). All are under the SIL Open Font License.

## Responsive behaviour

Mobile first. The base styles are the phone layout; wider screens add columns.

| Width | Layout |
| --- | --- |
| from 320px | One column. Team filter scrolls sideways. Actions fixed to the bottom edge |
| from 640px | Dialogs become centred panels. Team filter wraps |
| from 768px | Two columns of employees |
| from 1024px | Date and shift on one row; actions join the toolbar |
| from 1280px | Three columns |
| from 1536px | Date, shift and actions on a single row |
| from 1680px | Four columns |

Labels wrap rather than clip in longer languages. `npm run audit:layout` opens the built application at twelve widths in all five languages and reports any sideways scroll or clipped button; the end-to-end tests assert the same.

## Brand assets

`public/brand/mark.png` and `scripts/brand/logo-lockup-square.png` are the MeskikCode mark and square lockup. The application icons are generated from the lockup by `npm run icons`, which only resizes it. The logo is never redrawn or recoloured. The name and logo are not covered by the MIT licence.
