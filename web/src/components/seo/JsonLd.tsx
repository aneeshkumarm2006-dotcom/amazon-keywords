import { graph, type JsonLdNode } from "@/lib/structured-data";

/**
 * Emits one `application/ld+json` block.
 *
 * This is a server component and the payload is built from the content
 * modules at build time, never from user input — but `</script>` inside a
 * string would still close the tag early and break the page, so the two
 * characters that can do that are escaped. `JSON.stringify` handles the rest.
 */

export interface JsonLdProps {
  /** One node, or several to wrap in a `@graph`. */
  data: JsonLdNode | JsonLdNode[];
  /** Stable `id` so a page can carry more than one block. */
  id?: string;
}

function serialise(data: JsonLdNode | JsonLdNode[]): string {
  const payload = Array.isArray(data)
    ? data.length === 1
      ? { "@context": "https://schema.org", ...data[0] }
      : graph(data)
    : "@context" in data
      ? data
      : { "@context": "https://schema.org", ...data };

  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ data, id }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}
