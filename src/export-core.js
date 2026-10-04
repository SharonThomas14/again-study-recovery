import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import pptxgen from "pptxgenjs";
export function latexDocument(title, text) {
  const escape = (s) =>
    String(s).replace(
      /[\\{}$&#%_^~]/g,
      (c) =>
        ({
          "\\": "\\textbackslash{}",
          "{": "\\{",
          "}": "\\}",
          $: "\\$",
          "&": "\\&",
          "#": "\\#",
          "%": "\\%",
          _: "\\_",
          "^": "\\textasciicircum{}",
          "~": "\\textasciitilde{}",
        })[c],
    );
  return (
    "\\documentclass[11pt]{article}\n\\usepackage[margin=1in]{geometry}\n\\usepackage{fontspec}\n\\setmainfont{Latin Modern Roman}\n\\title{" +
    escape(title) +
    "}\n\\date{}\n\\begin{document}\n\\maketitle\n" +
    text.split("\n").map(escape).join("\n\n") +
    "\n\\end{document}\n"
  );
}
export async function reportBlob(title, text) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
          ...text
            .split("\n")
            .map(
              (t) =>
                new Paragraph({
                  children: [new TextRun(t)],
                  spacing: { after: 160 },
                }),
            ),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
export function presentation(title, slides) {
  const deck = new pptxgen();
  deck.layout = "LAYOUT_WIDE";
  deck.author = "ReStrive";
  deck.subject = title;
  deck.title = title;
  deck.lang = "en-AU";
  slides.forEach((item, i) => {
    const slide = deck.addSlide();
    slide.background = { color: i === 0 ? "24271E" : "F6F4EC" };
    const ink = i === 0 ? "F6F4EC" : "24271E";
    slide.addText("RESTRIVE / " + String(i + 1).padStart(2, "0"), {
      x: 0.65,
      y: 0.35,
      w: 11,
      h: 0.3,
      fontSize: 10,
      color: i === 0 ? "EEA18A" : "77796E",
      charSpacing: 2,
    });
    slide.addText(item.title, {
      x: 0.65,
      y: 1,
      w: 11.9,
      h: 1.15,
      fontFace: "Aptos Display",
      fontSize: 32,
      bold: true,
      color: ink,
      breakLine: false,
      fit: "shrink",
    });
    slide.addShape(deck.ShapeType.line, {
      x: 0.65,
      y: 2.4,
      w: 1,
      h: 0,
      line: { color: "E75C3D", width: 4 },
    });
    slide.addText(item.body, {
      x: 0.65,
      y: 2.8,
      w: 11.5,
      h: 3.4,
      fontFace: "Aptos",
      fontSize: 23,
      color: ink,
      paraSpaceAfterPt: 16,
      fit: "shrink",
      valign: "top",
    });
    slide.addNotes(item.notes || "");
  });
  return deck;
}
