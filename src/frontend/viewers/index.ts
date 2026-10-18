// Registers every viewer. Import this module once (the renderer entry does it) before using the registry.
import docxViewer from "./docx"
import pdfViewer from "./pdf"
import { registerViewer } from "./registry"
import xlsxViewer from "./xlsx"

;[pdfViewer, docxViewer, xlsxViewer].forEach(registerViewer)

export * from "./registry"
export * from "./types"
