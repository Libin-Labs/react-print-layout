# @lp-labs/react-print-layout

Explicit paper-sized React layouts and screen previews for React 18.2 and 19.
Declare your own page boundaries, headers, and footers. This package does **not**
measure content or guarantee automatic pagination. React is the only peer and
there are no runtime dependencies.

## Install and use

```sh
npm install @lp-labs/react-print-layout react
```

```tsx
import {
  PrintLayout,
  PrintPage,
  printDocument,
} from "@lp-labs/react-print-layout";
import "@lp-labs/react-print-layout/style.css";

export function Invoice() {
  return (
    <>
      <div className="screen-controls">
        <button onClick={() => printDocument()}>Print invoice</button>
      </div>
      <PrintLayout
        size="A4"
        margins={{ top: 12, bottom: 12 }}
        onBeforePrint={() => console.log("Print dialog opening")}
        onAfterPrint={() => console.log("Print dialog closed")}
      >
        <PrintPage label="Invoice page 1" header={<h1>Invoice</h1>} footer="Page 1 of 2">
          <p>First page items.</p>
        </PrintPage>
        <PrintPage label="Invoice page 2" header="Invoice continued" footer="Page 2 of 2">
          <p>Additional items.</p>
        </PrintPage>
      </PrintLayout>
    </>
  );
}
```

Hide unrelated UI with application CSS, for example:

```css
@media print {
  .screen-controls { display: none; }
  body { margin: 0; }
}
```

Printing targets the **entire document**, not just the layout. You must hide
navigation, controls, and other unwanted content yourself.

## Components and exported types

`PaperSize = "A4" | "A5" | "Letter" | "Legal"`;
`PageOrientation = "portrait" | "landscape"`;
`PageMargins = { top: number; right: number; bottom: number; left: number }`;
`PageDimensions = { width: number; height: number }`. All measurements are mm.

`PrintLayout(props: PrintLayoutProps)`:

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `children` | `ReactNode` | Required; normally explicit PrintPage elements. |
| `size` | `PaperSize` | `"A4"` |
| `orientation` | `PageOrientation` | `"portrait"` |
| `margins` | `number \| Partial<PageMargins>` | `16`; omitted object edges also default to 16. Zero is allowed. |
| `preview` | `boolean` | `true`; paper canvas/background/shadow on screen. False removes screen paper sizing; print layout remains. |
| `className` | `string` | `""`; appended to `lp-print-layout`. |
| `style` | `CSSProperties` | Omitted; overrides layout styles including custom properties. |
| `onBeforePrint` | `() => void` | Optional; owning window's beforeprint event. |
| `onAfterPrint` | `() => void` | Optional; owning window's afterprint event, not confirmation of successful printing. |

The layout emits a validated numeric `@page` size rule with zero browser page
margin; content margins use page padding instead. `RangeError` is thrown for
unsupported size/orientation, negative/nonfinite margins, or margins leaving no
positive content area. Window event listeners are cleaned up on unmount.

`PrintPage(props: PrintPageProps)`:

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `children` | `ReactNode` | Required; page body in a flex-growing content element. |
| `header` | `ReactNode` | Omitted; no header. Rendered once for this explicit page. |
| `footer` | `ReactNode` | Omitted; no footer. Rendered once after content. |
| `label` | `string` | `"Print page"`; accessible section label. |
| `className` | `string` | `""`; appended to `lp-print-page`. |
| `style` | `CSSProperties` | Omitted; per-page overrides. |

Headers and footers are ordinary flow content, not running print elements.
Use unique page labels and semantic headings. Page numbering is caller-provided.
String children are escaped normally by React.

## Helpers (all exported)

- `getPageDimensions(size: PaperSize = "A4", orientation: PageOrientation =
  "portrait"): PageDimensions` returns a new object. Portrait dimensions:
  A4 210 x 297, A5 148 x 210, Letter 215.9 x 279.4, Legal 215.9 x 355.6.
  Landscape swaps width and height. Invalid values throw `RangeError`.
- `normalizeMargins(margins: number | Partial<PageMargins> = 16): PageMargins`
  returns a new object with all four edges. Missing edges use 16. Negative or
  nonfinite edges throw `RangeError`. This helper does not check against paper
  dimensions; PrintLayout performs that additional check.
- `printDocument(target?: Pick<Window, "print">): void` invokes the provided
  window's print method or the current browser window's method. A missing window
  or nonfunction print method throws `Error`. Native print errors propagate.
  It does not return a PDF or a print-success result. It needs a user gesture in
  browsers that restrict print dialogs; call it from an action handler.

```tsx
import { getPageDimensions, normalizeMargins } from "@lp-labs/react-print-layout";

const paper = getPageDimensions("Letter", "landscape");
const margins = normalizeMargins({ left: 20, right: 20 });
const usableWidth = paper.width - margins.left - margins.right;
console.log(`Content width: ${usableWidth}mm`);
```

## CSS and print limitations

The CSS import is required for layout. Customize `.lp-print-page`,
`.lp-print-header`, `.lp-print-content`, `.lp-print-footer`, and
`--print-preview-background`. Generated layout variables are `--print-width`,
`--print-height`, and `--print-top/right/bottom/left`. Avoid overriding these unless
you also control matching paper rules. Fixed paper width may scroll on small
screens; no preview scaling is performed.

Only mount one active PrintLayout configuration per document: `@page` is global,
so multiple conflicting layouts use normal stylesheet precedence. No scoped print
iframe, portal, global body mutation, or automatic hiding is performed. Importing
or server-rendering the components does not access window; effects attach only
after mounting. Inline style rules may require your CSP to permit inline styles;
there is no nonce prop.

Each explicit page requests a break after itself except the last direct page
child. Keep PrintPage elements direct children. Paper height is a **minimum**:
overflow can create extra physical pages and move footers. Content is not clipped,
split into measured pages, or automatically repeated. Browser print engines,
fonts, image loading, printer margins, scaling, user print settings, and OS PDF
drivers can change results or ignore CSS paper size. Disable browser-generated
headers/footers in the print dialog if undesired. Verify output in your target
browsers and printers; screen preview is not a physical-page guarantee.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
