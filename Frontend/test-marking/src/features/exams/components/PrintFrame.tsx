import type { ReactNode } from "react";

/**
 * Page margins of a printed sheet without using the margin of @page.
 *
 * Why: a browser prints its own header and footer (date, tab title, address, page number) inside the margin of the page, and only
 * when that margin is bigger than 0. So @page keeps margin 0 and the white space above and below comes from this frame: the browser
 * repeats a table header and footer on every printed page, which gives every page of a long exam the same top and bottom space.
 * The space left and right is the padding of the sheet itself. On the screen the frame adds nothing.
 */
export const PRINT_FRAME_CSS = `
.pf-table { width: 100%; border-collapse: collapse; border: 0; }
.pf-table > thead, .pf-table > tfoot { display: none; }
.pf-table > thead > tr > td, .pf-table > tbody > tr > td, .pf-table > tfoot > tr > td { padding: 0; border: 0; background: transparent; }
@media print {
  @page { size: A4; margin: 0; }
  html, body, #root { background: #fff !important; height: auto !important; overflow: visible !important; }
  .no-print { display: none !important; }
  .pf-table > thead { display: table-header-group; }
  .pf-table > tfoot { display: table-footer-group; }
  .pf-gap { height: 16mm; }
}
`;

export function PrintFrame({ children }: { children: ReactNode }) {
  return (
    <table className="pf-table">
      <thead><tr><td><div className="pf-gap" /></td></tr></thead>
      <tbody><tr><td>{children}</td></tr></tbody>
      <tfoot><tr><td><div className="pf-gap" /></td></tr></tfoot>
    </table>
  );
}
