import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/site";

/**
 * The shared social card, rendered once at build time into
 * `out/opengraph-image.png`. `next/og` ships with Next, so this adds no
 * dependency, and because nothing here is request-dependent the route is
 * statically generated like every other page in the export.
 *
 * The palette is the light theme from `globals.css`, spelled out in hex
 * because satori has no access to the stylesheet or to CSS variables.
 */

export const alt =
  "PPC Academy — Amazon PPC training for Filipino virtual assistants";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#fbfaf8";
const INK = "#10141c";
const MUTED = "#545c6b";
const BRAND = "#0e7c66";
const EMBER = "#e5641e";
const HAIRLINE = "#e4e0d8";

const STATS: { value: string; label: string }[] = [
  { value: "126", label: "Quiz questions" },
  { value: "117", label: "Interview Q&As" },
  { value: "12", label: "Case studies" },
  { value: "8", label: "SOPs" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: BRAND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            PA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: INK, letterSpacing: -0.4 }}>
              {SITE_NAME}
            </div>
            <div style={{ fontSize: 17, color: MUTED }}>
              Free and open source · Built for Filipino VAs
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 66,
              lineHeight: 1.06,
              fontWeight: 700,
              color: INK,
              letterSpacing: -2,
              maxWidth: 940,
              display: "flex",
            }}
          >
            Learn Amazon PPC the way the job actually works.
          </div>
          <div style={{ fontSize: 27, lineHeight: 1.4, color: MUTED, maxWidth: 900, display: "flex" }}>
            Graded quizzes, interview prep, real account case studies, SOPs, workflows and
            live ACoS maths — all in the browser, nothing to install.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `2px solid ${HAIRLINE}`,
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", gap: 52 }}>
            {STATS.map((stat) => (
              <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: BRAND, letterSpacing: -1 }}>
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: MUTED,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: EMBER }} />
            <div style={{ fontSize: 19, color: INK, fontWeight: 600 }}>
              Ryan Roland Dabao
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}

export const dynamic = "force-static";
