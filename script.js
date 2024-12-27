document.addEventListener("DOMContentLoaded", () => {
  // Get references to elements
  const imageInput = document.getElementById("imageInput");
  const convertImagesBtn = document.getElementById("convertImagesBtn");
  const imageProgress = document.getElementById("imageProgress");
  const saveImagesToDirectory = document.getElementById("saveImagesToDirectory");

  const pdfInput = document.getElementById("pdfInput");
  const mergePdfBtn = document.getElementById("mergePdfBtn");
  const mergeProgress = document.getElementById("mergeProgress");
  const saveMergedToDirectory = document.getElementById("saveMergedToDirectory");

  // 1) Convert multiple images to a single PDF using jsPDF
  convertImagesBtn.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF();

    const files = imageInput.files;
    if (!files.length) {
      alert("Please select at least one image.");
      return;
    }

    // Reset progress
    imageProgress.value = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await fileToDataUrl(file);

      // If we're not on the first page, add a new page
      if (i > 0) pdfDoc.addPage();

      // Attempt to add the image (maintaining aspect ratio)
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      pdfDoc.addImage(
        dataUrl,
        "JPEG",
        10,
        10,
        pageWidth - 20,
        0 // set height to 0 for auto aspect ratio
      );

      // Update progress bar
      imageProgress.value = ((i + 1) / files.length) * 100;
    }

    // Final PDF as Uint8Array
    const pdfBytes = pdfDoc.output("arraybuffer");

    // Check if user wants to save to directory (and if the API is available)
    if (saveImagesToDirectory.checked && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const fileHandle = await dirHandle.getFileHandle("converted_images.pdf", { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(pdfBytes);
        await writable.close();
        alert("Images PDF saved to chosen folder!");
      } catch (err) {
        console.error(err);
        alert("Failed to save. Check console for details.");
      }
    } else {
      // Fallback: use normal browser download
      downloadBlob(pdfBytes, "converted_images.pdf", "application/pdf");
    }
  });

  // 2) Merge multiple PDFs into one using PDF-LIB
  mergePdfBtn.addEventListener("click", async () => {
    const files = pdfInput.files;
    if (!files.length) {
      alert("Please select at least one PDF file.");
      return;
    }

    const { PDFDocument } = PDFLib;
    const mergedPdf = await PDFDocument.create();

    // Reset progress
    mergeProgress.value = 0;

    // Merge each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const pdf = await PDFDocument.load(arrayBuffer);

      // Copy all pages
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));

      // Update progress bar
      mergeProgress.value = ((i + 1) / files.length) * 100;
    }

    // Convert merged document to bytes
    const mergedPdfBytes = await mergedPdf.save();

    // Check if user wants to save to directory (and if the API is available)
    if (saveMergedToDirectory.checked && "showDirectoryPicker" in window) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const fileHandle = await dirHandle.getFileHandle("merged_documents.pdf", { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(mergedPdfBytes);
        await writable.close();
        alert("Merged PDF saved to chosen folder!");
      } catch (err) {
        console.error(err);
        alert("Failed to save merged PDF. Check console for details.");
      }
    } else {
      // Fallback: normal download
      downloadBlob(mergedPdfBytes, "merged_documents.pdf", "application/pdf");
    }
  });

  /**
   * Helper function: convert a File object (image) to a base64 data URL
   */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Helper function: read a file into an ArrayBuffer for PDF merging
   */
  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Helper function: download data (Uint8Array) as a file in the browser
   */
  function downloadBlob(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});
