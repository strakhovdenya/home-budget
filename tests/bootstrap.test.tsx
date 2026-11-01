import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HomePage from "../src/app/page";

describe("HB-004 bootstrap page", () => {
  it("renders an accessible title and explains the current product stage", () => {
    const html = renderToStaticMarkup(<HomePage />);

    expect(html).toContain('<section aria-labelledby="home-title">');
    expect(html).toContain('<h1 id="home-title">Home Budget</h1>');
    expect(html).toContain("Основа приложения готова.");
    expect(html).toContain("Финансовые функции появятся в следующих задачах.");
  });
});
