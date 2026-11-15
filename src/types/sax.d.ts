// Parser-only SAX API used by the cross-platform KML importer.
declare module "sax" {
  interface SAXParser {
    ontext?: (text: string) => void;
    oncdata?: (text: string) => void;
    onopentag?: (node: {
      name: string;
      attributes: Record<string, string>;
    }) => void;
    onclosetag?: (name: string) => void;
    write(text: string): SAXParser;
    close(): SAXParser;
  }
  export function parser(
    strict: boolean,
    options?: { position?: boolean },
  ): SAXParser;
}
