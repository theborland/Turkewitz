import { parseCsv, prepareStudents } from './csv.js';
import { createCombinedPdf } from './pdf.js';
import './styles.css';

const templateUrl = `${import.meta.env.BASE_URL}templates/initial-eligibility-template.pdf`;
const fileInput = document.querySelector('#csv-file');
const yearInput = document.querySelector('#intake-year');
const fileSummary = document.querySelector('#file-summary');
const generateButton = document.querySelector('#generate-button');
const status = document.querySelector('#status');
const progress = document.querySelector('#progress');

let selectedFile = null;
let selectedRows = [];
let students = [];

yearInput.value = String(new Date().getFullYear());

function showError(message) {
  status.textContent = message;
  status.classList.add('status-error');
}

function showSuccess(message) {
  status.textContent = message;
  status.classList.remove('status-error');
}

function getYear() {
  const year = Number(yearInput.value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Enter a valid intake year between 2000 and 2100.');
  }
  return year;
}

function updateGenerateButton() {
  generateButton.disabled = !selectedFile || students.length === 0;
}

fileInput.addEventListener('change', async () => {
  selectedFile = null;
  selectedRows = [];
  students = [];
  updateGenerateButton();
  const [file] = fileInput.files ?? [];
  if (!file) {
    fileSummary.textContent = 'No CSV selected.';
    showSuccess('Choose a CSV to get started.');
    return;
  }

  try {
    const yearFromName = file.name.match(/\b(20\d{2})\b/);
    if (yearFromName) yearInput.value = yearFromName[1];
    selectedFile = file;
    selectedRows = parseCsv(await file.text());
    const preparedStudents = prepareStudents(selectedRows, getYear());
    students = preparedStudents;
    fileSummary.textContent = `${file.name} — ${students.length} student${students.length === 1 ? '' : 's'} ready.`;
    showSuccess('Ready to create the combined PDF.');
    updateGenerateButton();
  } catch (error) {
    fileSummary.textContent = `${file.name} could not be used.`;
    showError(error instanceof Error ? error.message : 'The CSV could not be read.');
  }
});

yearInput.addEventListener('change', () => {
  if (!selectedFile) return;
  try {
    students = prepareStudents(selectedRows, getYear());
    showSuccess('Ready to create the combined PDF.');
    updateGenerateButton();
  } catch (error) {
    students = [];
    updateGenerateButton();
    showError(error instanceof Error ? error.message : 'The intake year could not be applied.');
  }
});

async function loadTemplate() {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('The PDF template could not be loaded. Refresh the page and try again.');
  }
  return new Uint8Array(await response.arrayBuffer());
}

function downloadPdf(bytes, fileName) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

generateButton.addEventListener('click', async () => {
  if (!selectedFile || !students.length) return;
  generateButton.disabled = true;
  progress.hidden = false;
  progress.value = 0;

  try {
    showSuccess('Loading the form template…');
    const templateBytes = await loadTemplate();
    const bytes = await createCombinedPdf(templateBytes, students, (complete, total) => {
      progress.value = Math.round((complete / total) * 100);
      showSuccess(`Creating letter ${complete} of ${total}…`);
    });
    const csvBaseName = selectedFile.name.replace(/\.csv$/i, '').replace(/[^\w-]+/g, '-');
    downloadPdf(bytes, `Initial-Eligibility-Letters-${csvBaseName || 'students'}.pdf`);
    showSuccess(`Done. Downloaded ${students.length} two-page student letters.`);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'The letters could not be created.');
  } finally {
    generateButton.disabled = false;
    progress.hidden = true;
  }
});
