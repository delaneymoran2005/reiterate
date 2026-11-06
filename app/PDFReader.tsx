"use client";

import { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type HighlightRect = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SavedHighlight = {
  id: string;
  text: string;
  page: number;
  rects: HighlightRect[];
};

type Bookmark = {
  text: string;
  page: number;
};

export default function PDFReader({ file }: { file: File }) {
  const [numPages, setNumPages] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPage, setSelectionPage] = useState(1);
  const [selectionRects, setSelectionRects] = useState<
    HighlightRect[]
  >([]);

  const [toolbar, setToolbar] = useState({ x: 0, y: 0 });

  const [highlights, setHighlights] = useState<
    SavedHighlight[]
  >([]);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const readerRef = useRef<HTMLDivElement>(null);

  // Detect selected text and record its position.
  function handleSelection() {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !readerRef.current) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    const range = selection.getRangeAt(0);

    if (!readerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const pageElements = readerRef.current.querySelectorAll(
      "[data-page-number]"
    );

    const newRects: HighlightRect[] = [];

    // Record the selected text's position on each PDF page.
    pageElements.forEach((element) => {
      const pageRect = element.getBoundingClientRect();
      const page = Number(element.getAttribute("data-page-number"));

      Array.from(range.getClientRects()).forEach((rect) => {
        // Ignore empty rectangles.
        if (rect.width < 1 || rect.height < 1) return;

        const left = Math.max(rect.left, pageRect.left);
        const right = Math.min(rect.right, pageRect.right);
        const top = Math.max(rect.top, pageRect.top);
        const bottom = Math.min(rect.bottom, pageRect.bottom);

        if (right <= left || bottom <= top) return;

        newRects.push({
          page,
          x: (left - pageRect.left) / pageRect.width,
          y: (top - pageRect.top) / pageRect.height,
          width: (right - left) / pageRect.width,
          height: (bottom - top) / pageRect.height,
        });
      });
    });

    if (newRects.length === 0) return;

    const firstPage = newRects[0].page;
    const selectionBox = range.getBoundingClientRect();
    const readerBox = readerRef.current.getBoundingClientRect();

    setSelectedText(text);
    setSelectionPage(firstPage);
    setSelectionRects(newRects);
    setShowExplanation(false);

    setToolbar({
      x: selectionBox.left - readerBox.left +
        selectionBox.width / 2,
      y: selectionBox.top - readerBox.top - 55,
    });
  }

  // Save the selected passage and its coordinates.
  function saveHighlight() {
    if (!selectedText || selectionRects.length === 0) return;

   setHighlights((previous) => [
  ...previous,
  {
    id: crypto.randomUUID(),
    text: selectedText,
    page: selectionPage,
    rects: selectionRects,
  },
]);

    clearSelection();
  }
function removeHighlight(id: string) {
  setHighlights((previous) =>
    previous.filter((highlight) => highlight.id !== id)
  );
}
  function saveBookmark() {
    if (!selectedText) return;

    setBookmarks((previous) => [
      ...previous,
      {
        text: selectedText,
        page: selectionPage,
      },
    ]);

    clearSelection();
  }

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelectedText("");
    setSelectionRects([]);
    setShowExplanation(false);
  }

return (
  <div className="flex flex-col gap-6">
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setLibraryOpen(!libraryOpen)}
        className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
      >
        {libraryOpen ? "Close Library" : "My Library"}
      </button>
    </div>

      <div
        ref={readerRef}
        onMouseUp={handleSelection}
        className="relative min-w-0 rounded-xl bg-slate-200 p-4"
      >

        {/* Floating toolbar */}
        {selectedText && (
          <div
            className="absolute z-50 flex -translate-x-1/2 gap-2 rounded-xl bg-slate-900 p-2 text-white shadow-xl"
            style={{
              left: toolbar.x,
              top: Math.max(0, toolbar.y),
            }}
          >
            <button
              onClick={saveHighlight}
              className="rounded px-3 py-2 hover:bg-slate-700"
            >
              Highlight
            </button>

            <button
              onClick={() => setShowExplanation(true)}
              className="rounded px-3 py-2 hover:bg-slate-700"
            >
              Reiterate
            </button>

            <button
              onClick={saveBookmark}
              className="rounded px-3 py-2 hover:bg-slate-700"
            >
              Bookmark
            </button>
          </div>
        )}

        {/* Explanation placeholder */}
        {showExplanation && (
          <div className="relative z-10 mb-4 rounded-xl bg-white p-4 shadow">
            <h3 className="font-bold">Reiterate explains</h3>

            <p className="mt-2 text-sm">{selectedText}</p>

            <p className="mt-3 text-slate-500">
              AI explanations will appear here soon.
            </p>

            <button
              onClick={clearSelection}
              className="mt-3 text-sm text-indigo-600"
            >
              Close
            </button>
          </div>
        )}

        {/* PDF document */}
        <Document
          file={file}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<p>Loading PDF...</p>}
        >
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <div
                key={pageNumber}
                data-page-number={pageNumber}
                className="relative mb-4 w-fit max-w-full bg-white shadow"
              >
                <Page
                  pageNumber={pageNumber}
                  width={600}
                  renderTextLayer
                  renderAnnotationLayer
                />

                {/* Clickable yellow highlights */}
<div className="pointer-events-none absolute inset-0">
  {highlights.flatMap((highlight) =>
    highlight.rects
      .filter((rect) => rect.page === pageNumber)
      .map((rect, rIndex) => (
        <button
          key={highlight.id + "-" + rIndex}
          type="button"
          title="Remove highlight"
          aria-label="Remove highlight"
          onClick={() => removeHighlight(highlight.id)}
          className="pointer-events-auto absolute cursor-pointer bg-yellow-200/20 hover:bg-yellow-300/35"
          style={{
            left: rect.x * 100 + "%",
            top: rect.y * 100 + "%",
            width: rect.width * 100 + "%",
            height: rect.height * 100 + "%",
          }}
        />
      ))
  )}
</div>
              </div>
            );
          })}
        </Document>
      </div>

      {/* Saved passages sidebar */}
<aside
  className={
    libraryOpen
      ? "order-first rounded-xl border border-indigo-200 bg-white p-5 shadow-sm"
      : "hidden"
  }
>

        <h3 className="mt-6 font-semibold">
          Highlights ({highlights.length})
        </h3>

        {highlights.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">
            No highlights yet.
          </p>
        )}

        {highlights.map((item) => (
  <div
    key={item.id}
    className="mt-3 rounded-lg bg-yellow-100 p-3 text-sm"
  >
    <p className="font-semibold">Page {item.page}</p>

    <p className="mt-1">{item.text}</p>

    <button
      type="button"
      onClick={() => removeHighlight(item.id)}
      className="mt-3 text-sm font-medium text-red-600 hover:underline"
    >
      Remove highlight
    </button>
  </div>
))}

        <h3 className="mt-6 font-semibold">
          Bookmarks ({bookmarks.length})
        </h3>

        {bookmarks.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">
            No bookmarks yet.
          </p>
        )}

        {bookmarks.map((item, index) => (
          <div
            key={index}
            className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm"
          >
            <p className="font-semibold">Page {item.page}</p>
            <p className="mt-1">{item.text}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
