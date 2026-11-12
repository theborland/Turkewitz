import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { prepareStudents, parseCsv } from './csv.js';
import { createCombinedPdf, fillStudentForm } from './pdf.js';

const templateBytes = await readFile(
  new URL('../public/templates/initial-eligibility-template.pdf', import.meta.url),
);
const headers = [
  'Intake Appt Date', 'Student LAST', 'Student FIRST', 'DOB', 'GR', 'SCH',
  'ML Service', 'ID or OLR', 'Test Type', 'Oral', 'Overall',
].join(',');

function makeStudents(records) {
  const contents = [headers, ...records].join('\n');
  return prepareStudents(parseCsv(contents), 2026);
}

test('fills form text fields and assessment checkboxes', async () => {
  const [student] = makeStudents([
    '10/13 1000 T,Doe,Alex,01/02/2018,2,TAL,IELD,1001,WIDA SCREENER,2.0,3.5',
  ]);
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const form = pdf.getForm();
  fillStudentForm(form, student, font);

  assert.equal(form.getTextField('Text1').getText(), 'Alex Doe');
  assert.equal(form.getTextField('Text2').getText(), 'Gerald E. Talbot Community School');
  assert.equal(form.getTextField('Text10').getText(), 'Composite: 3.5');
  assert.equal(form.getCheckBox('Check Box4').isChecked(), true);
  assert.equal(form.getCheckBox('Check Box11').isChecked(), true);
  assert.equal(form.getCheckBox('Check Box12').isChecked(), true);
  assert.equal(form.getCheckBox('Check Box13').isChecked(), false);
});

test('fills NO SCORE and Pre-K assessments and decisions', async () => {
  const [noScore, preK] = makeStudents([
    '10/13 1000 T,NoScore,Student,01/02/2018,1,DHS,CALS,1002,NO SCORE,,',
    '10/22 1000 Th,PreK,Student,04/24/2022,PK,YFO,IELD,1003,PreIPT,,1.0',
  ]);

  const noScorePdf = await PDFDocument.load(templateBytes);
  const noScoreFont = await noScorePdf.embedFont(StandardFonts.Helvetica);
  const noScoreForm = noScorePdf.getForm();
  fillStudentForm(noScoreForm, noScore, noScoreFont);
  assert.equal(noScoreForm.getTextField('Text14').getText(), 'Observation');
  assert.equal(noScoreForm.getTextField('Score').getText(), 'N/A');
  assert.equal(noScoreForm.getTextField('Text15').getText(), 'Language Use Survey');
  assert.equal(noScoreForm.getCheckBox('Check Box5').isChecked(), true);
  assert.equal(noScoreForm.getCheckBox('Check Box13').isChecked(), true);

  const preKPdf = await PDFDocument.load(templateBytes);
  const preKFont = await preKPdf.embedFont(StandardFonts.Helvetica);
  const preKForm = preKPdf.getForm();
  fillStudentForm(preKForm, preK, preKFont);
  assert.equal(preKForm.getTextField('Text14').getText(), 'PreIPT');
  assert.equal(preKForm.getTextField('Score').getText(), 'Overall: 1.0');
  assert.equal(preKForm.getCheckBox('Check Box4').isChecked(), true);
  assert.equal(preKForm.getCheckBox('Check Box6').isChecked(), true);
});

test('creates a flattened, correctly merged two-pages-per-student PDF', async () => {
  const students = makeStudents([
    '10/13 1000 T,Doe,Alex,01/02/2018,2,TAL,IELD,1001,WIDA SCREENER,2.0,3.5',
    '10/22 1000 Th,PreK,Student,04/24/2022,PK,YFO,IELD,1002,PreIPT,,1.0',
  ]);
  const bytes = await createCombinedPdf(templateBytes, students);
  const output = await PDFDocument.load(bytes);
  assert.equal(output.getPageCount(), 4);
  assert.equal(output.getForm().getFields().length, 0);
});
